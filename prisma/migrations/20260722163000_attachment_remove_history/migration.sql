PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DocumentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "description" TEXT NOT NULL,
    "detailsJson" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentHistory_action_check" CHECK ("action" IN ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'CANCEL', 'ATTACHMENT_ADD', 'ATTACHMENT_REMOVE')),
    CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_DocumentHistory" ("action", "createdAt", "description", "detailsJson", "documentId", "fromStatus", "id", "toStatus", "userId")
SELECT "action", "createdAt", "description", "detailsJson", "documentId", "fromStatus", "id", "toStatus", "userId" FROM "DocumentHistory";

DROP TABLE "DocumentHistory";
ALTER TABLE "new_DocumentHistory" RENAME TO "DocumentHistory";
CREATE INDEX "DocumentHistory_documentId_createdAt_idx" ON "DocumentHistory"("documentId", "createdAt");
CREATE INDEX "DocumentHistory_createdAt_idx" ON "DocumentHistory"("createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
