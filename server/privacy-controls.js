import crypto from 'node:crypto';

const SENSITIVE_QUERY_KEYS = new Set([
  'access_token', 'api_key', 'apikey', 'auth', 'authorization', 'code',
  'key', 'password', 'secret', 'sig', 'signature', 'token',
]);

const REDACTION_PATTERNS = [
  { pattern: /\b(?:bearer\s+)?[a-z0-9_-]{24,}\.[a-z0-9._-]{10,}\b/gi, replacement: '[token redigido]' },
  { pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replacement: '[documento redigido]' },
  { pattern: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, replacement: '[e-mail redigido]' },
  { pattern: /(?<!\d)(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}(?!\d)/g, replacement: '[telefone redigido]' },
  { pattern: /https?:\/\/[^\s)]+/gi, replacement: '[URL redigida]' },
];

export function redactForAudit(value) {
  let output = String(value ?? '');
  for (const { pattern, replacement } of REDACTION_PATTERNS) output = output.replace(pattern, replacement);
  return output.slice(0, 1000);
}

export function redactRequestUrl(value) {
  const raw = String(value ?? '');
  const [path, query = ''] = raw.split('?');
  if (!query) return path;
  const params = new URLSearchParams(query);
  for (const key of params.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) params.set(key, '[redacted]');
  }
  return `${path}?${params.toString()}`;
}

export function assertSafeDocumentUrl(value) {
  const parsed = new URL(String(value));
  if (parsed.protocol !== 'https:') throw new Error('Use uma URL HTTPS.');
  if (parsed.username || parsed.password) throw new Error('URLs com credenciais não são permitidas.');
  for (const key of parsed.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) throw new Error('URLs com tokens ou segredos não são permitidas.');
  }
  return parsed.toString();
}

export function urlFingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}
