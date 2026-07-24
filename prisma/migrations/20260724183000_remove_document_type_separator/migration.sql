PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DocumentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "digits" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentType_digits_check" CHECK ("digits" BETWEEN 3 AND 6)
);

INSERT INTO "new_DocumentType" ("active", "createdAt", "digits", "id", "name", "prefix", "updatedAt")
SELECT "active", "createdAt", "digits", "id", "name", "prefix", "updatedAt" FROM "DocumentType";

DROP TABLE "DocumentType";
ALTER TABLE "new_DocumentType" RENAME TO "DocumentType";
CREATE UNIQUE INDEX "DocumentType_prefix_key" ON "DocumentType"("prefix");
CREATE INDEX "DocumentType_active_idx" ON "DocumentType"("active");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
