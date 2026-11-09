CREATE TABLE "PrivacyRequestRetentionLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestType" TEXT NOT NULL,
    "maxRetentionDays" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT NOT NULL
);

CREATE UNIQUE INDEX "PrivacyRequestRetentionLimit_requestType_key" ON "PrivacyRequestRetentionLimit"("requestType");
CREATE INDEX "PrivacyRequestRetentionLimit_active_idx" ON "PrivacyRequestRetentionLimit"("active");
