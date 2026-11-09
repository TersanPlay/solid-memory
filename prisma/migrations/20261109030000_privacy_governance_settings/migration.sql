CREATE TABLE "RetentionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "retentionMonths" INTEGER NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "postAction" TEXT NOT NULL DEFAULT 'BLOCK_AND_RETAIN' CHECK ("postAction" IN ('HARD_DELETE', 'ANONYMIZE', 'CRYPTO_SHRED', 'BLOCK_AND_RETAIN')),
    "triggeredBy" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL
);
CREATE INDEX "RetentionRule_entityKey_active_idx" ON "RetentionRule"("entityKey", "active");
CREATE INDEX "RetentionRule_updatedAt_idx" ON "RetentionRule"("updatedAt");

CREATE TABLE "PrivacySetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT
);
