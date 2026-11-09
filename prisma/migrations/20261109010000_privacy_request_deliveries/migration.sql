ALTER TABLE "PublicPrivacyRequest" ADD COLUMN "subjectUserId" TEXT;
ALTER TABLE "PublicPrivacyRequest" ADD COLUMN "identityVerifiedAt" DATETIME;
ALTER TABLE "PublicPrivacyRequest" ADD COLUMN "identityVerifiedById" TEXT;

CREATE TABLE "PrivacyRequestDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'json',
    "tokenHash" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "bundleHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "downloadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "PrivacyRequestDelivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PrivacyRequestDelivery_tokenHash_key" ON "PrivacyRequestDelivery"("tokenHash");
CREATE INDEX "PrivacyRequestDelivery_requestId_source_createdAt_idx" ON "PrivacyRequestDelivery"("requestId", "source", "createdAt");
CREATE INDEX "PrivacyRequestDelivery_expiresAt_downloadedAt_idx" ON "PrivacyRequestDelivery"("expiresAt", "downloadedAt");
