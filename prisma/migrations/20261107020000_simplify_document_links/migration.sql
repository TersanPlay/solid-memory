PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DocumentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "new_DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "new_DocumentLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_DocumentLink" ("id", "documentId", "url", "provider", "createdById", "createdAt", "updatedAt")
SELECT "id", "documentId", "url", "provider", "createdById", "createdAt", "updatedAt"
FROM "DocumentLink";

DROP TABLE "DocumentLink";
ALTER TABLE "new_DocumentLink" RENAME TO "DocumentLink";

CREATE INDEX "DocumentLink_documentId_createdAt_idx" ON "DocumentLink"("documentId", "createdAt");
CREATE INDEX "DocumentLink_createdById_idx" ON "DocumentLink"("createdById");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
