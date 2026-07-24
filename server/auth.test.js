// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hashPassword, hashSessionToken, normalizeEmail, verifyPassword } from './auth.js';
import { formatProtocol } from './documents.js';

describe('segurança e protocolo', () => {
  it('normaliza e-mail', () => expect(normalizeEmail(' Admin@Example.COM ')).toBe('admin@example.com'));

  it('gera e verifica hash scrypt sem armazenar a senha', async () => {
    const password = await hashPassword('uma-senha-forte');
    expect(password.hash).not.toContain('uma-senha-forte');
    await expect(verifyPassword('uma-senha-forte', password.hash, password.salt)).resolves.toBe(true);
    await expect(verifyPassword('senha-errada', password.hash, password.salt)).resolves.toBe(false);
  });

  it('armazena apenas hash do token de sessão', () => {
    expect(hashSessionToken('token')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('preserva a máscara de protocolo', () => {
    expect(formatProtocol({ prefix: 'MEMO', digits: 3 }, 14, 2026)).toBe('MEMO-014/2026');
  });
});
