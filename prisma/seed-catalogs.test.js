// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, initializeDatabase } from "../server/db.js";
import {
  defaultDepartments,
  defaultDocumentTypes,
  seedCatalogs,
} from "./seed-catalogs.js";

const tempDir = path.resolve(
  ".tmp",
  `seed-catalogs-${process.pid}-${Date.now()}`,
);
const databasePath = path.join(tempDir, "test.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let prisma;

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
});

afterAll(async () => {
  await prisma.$disconnect();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("seed de catálogos", () => {
  it("inicializa tabelas vazias e preserva edições e exclusões posteriores", async () => {
    await expect(seedCatalogs(prisma)).resolves.toEqual({
      typesCreated: defaultDocumentTypes.length,
      departmentsCreated: defaultDepartments.length,
    });

    const arquivo = await prisma.department.findUnique({
      where: { code: "DEP-ARQUIVO" },
    });
    const almoxarifado = await prisma.department.findUnique({
      where: { code: "DEP-ALMOXARIFADO" },
    });
    const memo = await prisma.documentType.findUnique({
      where: { prefix: "MEMO" },
    });
    await prisma.department.update({
      where: { id: arquivo.id },
      data: {
        name: "Arquivo Central Editado",
        code: "DEP-ARQUIVO-EDITADO",
      },
    });
    await prisma.department.delete({ where: { id: almoxarifado.id } });
    await prisma.documentType.update({
      where: { id: memo.id },
      data: { name: "Memorando Editado" },
    });

    await expect(seedCatalogs(prisma)).resolves.toEqual({
      typesCreated: 0,
      departmentsCreated: 0,
    });
    await expect(prisma.department.count()).resolves.toBe(
      defaultDepartments.length - 1,
    );
    await expect(
      prisma.department.findUnique({
        where: { code: "DEP-ARQUIVO-EDITADO" },
      }),
    ).resolves.toMatchObject({ name: "Arquivo Central Editado" });
    await expect(
      prisma.department.findUnique({ where: { code: "DEP-ARQUIVO" } }),
    ).resolves.toBeNull();
    await expect(
      prisma.department.findUnique({ where: { code: "DEP-ALMOXARIFADO" } }),
    ).resolves.toBeNull();
    await expect(
      prisma.documentType.findUnique({ where: { prefix: "MEMO" } }),
    ).resolves.toMatchObject({ name: "Memorando Editado" });
  });
});
