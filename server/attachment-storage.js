import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const MAX_FILENAME_LENGTH = 180;

export function normalizeOriginalName(input) {
  const basename = String(input ?? "")
    .normalize("NFC")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f"]/g, "_")
    .trim();
  return basename.slice(0, MAX_FILENAME_LENGTH) || "anexo";
}

export function filesystemAttachmentName(originalName) {
  let filename = normalizeOriginalName(originalName)
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_")
    .replace(/[. ]+$/g, "_");

  if (filename === "." || filename === "..") filename = "anexo";
  if (WINDOWS_RESERVED_NAME.test(filename)) filename = `_${filename}`;
  return filename.slice(0, MAX_FILENAME_LENGTH) || "anexo";
}

function assertSafeSegment(value, label) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} contém caracteres inválidos para armazenamento.`);
  }
  return value;
}

export function buildAttachmentStorageKey({
  documentId,
  originalName,
  createdAt = new Date(),
  storageId = crypto.randomUUID(),
}) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida para armazenamento do anexo.");
  }
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return [
    year,
    month,
    assertSafeSegment(String(documentId), "documentId"),
    assertSafeSegment(String(storageId), "storageId"),
    filesystemAttachmentName(originalName),
  ].join("/");
}

export function resolveAttachmentPath(storageRoot, storageKey) {
  const root = path.resolve(storageRoot);
  const key = String(storageKey ?? "");
  const parts = key.split("/");
  if (
    !key ||
    path.isAbsolute(key) ||
    key.includes("\\") ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Chave de armazenamento de anexo inválida.");
  }
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Chave de armazenamento fora da pasta autorizada.");
  }
  return target;
}

async function pruneEmptyDirectories(startDirectory, storageRoot) {
  const root = path.resolve(storageRoot);
  let current = path.resolve(startDirectory);
  while (current.startsWith(`${root}${path.sep}`)) {
    try {
      await fs.rmdir(current);
    } catch (error) {
      if (error.code === "ENOENT") {
        current = path.dirname(current);
        continue;
      }
      if (error.code === "ENOTEMPTY" || error.code === "EEXIST") return;
      throw error;
    }
    current = path.dirname(current);
  }
}

export async function writeAttachmentFile(storageRoot, storageKey, content) {
  void storageRoot; void storageKey; void content;
  throw new Error("Armazenamento físico de anexos foi desativado; use links HTTPS.");
}

export async function readAttachmentFile(storageRoot, storageKey) {
  void storageRoot; void storageKey;
  throw new Error("Download físico de anexos foi desativado; use links HTTPS.");
}

export async function removeAttachmentFile(storageRoot, storageKey) {
  void storageRoot; void storageKey;
  throw new Error("Remoção física de anexos foi desativada para preservar dados históricos.");
}

export async function stageAttachmentFileRemoval(storageRoot, storageKey) {
  void storageRoot; void storageKey;
  throw new Error("Remoção física de anexos foi desativada para preservar dados históricos.");
}

export async function restoreStagedAttachmentFile(staged) {
  void staged;
  throw new Error("Operações físicas de anexos estão desativadas.");
}

export async function finalizeStagedAttachmentRemoval(staged) {
  void staged;
  throw new Error("Operações físicas de anexos estão desativadas.");
}
