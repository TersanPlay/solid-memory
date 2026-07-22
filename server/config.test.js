// @vitest-environment node
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const originalPort = process.env.PORT;
const originalAttachmentsDir = process.env.ATTACHMENTS_DIR;

afterEach(() => {
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
  if (originalAttachmentsDir === undefined) delete process.env.ATTACHMENTS_DIR;
  else process.env.ATTACHMENTS_DIR = originalAttachmentsDir;
});

describe('configuração padrão do servidor', () => {
  it('usa a porta 3002 quando PORT não foi definida', () => {
    delete process.env.PORT;
    expect(loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'test' }).port).toBe(3002);
  });

  it('usa data/attachments como pasta padrão de anexos', () => {
    delete process.env.ATTACHMENTS_DIR;
    expect(
      loadConfig({ databaseUrl: 'file:./data/test.db', nodeEnv: 'test' })
        .attachmentsDir,
    ).toBe(path.resolve('data/attachments'));
  });
});
