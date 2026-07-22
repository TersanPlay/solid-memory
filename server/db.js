import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/prisma/client.ts';
import { prepareDatabaseFile, resolveDatabasePath } from './prepare-database.js';

export function createDatabase(databaseUrl) {
  prepareDatabaseFile(databaseUrl);
  const databasePath = resolveDatabasePath(databaseUrl).replaceAll('\\', '/');
  const adapter = new PrismaBetterSqlite3({ url: `file:${databasePath}` }, { timestampFormat: 'iso8601' });
  return new PrismaClient({ adapter });
}

export async function initializeDatabase(prisma) {
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON');
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000');
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
