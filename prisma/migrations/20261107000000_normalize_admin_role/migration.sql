PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_role_check" CHECK ("role" IN ('admin', 'OPERATOR', 'VIEWER'))
);

INSERT INTO "new_User" ("id", "name", "email", "passwordHash", "passwordSalt", "role", "active", "createdAt", "updatedAt")
SELECT "id", "name", "email", "passwordHash", "passwordSalt",
       CASE WHEN "role" = 'ADMIN' THEN 'admin' ELSE "role" END,
       "active", "createdAt", "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

PRAGMA foreign_keys=ON;
