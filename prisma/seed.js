import 'dotenv/config';
import { hashPassword, normalizeEmail } from '../server/auth.js';
import { createDatabase, initializeDatabase } from '../server/db.js';
import { createDocument } from '../server/documents.js';

const types = [
  { name: 'Memorando', prefix: 'MEMO', separator: '/', digits: 3 },
  { name: 'Ofício', prefix: 'OFC', separator: '/', digits: 3 },
  { name: 'Circular', prefix: 'CIR', separator: '/', digits: 3 },
  { name: 'Comunicado Interno', prefix: 'CI', separator: '/', digits: 3 },
  { name: 'Ordem de Serviço', prefix: 'OS', separator: '/', digits: 3 },
  { name: 'Laudo Técnico', prefix: 'LT', separator: '-', digits: 3 },
  { name: 'Parecer Técnico', prefix: 'PR', separator: '/', digits: 3 },
];

const departments = [
  { name: 'Departamento de Arquivo', code: 'DEP-ARQUIVO' },
  { name: 'Departamento de Almoxarifado', code: 'DEP-ALMOXARIFADO' },
  { name: 'Tecnologia da Informação', code: 'DEP-TI' },
  { name: 'Gestão de Pessoas', code: 'DEP-PESSOAS' },
  { name: 'Departamento Financeiro', code: 'DEP-FINANCEIRO' },
  { name: 'Patrimônio e Manutenção', code: 'DEP-PATRIMONIO' },
];

function requiredEnvironment() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!name || !email || !password || password === 'SUBSTITUA_POR_UMA_SENHA_FORTE' || password.length < 10) {
    throw new Error('Defina BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e uma BOOTSTRAP_ADMIN_PASSWORD com ao menos 10 caracteres.');
  }
  return { name, email: normalizeEmail(email), password };
}

const databaseUrl = process.env.DATABASE_URL ?? 'file:./data/folio.db';
const prisma = createDatabase(databaseUrl);

try {
  await initializeDatabase(prisma);
  const bootstrap = requiredEnvironment();
  for (const type of types) {
    await prisma.documentType.upsert({ where: { prefix: type.prefix }, update: { name: type.name, separator: type.separator, digits: type.digits }, create: type });
  }
  for (const department of departments) {
    await prisma.department.upsert({ where: { code: department.code }, update: { name: department.name }, create: department });
  }

  let admin = await prisma.user.findUnique({ where: { email: bootstrap.email } });
  if (!admin) {
    const password = await hashPassword(bootstrap.password);
    admin = await prisma.user.create({ data: { name: bootstrap.name, email: bootstrap.email, role: 'ADMIN', active: true, passwordHash: password.hash, passwordSalt: password.salt } });
  } else {
    admin = await prisma.user.update({ where: { id: admin.id }, data: { name: bootstrap.name, role: 'ADMIN', active: true } });
  }

  if (process.env.SEED_DEMO_DATA === 'true' && await prisma.document.count() === 0) {
    const memo = await prisma.documentType.findUnique({ where: { prefix: 'MEMO' } });
    const oficio = await prisma.documentType.findUnique({ where: { prefix: 'OFC' } });
    const arquivo = await prisma.department.findUnique({ where: { code: 'DEP-ARQUIVO' } });
    const ti = await prisma.department.findUnique({ where: { code: 'DEP-TI' } });
    const patrimonio = await prisma.department.findUnique({ where: { code: 'DEP-PATRIMONIO' } });
    await createDocument(prisma, { typeId: memo.id, date: '2026-07-22', originDepartmentId: arquivo.id, destinationDepartmentId: ti.id, subject: 'Solicitação de suporte para equipamento administrativo', responsibleUserId: admin.id, status: 'REGISTRADO', notes: 'Registro demonstrativo sem dados pessoais.' }, admin);
    await createDocument(prisma, { typeId: oficio.id, date: '2026-07-21', originDepartmentId: ti.id, destinationDepartmentId: patrimonio.id, subject: 'Encaminhamento de inventário de equipamentos', responsibleUserId: admin.id, status: 'ENVIADO', notes: 'Registro demonstrativo sem anexo.' }, admin);
  }

  console.log(`Seed concluído: ${types.length} tipos, ${departments.length} departamentos e administrador configurado.`);
} finally {
  await prisma.$disconnect();
}
