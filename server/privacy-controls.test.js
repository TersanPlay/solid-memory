import { describe, expect, it } from 'vitest';
import { assertSafeDocumentUrl, redactForAudit, redactRequestUrl, urlFingerprint } from './privacy-controls.js';

describe('privacy controls', () => {
  it('redacts sensitive query values from request URLs', () => {
    expect(redactRequestUrl('/api/privacy-deliveries/delivery-1/download?token=secret-value&format=json'))
      .toBe('/api/privacy-deliveries/delivery-1/download?token=%5Bredacted%5D&format=json');
  });

  it('redacts personal identifiers and URLs from audit notes', () => {
    const result = redactForAudit('Contato maria@example.com, CPF 123.456.789-09, https://drive.example/doc/123');
    expect(result).toContain('[e-mail redigido]');
    expect(result).toContain('[documento redigido]');
    expect(result).toContain('[URL redigida]');
    expect(result).not.toContain('maria@example.com');
  });

  it('rejects credential-bearing or secret-bearing document URLs', () => {
    expect(() => assertSafeDocumentUrl('https://user:password@example.com/document')).toThrow();
    expect(() => assertSafeDocumentUrl('https://example.com/document?access_token=secret')).toThrow();
    expect(assertSafeDocumentUrl('https://drive.google.com/file/d/abc/view?usp=sharing')).toBe('https://drive.google.com/file/d/abc/view?usp=sharing');
  });

  it('creates a stable non-reversible URL fingerprint for history metadata', () => {
    expect(urlFingerprint('https://example.com/document')).toHaveLength(16);
    expect(urlFingerprint('https://example.com/document')).toBe(urlFingerprint('https://example.com/document'));
  });
});
