import "dotenv/config";
import { migrateLegacyAttachments } from "../server/attachment-migration.js";
import { loadConfig } from "../server/config.js";
import { createDatabase, initializeDatabase } from "../server/db.js";

const config = loadConfig();
const prisma = createDatabase(config.databaseUrl);

try {
  await initializeDatabase(prisma);
  const result = await migrateLegacyAttachments({
    prisma,
    attachmentsDir: config.attachmentsDir,
    onProgress: ({ migrated }) => {
      if (migrated % 50 === 0) {
        console.log(`${migrated} anexos migrados...`);
      }
    },
  });
  console.log(
    result.migrated === 0
      ? "Nenhum anexo legado pendente."
      : `${result.migrated} anexo(s) migrado(s) para ${config.attachmentsDir}.`,
  );
} catch (error) {
  console.error("Não foi possível migrar os anexos:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
