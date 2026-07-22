import {
  buildAttachmentStorageKey,
  removeAttachmentFile,
  writeAttachmentFile,
} from "./attachment-storage.js";

export async function migrateLegacyAttachments({
  prisma,
  attachmentsDir,
  batchSize = 50,
  onProgress = () => {},
}) {
  let cursor;
  let migrated = 0;

  while (true) {
    const attachments = await prisma.attachment.findMany({
      where: {
        storageKey: null,
        content: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: "asc" },
      take: batchSize,
      select: {
        id: true,
        documentId: true,
        originalName: true,
        content: true,
        createdAt: true,
      },
    });
    if (attachments.length === 0) break;

    for (const attachment of attachments) {
      const storageKey = buildAttachmentStorageKey({
        documentId: attachment.documentId,
        originalName: attachment.originalName,
        createdAt: attachment.createdAt,
      });
      await writeAttachmentFile(
        attachmentsDir,
        storageKey,
        attachment.content,
      );
      try {
        const updated = await prisma.attachment.updateMany({
          where: {
            id: attachment.id,
            storageKey: null,
            content: { not: null },
          },
          data: { storageKey, content: null },
        });
        if (updated.count !== 1) {
          await removeAttachmentFile(attachmentsDir, storageKey);
          throw new Error(
            `O anexo ${attachment.id} foi alterado durante a migração.`,
          );
        }
      } catch (error) {
        await removeAttachmentFile(attachmentsDir, storageKey).catch(() => {});
        throw error;
      }
      migrated += 1;
      onProgress({ migrated, attachmentId: attachment.id });
    }
    cursor = attachments.at(-1).id;
  }

  return { migrated };
}
