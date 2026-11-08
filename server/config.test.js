// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { rateLimitClientIp } from './app.js';
import { loadConfig } from './config.js';

const originalPort = process.env.PORT;
const originalAttachmentsDir = process.env.ATTACHMENTS_DIR;
const originalRailwayEnvironmentId = process.env.RAILWAY_ENVIRONMENT_ID;

afterEach(() => {
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
  if (originalAttachmentsDir === undefined) delete process.env.ATTACHMENTS_DIR;
  else process.env.ATTACHMENTS_DIR = originalAttachmentsDir;
  if (originalRailwayEnvironmentId === undefined) delete process.env.RAILWAY_ENVIRONMENT_ID;
  else process.env.RAILWAY_ENVIRONMENT_ID = originalRailwayEnvironmentId;
});

describe('configuração padrão do servidor', () => {
  it('usa a porta 3000 quando PORT não foi definida', () => {
    delete process.env.PORT;
    expect(loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'test' }).port).toBe(3000);
  });

  it('não expõe configuração de armazenamento físico de anexos', () => {
    expect(loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'test' }))
      .not.toHaveProperty('attachmentsDir');
  });

  it('reconhece o ambiente Railway e usa somente seu X-Real-IP validado no rate limit', () => {
    process.env.RAILWAY_ENVIRONMENT_ID = 'environment-test';
    const config = loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'production' });
    const request = {
      ip: '127.0.0.1',
      get: (name) => name === 'X-Real-IP' ? '203.0.113.10' : undefined,
    };
    expect(config.isRailway).toBe(true);
    expect(rateLimitClientIp(request, config)).toBe('203.0.113.10');
    expect(rateLimitClientIp(request, { ...config, isRailway: false })).toBe('127.0.0.1');
    expect(rateLimitClientIp(
      { ...request, get: () => 'valor-invalido' },
      config,
    )).toBe('127.0.0.1');
  });
});
