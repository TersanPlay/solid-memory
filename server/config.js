import path from 'node:path';

const DEFAULT_DATABASE_URL = 'file:./data/folio.db';

export function loadConfig(overrides = {}) {
  const databaseUrl = overrides.databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const port = Number(overrides.port ?? process.env.PORT ?? 3000);
  const nodeEnv = overrides.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const railwayEnvironmentId = overrides.railwayEnvironmentId
    ?? process.env.RAILWAY_ENVIRONMENT_ID
    ?? '';

  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL deve apontar para um arquivo SQLite usando file:.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser um número entre 1 e 65535.');
  }

  const sessionHours = Number(overrides.sessionHours ?? process.env.SESSION_HOURS ?? 8);
  if (!Number.isFinite(sessionHours) || sessionHours <= 0 || sessionHours > 720) {
    throw new Error('SESSION_HOURS deve estar entre 0 e 720.');
  }

  return {
    databaseUrl,
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isRailway: Boolean(railwayEnvironmentId),
    rootDir: path.resolve(process.cwd()),
    sessionHours,
  };
}
