PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BLOB,
    "storageKey" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_storage_check" CHECK (
        ("storageKey" IS NOT NULL AND "content" IS NULL) OR
        ("storageKey" IS NULL AND "content" IS NOT NULL)
    ),
    CONSTRAINT "Attachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Attachment" ("content", "createdAt", "documentId", "id", "mimeType", "originalName", "size", "uploadedById")
SELECT "content", "createdAt", "documentId", "id", "mimeType", "originalName", "size", "uploadedById" FROM "Attachment";

DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";

CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");
CREATE INDEX "Attachment_documentId_idx" ON "Attachment"("documentId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
