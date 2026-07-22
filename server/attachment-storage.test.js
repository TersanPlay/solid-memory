// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildAttachmentStorageKey,
  filesystemAttachmentName,
  normalizeOriginalName,
  readAttachmentFile,
  removeAttachmentFile,
  resolveAttachmentPath,
  writeAttachmentFile,
} from "./attachment-storage.js";

const tempRoot = path.resolve(
  ".tmp",
  `attachment-storage-${process.pid}-${Date.now()}`,
);

afterEach(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("armazenamento de anexos em arquivos", () => {
  it("preserva o nome original seguro dentro da hierarquia anual", () => {
    const key = buildAttachmentStorageKey({
      documentId: "documento_123",
      originalName: "Relatório final 2026.pdf",
      createdAt: new Date("2026-07-22T12:00:00Z"),
      storageId: "storage_456",
    });
    expect(key).toBe(
      "2026/07/documento_123/storage_456/Relatório final 2026.pdf",
    );
    expect(normalizeOriginalName("C:\\fakepath\\evidência.pdf")).toBe(
      "evidência.pdf",
    );
  });

  it("substitui somente caracteres incompatíveis com o sistema de arquivos", () => {
    expect(filesystemAttachmentName('ata:final?.pdf')).toBe("ata_final_.pdf");
    expect(filesystemAttachmentName("CON.pdf")).toBe("_CON.pdf");
  });

  it("grava, lê e remove o arquivo sem aceitar traversal", async () => {
    const key = buildAttachmentStorageKey({
      documentId: "doc_1",
      originalName: "arquivo.pdf",
      createdAt: "2026-07-22T00:00:00Z",
      storageId: "storage_1",
    });
    const expected = Buffer.from("conteúdo do teste");
    const storedPath = await writeAttachmentFile(tempRoot, key, expected);
    expect(fs.existsSync(storedPath)).toBe(true);
    expect(await readAttachmentFile(tempRoot, key)).toEqual(expected);

    expect(() => resolveAttachmentPath(tempRoot, "../segredo.txt")).toThrow(
      "Chave de armazenamento",
    );

    await removeAttachmentFile(tempRoot, key);
    expect(fs.existsSync(storedPath)).toBe(false);
  });
});
