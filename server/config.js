import path from 'node:path';

const DEFAULT_DATABASE_URL = 'file:./data/folio.db';

export function loadConfig(overrides = {}) {
  const databaseUrl = overrides.databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const port = Number(overrides.port ?? process.env.PORT ?? 3002);
  const nodeEnv = overrides.nodeEnv ?? process.env.NODE_ENV ?? 'development';

  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL deve apontar para um arquivo SQLite usando file:.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número entre 1 e 65535.');
  }

  return {
    databaseUrl,
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    rootDir: path.resolve(process.cwd()),
    sessionHours: 8,
    maxAttachmentBytes: 10 * 1024 * 1024,
  };
}
