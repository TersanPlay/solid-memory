// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const originalPort = process.env.PORT;

afterEach(() => {
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
});

describe('configuração padrão do servidor', () => {
  it('usa a porta 3002 quando PORT não foi definida', () => {
    delete process.env.PORT;
    expect(loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'test' }).port).toBe(3002);
  });
});
