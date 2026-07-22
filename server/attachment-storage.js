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
  const target = resolveAttachmentPath(storageRoot, storageKey);
  const directory = path.dirname(target);
  const temporary = path.join(directory, `.${crypto.randomUUID()}.upload`);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, content, { flag: "wx" });
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return target;
}

export async function readAttachmentFile(storageRoot, storageKey) {
  return fs.readFile(resolveAttachmentPath(storageRoot, storageKey));
}

export async function removeAttachmentFile(storageRoot, storageKey) {
  const target = resolveAttachmentPath(storageRoot, storageKey);
  try {
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await pruneEmptyDirectories(path.dirname(target), storageRoot);
}

export async function stageAttachmentFileRemoval(storageRoot, storageKey) {
  const originalPath = resolveAttachmentPath(storageRoot, storageKey);
  const stagedPath = path.join(
    path.dirname(originalPath),
    `.${crypto.randomUUID()}.deleting`,
  );
  try {
    await fs.rename(originalPath, stagedPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  return { originalPath, stagedPath, storageRoot };
}

export async function restoreStagedAttachmentFile(staged) {
  if (!staged) return;
  await fs.rename(staged.stagedPath, staged.originalPath);
}

export async function finalizeStagedAttachmentRemoval(staged) {
  if (!staged) return;
  await fs.rm(staged.stagedPath, { force: true });
  await pruneEmptyDirectories(path.dirname(staged.stagedPath), staged.storageRoot);
}
