// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import Database from 'better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { verifyPassword } from '../server/auth.js';
import { createDatabase, initializeDatabase } from '../server/db.js';
import { createUser } from '../server/users.js';
import { runUserCli } from './users.js';

const tempDir = path.resolve('.tmp', `users-cli-${process.pid}-${Date.now()}`);
const databasePath = path.join(tempDir, 'test.db');
const databaseUrl = `file:${databasePath.replaceAll('\\', '/')}`;
let prisma;

function captureOutput() {
  let content = '';
  return {
    isTTY: false,
    write(chunk) {
      content += String(chunk);
      return true;
    },
    text() {
      return content;
    },
  };
}

function interactiveInput(passwords) {
  const input = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = (enabled) => {
    input.isRaw = enabled;
    if (enabled) {
      const password = passwords.shift();
      setImmediate(() => input.write(`${password}\r`));
    }
    return input;
  };
  return input;
}

async function execute(argv, stdin = '') {
  const output = captureOutput();
  const errorOutput = captureOutput();
  const code = await runUserCli({
    argv,
    prisma,
    input: Readable.from(stdin ? [stdin] : []),
    output,
    errorOutput,
  });
  return { code, output: output.text(), error: errorOutput.text() };
}

beforeAll(async () => {
  fs.mkdirSync(tempDir, { recursive: true });
  const migration = fs.readFileSync(path.resolve('prisma/migrations/20260722130000_init/migration.sql'), 'utf8');
  const adminRoleMigration = fs.readFileSync(path.resolve('prisma/migrations/20261107000000_normalize_admin_role/migration.sql'), 'utf8');
  const rawDatabase = new Database(databasePath);
  rawDatabase.exec(migration);
  rawDatabase.exec(adminRoleMigration);
  rawDatabase.close();
  prisma = createDatabase(databaseUrl);
  await initializeDatabase(prisma);
});

beforeEach(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('CLI de gerenciamento de usuários', () => {
  it('exibe ajuda sem abrir o banco e retorna sucesso', async () => {
    const output = captureOutput();
    const errorOutput = captureOutput();
    const code = await runUserCli({ argv: ['help'], output, errorOutput, input: Readable.from([]) });

    expect(code).toBe(0);
    expect(output.text()).toContain('npm run users -- create');
    expect(output.text()).toContain('admin, OPERATOR ou VIEWER');
    expect(errorOutput.text()).toBe('');
  });

  it('cria usuário com senha via stdin, normaliza e não expõe segredos', async () => {
    const password = 'SenhaSegura2026!';
    const result = await execute([
      'create', '--name', 'Maria Souza', '--email', '  MARIA@EXAMPLE.INVALID  ', '--role', 'operator', '--password-stdin',
    ], `${password}\n`);

    expect(result.code).toBe(0);
    expect(result.error).toBe('');
    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'maria@example.invalid' } });
    expect(stored).toMatchObject({ name: 'Maria Souza', role: 'OPERATOR', active: true });
    expect(await verifyPassword(password, stored.passwordHash, stored.passwordSalt)).toBe(true);
    expect(result.output).toContain('maria@example.invalid');
    expect(result.output).not.toContain(password);
    expect(result.output).not.toMatch(/passwordHash|passwordSalt|tokenHash/i);
  });

  it('pausa a entrada padrão após o prompt mascarado para permitir o encerramento', async () => {
    const input = interactiveInput(['SenhaInterativa2026!', 'SenhaInterativa2026!']);
    const output = captureOutput();
    output.isTTY = true;
    const errorOutput = captureOutput();

    const code = await runUserCli({
      argv: ['create', '--name', 'Usuário Interativo', '--email', 'interativo@example.invalid', '--role', 'VIEWER'],
      prisma,
      input,
      output,
      errorOutput,
    });

    expect(code).toBe(0);
    expect(errorOutput.text()).toBe('');
    expect(input.isPaused()).toBe(true);
  });

  it('lista ativos primeiro, ordena por nome e omite campos secretos', async () => {
    const zelda = await createUser(prisma, { name: 'Zelda Lima', email: 'zelda@example.invalid', password: 'SenhaSegura2026!', role: 'VIEWER' });
    await createUser(prisma, { name: 'Ana Lima', email: 'ana@example.invalid', password: 'SenhaSegura2026!', role: 'admin' });
    await createUser(prisma, { name: 'Aaron Lima', email: 'aaron@example.invalid', password: 'SenhaSegura2026!', role: 'OPERATOR' });
    await prisma.user.update({ where: { id: zelda.id }, data: { active: false } });

    const result = await execute(['list']);

    expect(result.code).toBe(0);
    expect(result.output).toMatch(/^ID\s+NOME\s+E-MAIL\s+PERFIL\s+ATIVO/m);
    expect(result.output.indexOf('Aaron Lima')).toBeLessThan(result.output.indexOf('Ana Lima'));
    expect(result.output.indexOf('Ana Lima')).toBeLessThan(result.output.indexOf('Zelda Lima'));
    expect(result.output).not.toMatch(/passwordHash|passwordSalt|tokenHash/i);
  });

  it('edita por e-mail e encerra sessões ao desativar', async () => {
    const user = await createUser(prisma, { name: 'Operador Antigo', email: 'antigo@example.invalid', password: 'SenhaSegura2026!', role: 'OPERATOR' });
    await prisma.session.create({ data: { tokenHash: 'a'.repeat(64), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const result = await execute([
      'edit', 'ANTIGO@EXAMPLE.INVALID', '--name', 'Operador Atual', '--email', 'ATUAL@EXAMPLE.INVALID', '--role', 'viewer', '--inactive',
    ]);

    expect(result.code).toBe(0);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ name: 'Operador Atual', email: 'atual@example.invalid', role: 'VIEWER', active: false });
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('edita por ID, redefine a senha e encerra sessões', async () => {
    const user = await createUser(prisma, { name: 'Pessoa Teste', email: 'pessoa@example.invalid', password: 'SenhaAntiga2026!', role: 'VIEWER' });
    await prisma.session.create({ data: { tokenHash: 'b'.repeat(64), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });

    const result = await execute(['edit', user.id, '--active', '--reset-password', '--password-stdin'], 'SenhaNova2026!\n');

    expect(result.code).toBe(0);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword('SenhaNova2026!', stored.passwordHash, stored.passwordSalt)).toBe(true);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it('protege o último administrador ativo dentro da atualização', async () => {
    const admin = await createUser(prisma, { name: 'Admin Único', email: 'admin@example.invalid', password: 'SenhaSegura2026!', role: 'admin' });

    const result = await execute(['edit', admin.id, '--role', 'VIEWER']);

    expect(result.code).toBe(1);
    expect(result.error).toContain('último administrador ativo');
    await expect(prisma.user.findUnique({ where: { id: admin.id } })).resolves.toMatchObject({ role: 'admin', active: true });
  });

  it('retorna conflito para e-mail duplicado', async () => {
    await createUser(prisma, { name: 'Usuário Existente', email: 'duplicado@example.invalid', password: 'SenhaSegura2026!', role: 'VIEWER' });

    const result = await execute([
      'create', '--name', 'Outro Usuário', '--email', 'DUPLICADO@EXAMPLE.INVALID', '--password-stdin',
    ], 'OutraSenha2026!\n');

    expect(result.code).toBe(1);
    expect(result.error).toContain('Já existe um usuário');
  });

  it('rejeita argumentos incompatíveis e dados obrigatórios ausentes fora de TTY', async () => {
    const conflictingState = await execute(['edit', 'alguem@example.invalid', '--active', '--inactive']);
    const missingFields = await execute(['create', '--name', 'Nome Apenas']);
    const plaintextPassword = await execute(['create', '--name', 'Nome', '--email', 'nome@example.invalid', '--password', 'proibida']);

    expect(conflictingState.code).toBe(1);
    expect(conflictingState.error).toContain('apenas --active ou --inactive');
    expect(missingFields.code).toBe(1);
    expect(missingFields.error).toContain('--name e --email');
    expect(plaintextPassword.code).toBe(1);
    expect(plaintextPassword.error).toContain('Opção não reconhecida: --password');
  });
});
