CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectUserId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "handledById" TEXT,
    "type" TEXT NOT NULL CHECK ("type" IN ('ACCESS', 'CORRECTION', 'ANONYMIZATION', 'DELETION', 'PORTABILITY', 'OPPOSITION', 'CONSENT_REVOCATION')),
    "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
    "description" TEXT NOT NULL DEFAULT '',
    "responseNote" TEXT NOT NULL DEFAULT '',
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "DataSubjectRequest_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DataSubjectRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DataSubjectRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "DataSubjectRequest_subjectUserId_createdAt_idx" ON "DataSubjectRequest"("subjectUserId", "createdAt");
CREATE INDEX "DataSubjectRequest_status_dueAt_idx" ON "DataSubjectRequest"("status", "dueAt");
CREATE INDEX "DataSubjectRequest_createdById_createdAt_idx" ON "DataSubjectRequest"("createdById", "createdAt");
