CREATE TABLE "PrivacyRequestMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientScope" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyRequestMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrivacyRequestMessage_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PrivacyRequestMessage_requestId_createdAt_idx" ON "PrivacyRequestMessage"("requestId", "createdAt");
CREATE INDEX "PrivacyRequestMessage_recipientUserId_createdAt_idx" ON "PrivacyRequestMessage"("recipientUserId", "createdAt");
