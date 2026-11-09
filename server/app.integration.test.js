// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { migrateLegacyAttachments } from "./attachment-migration.js";
import { resolveAttachmentPath } from "./attachment-storage.js";
import { hashPassword } from "./auth.js";
import { loadConfig } from "./config.js";
import { createDatabase, initializeDatabase } from "./db.js";

const tempDir = path.resolve(".tmp", `api-${process.pid}-${Date.now()}`);
const databasePath = path.join(tempDir, "test.db");
const attachmentsDir = path.join(tempDir, "attachments");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let prisma;
let app;
let adminAgent;
let viewerAgent;
let operatorAgent;
let admin;
let viewer;
let operator;
let type;
let origin;
let destination;
let firstDocument;

async function createUser(data) {
  const password = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      active: true,
      passwordHash: password.hash,
      passwordSalt: password.salt,
    },
  });
}

beforeAll(async () => {
  fs.mkdirSync(tempDir, { recursive: true });
  const migrationsDirectory = path.resolve("prisma/migrations");
  const migrations = fs
    .readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const rawDatabase = new Database(databasePath);
  migrations.forEach((directory) =>
    rawDatabase.exec(
      fs.readFileSync(
        path.join(migrationsDirectory, directory, "migration.sql"),
        "utf8",
      ),
    ),
  );
  rawDatabase.close();

  prisma = createDatabase(databaseUrl);
  await initializeDatabase(prisma);
  admin = await createUser({
    name: "Admin Teste",
    email: "admin@test.invalid",
    password: "SenhaAdminTeste2026",
    role: "admin",
  });
  viewer = await createUser({
    name: "Consulta Teste",
    email: "consulta@test.invalid",
    password: "SenhaViewerTeste2026",
    role: "VIEWER",
  });
  operator = await createUser({
    name: "Operador Teste",
    email: "operador@test.invalid",
    password: "SenhaOperator2026",
    role: "OPERATOR",
  });
  type = await prisma.documentType.create({
    data: { name: "Memorando", prefix: "MEMO", digits: 3 },
  });
  origin = await prisma.department.create({
    data: { name: "Arquivo", code: "DEP-ARQUIVO" },
  });
  destination = await prisma.department.create({
    data: { name: "Tecnologia", code: "DEP-TI" },
  });
  app = createApp({
    prisma,
    config: loadConfig({
      databaseUrl,
      attachmentsDir,
      nodeEnv: "test",
      port: 3000,
    }),
  });
  adminAgent = request.agent(app);
  viewerAgent = request.agent(app);
  operatorAgent = request.agent(app);
  await adminAgent
    .post("/api/auth/login")
    .send({ email: admin.email, password: "SenhaAdminTeste2026" })
    .expect(200);
  await viewerAgent
    .post("/api/auth/login")
    .send({ email: viewer.email, password: "SenhaViewerTeste2026" })
    .expect(200);
  await operatorAgent
    .post("/api/auth/login")
    .send({ email: operator.email, password: "SenhaOperator2026" })
    .expect(200);
});

afterAll(async () => {
  await prisma.$disconnect();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("API integrada com SQLite", () => {
  it("expõe saúde sem autenticação e protege os demais recursos", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.data).toMatchObject({
      status: "ok",
      database: "sqlite",
    });
    await request(app).get("/api/documents").expect(401);
  });

  it("expõe a documentação LGPD atual sem autenticação", async () => {
    const response = await request(app).get('/api/public/lgpd').expect(200);
    expect(response.body.data.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '.lgpd/STATUS.md' }),
      expect.objectContaining({ path: '.lgpd/policies/privacy-policy-v1-draft.md' }),
    ]));
  });

  it("registra solicitações de titular e impede tratamento por usuário comum", async () => {
    const created = await viewerAgent.post('/api/privacy-requests').send({
      type: 'ACCESS',
      description: 'Solicito acesso aos meus dados cadastrais.',
    }).expect(201);
    expect(created.body.data).toMatchObject({ type: 'ACCESS', status: 'OPEN', subjectUserId: viewer.id });

    const own = await viewerAgent.get('/api/privacy-requests').expect(200);
    expect(own.body.data).toHaveLength(1);
    expect(own.body.data[0].subjectUserId).toBe(viewer.id);

    const adminList = await adminAgent.get('/api/privacy-requests').expect(200);
    expect(adminList.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.body.data.id, subjectUserId: viewer.id }),
    ]));
    await adminAgent.patch(`/api/privacy-requests/${created.body.data.id}`).send({
      status: 'COMPLETED', responseNote: 'Solicitação processada.',
    }).expect(200);
    await viewerAgent.patch(`/api/privacy-requests/${created.body.data.id}`).send({ status: 'REJECTED' }).expect(403);
  });

  it("recebe solicitação pelo canal público e mantém trilha administrativa", async () => {
    await request(app).get('/api/privacy-requests').expect(401);
    const created = await request(app).post('/api/public/privacy-requests').send({
      requesterName: 'Titular Público',
      requesterEmail: 'titular.publico@example.invalid',
      type: 'CORRECTION',
      description: 'Solicito a correção de um dado cadastral.',
    }).expect(201);

    expect(created.body.data).toMatchObject({
      reference: expect.stringMatching(/^DSAR-[A-Z0-9]{8}$/),
      type: 'CORRECTION',
      status: 'OPEN',
    });

    const publicRecord = await prisma.publicPrivacyRequest.findUnique({
      where: { publicReference: created.body.data.reference },
    });
    expect(publicRecord).toBeTruthy();

    const adminList = await adminAgent.get('/api/privacy-requests').expect(200);
    expect(adminList.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: publicRecord.id,
        source: 'PUBLIC',
        publicReference: created.body.data.reference,
        requesterName: 'Titular Público',
        requesterEmail: 'titular.publico@example.invalid',
        events: expect.arrayContaining([expect.objectContaining({ action: 'CREATED', source: 'PUBLIC' })]),
      }),
    ]));

    await adminAgent.patch(`/api/privacy-requests/${publicRecord.id}`).send({
      status: 'COMPLETED',
      responseNote: 'Solicitação analisada pelo administrador.',
    }).expect(200);

    const afterUpdate = await adminAgent.get('/api/privacy-requests').expect(200);
    const handled = afterUpdate.body.data.find((item) => item.id === publicRecord.id);
    expect(handled).toMatchObject({ status: 'COMPLETED', responseNote: 'Solicitação analisada pelo administrador.' });
    expect(handled.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'CREATED' }),
      expect.objectContaining({ action: 'STATUS_COMPLETED', actor: expect.objectContaining({ id: admin.id }) }),
    ]));
  });

  it("gera entrega de portabilidade estruturada, de uso único, com trilha", async () => {
    const created = await viewerAgent.post('/api/privacy-requests').send({
      type: 'PORTABILITY',
      description: 'Solicito meus dados em formato estruturado.',
    }).expect(201);

    await operatorAgent.post(`/api/privacy-requests/${created.body.data.id}/delivery`).send({ channel: 'LINK' }).expect(403);
    const delivery = await adminAgent.post(`/api/privacy-requests/${created.body.data.id}/delivery`).send({ channel: 'EMAIL' }).expect(201);
    expect(delivery.body.data).toMatchObject({ channel: 'EMAIL', emailConfigured: false, recipientEmail: viewer.email });

    const download = await request(app).get(delivery.body.data.downloadPath).expect(200);
    expect(download.headers['content-disposition']).toContain('memorydoc-portabilidade-');
    expect(download.body).toMatchObject({ schemaVersion: 'memorydoc-portable-v1', subject: { id: viewer.id, email: viewer.email } });
    await request(app).get(delivery.body.data.downloadPath).expect(410);

    const handled = await adminAgent.get('/api/privacy-requests').expect(200);
    const requestWithTrail = handled.body.data.find((item) => item.id === created.body.data.id);
    expect(requestWithTrail.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'DELIVERY_EMAIL_PREPARED' }),
      expect.objectContaining({ action: 'DELIVERY_DOWNLOADED' }),
    ]));

    const sent = await adminAgent.post(`/api/privacy-requests/${created.body.data.id}/messages`).send({ body: 'O pacote está disponível pelo link seguro enviado nesta conversa.' }).expect(201);
    expect(sent.body.data).toMatchObject({ body: expect.stringContaining('pacote'), recipientScope: 'SUBJECT' });
    const viewerMessages = await viewerAgent.get(`/api/privacy-requests/${created.body.data.id}/messages`).expect(200);
    expect(viewerMessages.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ body: sent.body.data.body, isMine: false })]));
    await operatorAgent.get(`/api/privacy-requests/${created.body.data.id}/messages`).expect(403);
  });

  it("não permite que um usuário crie solicitação para outro titular", async () => {
    const response = await viewerAgent.post('/api/privacy-requests').send({ type: 'DELETION', subjectUserId: admin.id }).expect(201);
    expect(response.body.data.subjectUserId).toBe(viewer.id);
  });

  it("protege e mantém configurável a governança de retenção", async () => {
    const defaults = await adminAgent.get('/api/privacy-governance').expect(200);
    expect(defaults.body.data).toMatchObject({
      settings: { DSAR_RESPONSE_DAYS: 15, PORTABILITY_LINK_HOURS: 48 },
      automaticErasure: { enabled: false },
    });
    await viewerAgent.get('/api/privacy-governance').expect(403);

    const created = await adminAgent.post('/api/privacy-governance/retention-rules').send({
      entityKey: 'Document', label: 'Protocolos administrativos', purpose: 'Preservar o protocolo enquanto houver finalidade administrativa.',
      retentionMonths: 60, legalBasis: 'Obrigação legal a confirmar', postAction: 'BLOCK_AND_RETAIN', triggeredBy: 'Fim da finalidade', notes: 'Revisar com o controlador.',
    }).expect(201);
    expect(created.body.data).toMatchObject({ entityKey: 'Document', retentionMonths: 60, active: true });

    const updated = await adminAgent.patch(`/api/privacy-governance/retention-rules/${created.body.data.id}`).send({ active: false }).expect(200);
    expect(updated.body.data.active).toBe(false);
    const settings = await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 20, PORTABILITY_LINK_HOURS: 24 }).expect(200);
    expect(settings.body.data.settings).toMatchObject({ DSAR_RESPONSE_DAYS: 20, PORTABILITY_LINK_HOURS: 24 });
    const limit = await adminAgent.put('/api/privacy-governance/request-limits/PORTABILITY').send({ maxRetentionDays: 180, notes: 'Revisar com o controlador.' }).expect(200);
    expect(limit.body.data).toMatchObject({ requestType: 'PORTABILITY', maxRetentionDays: 180, active: true });
    const listed = await adminAgent.get('/api/privacy-governance').expect(200);
    expect(listed.body.data.requestLimits).toEqual(expect.arrayContaining([expect.objectContaining({ requestType: 'PORTABILITY', maxRetentionDays: 180 })]));
    await viewerAgent.put('/api/privacy-governance/request-limits/PORTABILITY').send({ maxRetentionDays: 180 }).expect(403);
  });

  it("rejeita payloads inválidos, acessos indevidos e alterações ambíguas", async () => {
    await request(app).get('/api/privacy-governance').expect(401);
    await operatorAgent.get('/api/privacy-governance').expect(403);
    await viewerAgent.post('/api/privacy-governance/retention-rules').send({}).expect(403);

    const baseRule = {
      entityKey: 'Session', label: 'Regra de teste', purpose: 'Finalidade de teste suficientemente descrita.',
      retentionMonths: 12, legalBasis: 'Base de teste a confirmar', postAction: 'BLOCK_AND_RETAIN', triggeredBy: 'Fim do teste', notes: '',
    };
    await adminAgent.post('/api/privacy-governance/retention-rules').send({ ...baseRule, retentionMonths: 0 }).expect(400);
    await adminAgent.post('/api/privacy-governance/retention-rules').send({ ...baseRule, retentionMonths: 1201 }).expect(400);
    await adminAgent.post('/api/privacy-governance/retention-rules').send({ ...baseRule, postAction: 'DELETE_EVERYTHING' }).expect(400);
    await adminAgent.post('/api/privacy-governance/retention-rules').send({ ...baseRule, entityKey: 'UnknownEntity' }).expect(400);
    await adminAgent.post('/api/privacy-governance/retention-rules').send({ ...baseRule, unexpected: 'must be rejected' }).expect(400);
    await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 0, PORTABILITY_LINK_HOURS: 48 }).expect(400);
    await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 366, PORTABILITY_LINK_HOURS: 48 }).expect(400);
    await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 15, PORTABILITY_LINK_HOURS: 721, extra: 1 }).expect(400);
    await adminAgent.put('/api/privacy-governance/request-limits/NOT_A_REQUEST').send({ maxRetentionDays: 30 }).expect(400);
    await adminAgent.put('/api/privacy-governance/request-limits/ACCESS').send({ maxRetentionDays: 0 }).expect(400);
    await adminAgent.put('/api/privacy-governance/request-limits/ACCESS').send({ maxRetentionDays: 3651 }).expect(400);
  });

  it("aceita uma regra por objeto e mantém a ação configurada sem executar exclusão", async () => {
    const objects = [
      ['User', 'Contas de usuários'], ['Session', 'Sessões'], ['Document', 'Protocolos'], ['Attachment', 'Anexos'],
      ['DocumentHistory', 'Histórico'], ['DataSubjectRequest', 'Solicitações'], ['PrivacyRequestMessage', 'Mensagens'],
      ['PrivacyRequestDelivery', 'Entregas'], ['Export', 'Exportações'],
    ];
    const created = await Promise.all(objects.map(([entityKey, label]) => adminAgent.post('/api/privacy-governance/retention-rules').send({
      entityKey, label: `Teste ${label}`, purpose: `Finalidade operacional para testar ${label}.`, retentionMonths: 12,
      legalBasis: 'Teste; decisão institucional pendente.', postAction: 'HARD_DELETE', triggeredBy: 'Fim da finalidade', notes: 'Teste automatizado.',
    }).expect(201)));
    expect(created).toHaveLength(objects.length);
    const governance = await adminAgent.get('/api/privacy-governance').expect(200);
    for (const [entityKey] of objects) expect(governance.body.data.rules).toEqual(expect.arrayContaining([expect.objectContaining({ entityKey, postAction: 'HARD_DELETE', active: true })]));
    for (const response of created) {
      await adminAgent.patch(`/api/privacy-governance/retention-rules/${response.body.data.id}`).send({ active: false }).expect(200);
      const stillStored = await prisma.retentionRule.findUnique({ where: { id: response.body.data.id } });
      expect(stillStored).toBeTruthy();
      expect(stillStored.active).toBe(false);
    }
  });

  it("aplica os parâmetros configurados aos novos prazos de DSAR e portabilidade", async () => {
    await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 2, PORTABILITY_LINK_HOURS: 3 }).expect(200);
    const requestStart = Date.now();
    const dsar = await viewerAgent.post('/api/privacy-requests').send({ type: 'ACCESS', description: 'Teste de prazo configurável.' }).expect(201);
    const dueDelta = new Date(dsar.body.data.dueAt).getTime() - requestStart;
    expect(dueDelta).toBeGreaterThan(2 * 24 * 60 * 60 * 1000 - 5000);
    expect(dueDelta).toBeLessThan(2 * 24 * 60 * 60 * 1000 + 5000);

    const portability = await viewerAgent.post('/api/privacy-requests').send({ type: 'PORTABILITY', description: 'Teste de expiração configurável.' }).expect(201);
    const deliveryStart = Date.now();
    const delivery = await adminAgent.post(`/api/privacy-requests/${portability.body.data.id}/delivery`).send({ channel: 'LINK' }).expect(201);
    const expiryDelta = new Date(delivery.body.data.expiresAt).getTime() - deliveryStart;
    expect(expiryDelta).toBeGreaterThan(3 * 60 * 60 * 1000 - 5000);
    expect(expiryDelta).toBeLessThan(3 * 60 * 60 * 1000 + 5000);
    await adminAgent.put('/api/privacy-governance/settings').send({ DSAR_RESPONSE_DAYS: 15, PORTABILITY_LINK_HOURS: 48 }).expect(200);
  });

  it("executa diagnóstico somente leitura e protege o relatório por RBAC", async () => {
    await request(app).post('/api/privacy-governance/diagnostics/run').expect(401);
    await viewerAgent.post('/api/privacy-governance/diagnostics/run').expect(403);
    const response = await adminAgent.post('/api/privacy-governance/diagnostics/run').expect(200);
    expect(response.body.data).toMatchObject({
      passed: expect.any(Number), warnings: expect.any(Number), failed: 0,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'database', status: 'PASS' }),
        expect.objectContaining({ id: 'settings' }),
        expect.objectContaining({ id: 'automatic-erasure', status: 'PASS' }),
      ]),
    });
    expect(response.body.data.checks.every((check) => typeof check.durationMs === 'number')).toBe(true);
  });

  it("gera sequência transacional, prévia não reservada e não reutiliza cancelamento", async () => {
    const preview = await adminAgent
      .get(`/api/protocols/next?typeId=${type.id}&date=2026-07-22`)
      .expect(200);
    expect(preview.body.data).toMatchObject({
      protocol: "MEMO-001/2026",
      sequence: 1,
      reserved: false,
    });
    const payload = {
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      destinationText: null,
      subject: "Documento criado no teste de integração",
      responsibleUserId: admin.id,
      status: "RECEBIDO",
    };
    const first = await adminAgent
      .post("/api/documents")
      .send(payload)
      .expect(201);
    firstDocument = first.body.data;
    expect(firstDocument.protocol).toBe("MEMO-001/2026");
    const second = await adminAgent
      .post("/api/documents")
      .send({ ...payload, subject: "Segundo documento do teste" })
      .expect(201);
    expect(second.body.data.protocol).toBe("MEMO-002/2026");
    await adminAgent
      .post(`/api/documents/${firstDocument.id}/cancel`)
      .expect(200);
    const third = await adminAgent
      .post("/api/documents")
      .send({ ...payload, subject: "Terceiro documento após cancelamento" })
      .expect(201);
    expect(third.body.data.protocol).toBe("MEMO-003/2026");
  });

  it("aplica RBAC e preserva o último administrador", async () => {
    await viewerAgent.post("/api/documents").send({}).expect(403);
    const lastAdmin = await adminAgent
      .patch(`/api/users/${admin.id}`)
      .send({ active: false })
      .expect(409);
    expect(lastAdmin.body.error.code).toBe("LAST_ADMIN");
  });

  it("usa o formato fixo de protocolo e rejeita configuração de separador", async () => {
    const invalid = await adminAgent
      .post("/api/document-types")
      .send({
        name: "Laudo de validação",
        prefix: "LDV",
        digits: 4,
        separator: "-",
      })
      .expect(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");

    const created = await adminAgent
      .post("/api/document-types")
      .send({ name: "Laudo de validação", prefix: "LDV", digits: 4 })
      .expect(201);
    expect(created.body.data).not.toHaveProperty("separator");
    const preview = await adminAgent
      .get(
        `/api/protocols/next?typeId=${created.body.data.id}&date=2027-01-10`,
      )
      .expect(200);
    expect(preview.body.data.protocol).toBe("LDV-0001/2027");
  });

  it("edita, contabiliza e exclui somente departamentos sem vínculos", async () => {
    const listed = await adminAgent.get("/api/departments").expect(200);
    expect(
      listed.body.data.find((department) => department.id === origin.id)._count,
    ).toMatchObject({
      originDocuments: expect.any(Number),
      destinationDocuments: expect.any(Number),
    });

    const editable = await adminAgent
      .post("/api/departments")
      .send({ name: "  Unidade Editável  ", code: "dep-editavel" })
      .expect(201);
    const edited = await adminAgent
      .patch(`/api/departments/${editable.body.data.id}`)
      .send({ name: "  Unidade Atualizada  ", code: "dep-atualizada" })
      .expect(200);
    expect(edited.body.data).toMatchObject({
      name: "Unidade Atualizada",
      code: "DEP-ATUALIZADA",
      active: true,
    });

    const duplicate = await adminAgent
      .post("/api/departments")
      .send({ name: "Outra Unidade", code: "DEP-OUTRA" })
      .expect(201);
    await adminAgent
      .patch(`/api/departments/${duplicate.body.data.id}`)
      .send({ code: "dep-atualizada" })
      .expect(409);
    await viewerAgent
      .patch(`/api/departments/${editable.body.data.id}`)
      .send({ name: "Alteração não autorizada" })
      .expect(403);
    await operatorAgent
      .delete(`/api/departments/${editable.body.data.id}`)
      .expect(403);
    await adminAgent
      .patch("/api/departments/departamento-inexistente")
      .send({ name: "Inexistente" })
      .expect(404);

    await adminAgent
      .delete(`/api/departments/${editable.body.data.id}`)
      .expect(204);
    await adminAgent
      .delete(`/api/departments/${editable.body.data.id}`)
      .expect(404);

    await adminAgent
      .patch(`/api/departments/${duplicate.body.data.id}`)
      .send({ active: false })
      .expect(200);
    await adminAgent
      .delete(`/api/departments/${duplicate.body.data.id}`)
      .expect(204);

    const originConflict = await adminAgent
      .delete(`/api/departments/${origin.id}`)
      .expect(409);
    expect(originConflict.body.error).toMatchObject({
      code: "DEPARTMENT_IN_USE",
    });
    const destinationConflict = await adminAgent
      .delete(`/api/departments/${destination.id}`)
      .expect(409);
    expect(destinationConflict.body.error).toMatchObject({
      code: "DEPARTMENT_IN_USE",
    });
  });

  it("mantém o contrato HTTP de listagem, criação, edição e redefinição de usuários", async () => {
    const created = await adminAgent
      .post("/api/users")
      .send({
        name: "Usuário da API",
        email: "USUARIO.API@EXAMPLE.INVALID",
        password: "SenhaUsuarioApi2026!",
        role: "VIEWER",
      })
      .expect(201);
    expect(created.body.data).toMatchObject({
      name: "Usuário da API",
      email: "usuario.api@example.invalid",
      role: "VIEWER",
      active: true,
    });
    expect(created.body.data).not.toHaveProperty("passwordHash");

    const updated = await adminAgent
      .patch(`/api/users/${created.body.data.id}`)
      .send({ name: "Usuário Atualizado", role: "OPERATOR" })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      name: "Usuário Atualizado",
      role: "OPERATOR",
    });
    await adminAgent
      .post(`/api/users/${created.body.data.id}/password`)
      .send({ password: "NovaSenhaApi2026!" })
      .expect(204);

    const listed = await adminAgent.get("/api/users").expect(200);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.body.data.id, role: "OPERATOR" }),
      ]),
    );
    expect(listed.body.data[0]).not.toHaveProperty("passwordSalt");
  });

  it("serializa criações concorrentes sem duplicar protocolo", async () => {
    const payload = {
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      subject: "Criação concorrente",
      responsibleUserId: admin.id,
      status: "ENVIADO",
    };
    const responses = await Promise.all([
      adminAgent
        .post("/api/documents")
        .send({ ...payload, subject: "Criação concorrente A" }),
      adminAgent
        .post("/api/documents")
        .send({ ...payload, subject: "Criação concorrente B" }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(
      responses.map((response) => response.body.data.protocol).sort(),
    ).toEqual(["MEMO-004/2026", "MEMO-005/2026"]);
  });

  it("força o operador como responsável e limita alterações aos documentos próprios", async () => {
    const payload = {
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      subject: "Documento próprio do operador",
      status: "ENVIADO",
    };
    const created = await operatorAgent
      .post("/api/documents")
      .send(payload)
      .expect(201);
    expect(created.body.data.responsibleUserId).toBe(operator.id);
    await operatorAgent
      .patch(`/api/documents/${created.body.data.id}/status`)
      .send({ status: "ARQUIVADO" })
      .expect(200);
    const adminDocument = await prisma.document.findFirst({
      where: { createdById: admin.id, status: { not: "CANCELADO" } },
    });
    await operatorAgent
      .patch(`/api/documents/${adminDocument.id}/status`)
      .send({ status: "RECEBIDO" })
      .expect(403);
  });

  it("cria, lista, atualiza e remove links documentais externos", async () => {
    const created = (await adminAgent.post("/api/documents").send({
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      subject: "Documento com link externo",
      responsibleUserId: admin.id,
      status: "ENVIADO",
    }).expect(201)).body.data;
    const link = (await adminAgent.post(`/api/documents/${created.id}/links`).send({
      url: "https://drive.google.com/drive/folders/exemplo",
    }).expect(201)).body.data;
    expect(link.provider).toBe("Google Drive");
    await adminAgent.post(`/api/documents/${created.id}/links`).send({
      url: "https://drive.google.com/drive/folders/exemplo?access_token=secret",
    }).expect(400);
    const linkHistory = await prisma.documentHistory.findMany({ where: { documentId: created.id }, orderBy: { createdAt: "desc" } });
    expect(linkHistory[0].detailsJson).not.toContain(link.url);
    expect(linkHistory[0].detailsJson).toContain("urlFingerprint");
    const detail = (await adminAgent.get(`/api/documents/${created.id}`).expect(200)).body.data;
    expect(detail.links).toHaveLength(1);
    expect(detail.links[0].url).toBe(link.url);
    const updated = (await adminAgent.patch(`/api/links/${link.id}`).send({ url: "https://drive.google.com/drive/folders/atualizada" }).expect(200)).body.data;
    expect(updated.url).toBe("https://drive.google.com/drive/folders/atualizada");
    await viewerAgent.delete(`/api/links/${link.id}`).expect(403);
    await adminAgent.delete(`/api/links/${link.id}`).expect(204);
    expect((await adminAgent.get(`/api/documents/${created.id}`).expect(200)).body.data.links).toHaveLength(0);
  });

  it("recusa upload e download físico sem alterar dados legados", async () => {
    const created = (await adminAgent.post("/api/documents").send({
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      subject: "Protocolo sem upload físico",
      responsibleUserId: admin.id,
      status: "ENVIADO",
    }).expect(201)).body.data;

    await adminAgent
      .post(`/api/documents/${created.id}/attachments`)
      .send({ filename: "arquivo.pdf" })
      .expect(410)
      .expect((response) => expect(response.body.error.code).toBe("PHYSICAL_ATTACHMENTS_DISABLED"));
    await adminAgent
      .get("/api/attachments/nao-existente")
      .expect(410)
      .expect((response) => expect(response.body.error.code).toBe("PHYSICAL_ATTACHMENTS_DISABLED"));
    await adminAgent
      .delete("/api/attachments/nao-existente")
      .expect(410);

    expect((await adminAgent.get(`/api/documents/${created.id}`).expect(200)).body.data.links).toHaveLength(0);
  });

  it.skip("remove anexos fisicamente com permissão e histórico auditável", async () => {
    const payload = {
      typeId: type.id,
      date: "2026-07-22",
      originDepartmentId: origin.id,
      destinationDepartmentId: destination.id,
      subject: "Documento para remoção de anexo",
      responsibleUserId: admin.id,
      status: "ENVIADO",
    };
    const adminDocument = (
      await adminAgent.post("/api/documents").send(payload).expect(201)
    ).body.data;
    const uploaded = (
      await adminAgent
        .post(`/api/documents/${adminDocument.id}/attachments`)
        .attach("file", Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"), {
          filename: "removivel.pdf",
          contentType: "application/pdf",
        })
        .expect(201)
    ).body.data;
    const persisted = await prisma.attachment.findUnique({
      where: { id: uploaded.id },
    });
    const storedPath = resolveAttachmentPath(
      attachmentsDir,
      persisted.storageKey,
    );
    expect(persisted.content).toBeNull();
    expect(path.basename(storedPath)).toBe("removivel.pdf");
    expect(fs.existsSync(storedPath)).toBe(true);

    await viewerAgent.delete(`/api/attachments/${uploaded.id}`).expect(403);
    await operatorAgent.delete(`/api/attachments/${uploaded.id}`).expect(403);
    await adminAgent.delete(`/api/attachments/${uploaded.id}`).expect(204);
    await adminAgent.get(`/api/attachments/${uploaded.id}`).expect(404);
    await adminAgent.delete(`/api/attachments/${uploaded.id}`).expect(404);
    expect(
      await prisma.attachment.findUnique({ where: { id: uploaded.id } }),
    ).toBeNull();
    expect(fs.existsSync(storedPath)).toBe(false);

    const removal = await prisma.documentHistory.findFirst({
      where: { documentId: adminDocument.id, action: "ATTACHMENT_REMOVE" },
    });
    expect(removal).toMatchObject({
      description: "Anexo removido: removivel.pdf",
      userId: admin.id,
    });
    expect(JSON.parse(removal.detailsJson)).toMatchObject({
      attachmentId: uploaded.id,
      originalName: "removivel.pdf",
      mimeType: "application/pdf",
      size: expect.any(Number),
      uploadedById: admin.id,
      uploadedAt: expect.any(String),
    });

    const operatorDocument = (
      await operatorAgent
        .post("/api/documents")
        .send({
          ...payload,
          subject: "Documento próprio do operador para anexo",
        })
        .expect(201)
    ).body.data;
    const operatorAttachment = (
      await operatorAgent
        .post(`/api/documents/${operatorDocument.id}/attachments`)
        .attach("file", Buffer.from("%PDF-1.4\n%%EOF"), {
          filename: "operador.pdf",
          contentType: "application/pdf",
        })
        .expect(201)
    ).body.data;
    await operatorAgent
      .delete(`/api/attachments/${operatorAttachment.id}`)
      .expect(204);

    const cancelledDocument = (
      await adminAgent
        .post("/api/documents")
        .send({ ...payload, subject: "Documento cancelado com anexo" })
        .expect(201)
    ).body.data;
    const cancelledAttachment = (
      await adminAgent
        .post(`/api/documents/${cancelledDocument.id}/attachments`)
        .attach("file", Buffer.from("%PDF-1.4\n%%EOF"), {
          filename: "preservado.pdf",
          contentType: "application/pdf",
        })
        .expect(201)
    ).body.data;
    await adminAgent
      .post(`/api/documents/${cancelledDocument.id}/cancel`)
      .expect(200);
    const terminal = await adminAgent
      .delete(`/api/attachments/${cancelledAttachment.id}`)
      .expect(409);
    expect(terminal.body.error.code).toBe("CANCELLED_TERMINAL");
    expect(
      await prisma.attachment.findUnique({
        where: { id: cancelledAttachment.id },
      }),
    ).not.toBeNull();
  });

  it.skip("registra histórico, armazena arquivo validado e exporta relatório", async () => {
    const updated = await adminAgent
      .patch(`/api/documents/${firstDocument.id}/status`)
      .send({ status: "ARQUIVADO" })
      .expect(409);
    expect(updated.body.error.code).toBe("CANCELLED_TERMINAL");

    const activeDocument = await prisma.document.findFirst({
      where: { status: { not: "CANCELADO" } },
      orderBy: { sequence: "asc" },
    });
    await adminAgent
      .patch(`/api/documents/${activeDocument.id}/status`)
      .send({ status: "ARQUIVADO" })
      .expect(200);
    const upload = await adminAgent
      .post(`/api/documents/${activeDocument.id}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"), {
        filename: "evidencia.pdf",
        contentType: "application/pdf",
      })
      .expect(201);
    const download = await adminAgent
      .get(`/api/attachments/${upload.body.data.id}`)
      .expect(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.headers["content-disposition"]).toContain("evidencia.pdf");
    const fileAttachment = await prisma.attachment.findUnique({
      where: { id: upload.body.data.id },
    });
    expect(fileAttachment).toMatchObject({
      content: null,
      storageKey: expect.stringContaining(`/${activeDocument.id}/`),
    });
    const history = await adminAgent
      .get(`/api/documents/${activeDocument.id}/history`)
      .expect(200);
    expect(history.body.data.map((item) => item.action)).toEqual(
      expect.arrayContaining(["CREATE", "STATUS_CHANGE", "ATTACHMENT_ADD"]),
    );
    const report = await adminAgent
      .get("/api/reports/documents?format=csv")
      .expect(200);
    expect(report.text).toContain("MEMO-002/2026");
    const pdfReport = await adminAgent
      .get("/api/reports/documents?format=pdf")
      .expect(200);
    expect(pdfReport.headers["content-type"]).toContain("application/pdf");
    expect(pdfReport.headers["content-disposition"]).toContain(".pdf");
    expect(pdfReport.body.subarray(0, 5).toString()).toBe("%PDF-");
    const excelReport = await adminAgent
      .get("/api/reports/documents?format=xlsx")
      .expect(200);
    expect(excelReport.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect(excelReport.headers["content-disposition"]).toContain(".xlsx");
    expect(excelReport.body.subarray(0, 2).toString()).toBe("PK");
    await viewerAgent.get("/api/reports/documents?format=csv").expect(403);
    await adminAgent.get("/api/documents?status=INVALIDO").expect(400);
    await adminAgent
      .post(`/api/documents/${activeDocument.id}/attachments`)
      .attach("file", Buffer.from("arquivo inválido"), {
        filename: "programa.exe",
        contentType: "application/octet-stream",
      })
      .expect(415);
  });

  it.skip("mantém download legado e migra BLOBs existentes para arquivos", async () => {
    const activeDocument = await prisma.document.findFirst({
      where: { status: { not: "CANCELADO" } },
    });
    const legacyContent = Buffer.from("%PDF-1.4\nlegado\n%%EOF");
    const legacy = await prisma.attachment.create({
      data: {
        documentId: activeDocument.id,
        originalName: "arquivo legado.pdf",
        mimeType: "application/pdf",
        size: legacyContent.length,
        content: legacyContent,
        uploadedById: admin.id,
      },
    });

    const before = await adminAgent
      .get(`/api/attachments/${legacy.id}`)
      .expect(200);
    expect(before.body).toEqual(legacyContent);

    const result = await migrateLegacyAttachments({ prisma, attachmentsDir });
    expect(result).toEqual({ migrated: 1 });
    const migrated = await prisma.attachment.findUnique({
      where: { id: legacy.id },
    });
    expect(migrated.content).toBeNull();
    expect(migrated.storageKey).toContain(`/${activeDocument.id}/`);
    expect(
      fs.existsSync(resolveAttachmentPath(attachmentsDir, migrated.storageKey)),
    ).toBe(true);

    const after = await adminAgent
      .get(`/api/attachments/${legacy.id}`)
      .expect(200);
    expect(after.body).toEqual(legacyContent);
  });
});
