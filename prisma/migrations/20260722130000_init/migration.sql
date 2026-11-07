-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_role_check" CHECK ("role" IN ('ADMIN', 'OPERATOR', 'VIEWER'))
);

CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "separator" TEXT NOT NULL,
    "digits" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentType_separator_check" CHECK ("separator" IN ('/', '-')),
    CONSTRAINT "DocumentType_digits_check" CHECK ("digits" BETWEEN 3 AND 6)
);

CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ProtocolSequence" (
    "typeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("typeId", "year"),
    CONSTRAINT "ProtocolSequence_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DocumentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocol" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "typeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "originDepartmentId" TEXT NOT NULL,
    "originCodeSnapshot" TEXT NOT NULL,
    "originNameSnapshot" TEXT NOT NULL,
    "destinationDepartmentId" TEXT,
    "destinationText" TEXT,
    "destinationCodeSnapshot" TEXT,
    "destinationNameSnapshot" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_status_check" CHECK ("status" IN ('REGISTRADO', 'ENVIADO', 'RECEBIDO', 'ARQUIVADO', 'CANCELADO')),
    CONSTRAINT "Document_destination_xor_check" CHECK (("destinationDepartmentId" IS NOT NULL AND "destinationText" IS NULL) OR ("destinationDepartmentId" IS NULL AND "destinationText" IS NOT NULL)),
    CONSTRAINT "Document_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DocumentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_originDepartmentId_fkey" FOREIGN KEY ("originDepartmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_destinationDepartmentId_fkey" FOREIGN KEY ("destinationDepartmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DocumentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "description" TEXT NOT NULL,
    "detailsJson" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentHistory_action_check" CHECK ("action" IN ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'CANCEL', 'ATTACHMENT_ADD')),
    CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BLOB NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "DocumentType_prefix_key" ON "DocumentType"("prefix");
CREATE INDEX "DocumentType_active_idx" ON "DocumentType"("active");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE INDEX "Department_active_idx" ON "Department"("active");
CREATE UNIQUE INDEX "Document_protocol_key" ON "Document"("protocol");
CREATE INDEX "Document_date_idx" ON "Document"("date");
CREATE INDEX "Document_year_idx" ON "Document"("year");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_typeId_idx" ON "Document"("typeId");
CREATE INDEX "Document_originDepartmentId_idx" ON "Document"("originDepartmentId");
CREATE INDEX "Document_destinationDepartmentId_idx" ON "Document"("destinationDepartmentId");
CREATE INDEX "Document_responsibleUserId_idx" ON "Document"("responsibleUserId");
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");
CREATE UNIQUE INDEX "Document_typeId_year_sequence_key" ON "Document"("typeId", "year", "sequence");
CREATE INDEX "DocumentHistory_documentId_createdAt_idx" ON "DocumentHistory"("documentId", "createdAt");
CREATE INDEX "DocumentHistory_createdAt_idx" ON "DocumentHistory"("createdAt");
CREATE INDEX "Attachment_documentId_idx" ON "Attachment"("documentId");
