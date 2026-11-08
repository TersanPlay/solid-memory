import {
  buildAttachmentStorageKey,
  removeAttachmentFile,
  writeAttachmentFile,
} from "./attachment-storage.js";

export async function migrateLegacyAttachments({
  prisma,
  attachmentsDir,
}) {
  void prisma; void attachmentsDir;
  throw new Error("Migração física de anexos desativada; dados legados permanecem intactos no banco.");
}
