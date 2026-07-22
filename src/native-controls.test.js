// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migração dos controles nativos', () => {
  it('não mantém selects ou calendários nativos no frontend da aplicação', () => {
    const source = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    expect(source).not.toMatch(/<select\b/i);
    expect(source).not.toMatch(/type=["']date["']/i);
  });

  it('não usa a confirmação nativa do navegador para ações críticas', () => {
    const source = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    expect(source).not.toContain('window.confirm');
  });
});
