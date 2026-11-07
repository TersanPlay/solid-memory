export class ApiClientError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0, fields) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

const readCache = new Map();

function cachedGet(path, ttl = 30_000) {
  const now = Date.now();
  const cached = readCache.get(path);
  if (cached && cached.expiresAt > now) return cached.promise;
  const promise = request(path);
  readCache.set(path, { promise, expiresAt: now + ttl });
  promise.catch(() => readCache.delete(path));
  return promise;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = body?.error;
    throw new ApiClientError(error?.message || 'Não foi possível concluir a operação.', error?.code, response.status, error?.fields);
  }
  return body;
}

export const api = {
  get: (path, options = {}) => request(path, options),
  getCached: (path, ttl) => cachedGet(path, ttl),
  clearCache: () => readCache.clear(),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  async download(path, fallbackName) {
    const response = await fetch(`/api${path}`, { credentials: 'same-origin' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiClientError(body.error?.message || 'Não foi possível baixar o arquivo.', body.error?.code, response.status);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export function queryString(values) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : '';
}
