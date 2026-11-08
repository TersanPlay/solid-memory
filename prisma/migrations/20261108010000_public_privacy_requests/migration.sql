CREATE TABLE "PublicPrivacyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicReference" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('ACCESS', 'CORRECTION', 'ANONYMIZATION', 'DELETION', 'PORTABILITY', 'OPPOSITION', 'CONSENT_REVOCATION')),
    "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
    "description" TEXT NOT NULL DEFAULT '',
    "responseNote" TEXT NOT NULL DEFAULT '',
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);
CREATE UNIQUE INDEX "PublicPrivacyRequest_publicReference_key" ON "PublicPrivacyRequest"("publicReference");
CREATE INDEX "PublicPrivacyRequest_status_dueAt_idx" ON "PublicPrivacyRequest"("status", "dueAt");
CREATE INDEX "PublicPrivacyRequest_requesterEmail_createdAt_idx" ON "PublicPrivacyRequest"("requesterEmail", "createdAt");

CREATE TABLE "PrivacyRequestEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PrivacyRequestEvent_requestId_source_createdAt_idx" ON "PrivacyRequestEvent"("requestId", "source", "createdAt");
