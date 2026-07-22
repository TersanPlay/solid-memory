import { describe, expect, it } from 'vitest';
import { formatProtocol, statusLabel } from './data.js';

describe('formatação exibida no frontend', () => {
  it('formata um protocolo com zeros e separador configurado', () => {
    expect(formatProtocol({ prefix: 'LT', separator: '-', digits: 3 }, 5, 2026)).toBe('LT-005-2026');
  });

  it('traduz status persistido para pt-BR', () => {
    expect(statusLabel('EM_ELABORACAO')).toBe('Em elaboração');
  });
});
