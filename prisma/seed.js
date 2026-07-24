import "dotenv/config";
import { hashPassword, normalizeEmail } from "../server/auth.js";
import { createDatabase, initializeDatabase } from "../server/db.js";
import { createDocument } from "../server/documents.js";
import { seedCatalogs } from "./seed-catalogs.js";

function requiredEnvironment() {
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (
    !name ||
    !email ||
    !password ||
    password === "SUBSTITUA_POR_UMA_SENHA_FORTE" ||
    password.length < 10
  ) {
    throw new Error(
      "Defina BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e uma BOOTSTRAP_ADMIN_PASSWORD com ao menos 10 caracteres.",
    );
  }
  return { name, email: normalizeEmail(email), password };
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/folio.db";
const prisma = createDatabase(databaseUrl);

try {
  await initializeDatabase(prisma);
  const bootstrap = requiredEnvironment();
  const catalogResult = await seedCatalogs(prisma);

  let admin = await prisma.user.findUnique({
    where: { email: bootstrap.email },
  });
  if (!admin) {
    const password = await hashPassword(bootstrap.password);
    admin = await prisma.user.create({
      data: {
        name: bootstrap.name,
        email: bootstrap.email,
        role: "ADMIN",
        active: true,
        passwordHash: password.hash,
        passwordSalt: password.salt,
      },
    });
  } else {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { name: bootstrap.name, role: "ADMIN", active: true },
    });
  }

  if (
    process.env.SEED_DEMO_DATA === "true" &&
    (await prisma.document.count()) === 0
  ) {
    const memo = await prisma.documentType.findUnique({
      where: { prefix: "MEMO" },
    });
    const oficio = await prisma.documentType.findUnique({
      where: { prefix: "OFC" },
    });
    const arquivo = await prisma.department.findUnique({
      where: { code: "DEP-ARQUIVO" },
    });
    const ti = await prisma.department.findUnique({
      where: { code: "DEP-TI" },
    });
    const patrimonio = await prisma.department.findUnique({
      where: { code: "DEP-PATRIMONIO" },
    });
    if (memo && oficio && arquivo && ti && patrimonio) {
      await createDocument(
        prisma,
        {
          typeId: memo.id,
          date: "2026-07-22",
          originDepartmentId: arquivo.id,
          destinationDepartmentId: ti.id,
          subject: "Solicitação de suporte para equipamento administrativo",
          responsibleUserId: admin.id,
          status: "REGISTRADO",
          notes: "Registro demonstrativo sem dados pessoais.",
        },
        admin,
      );
      await createDocument(
        prisma,
        {
          typeId: oficio.id,
          date: "2026-07-21",
          originDepartmentId: ti.id,
          destinationDepartmentId: patrimonio.id,
          subject: "Encaminhamento de inventário de equipamentos",
          responsibleUserId: admin.id,
          status: "ENVIADO",
          notes: "Registro demonstrativo sem anexo.",
        },
        admin,
      );
    } else {
      console.warn(
        "Dados demonstrativos não foram criados porque os catálogos necessários não estão disponíveis.",
      );
    }
  }

  console.log(
    `Seed concluído: ${catalogResult.typesCreated} tipos e ${catalogResult.departmentsCreated} departamentos criados; administrador configurado.`,
  );
} finally {
  await prisma.$disconnect();
}
