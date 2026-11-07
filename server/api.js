import crypto from 'node:crypto';
import { Prisma } from './generated/prisma/client.ts';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const asyncRoute = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export function requestId(request, response, next) {
  request.id = request.get('X-Request-Id') || crypto.randomUUID();
  response.set('X-Request-Id', request.id);
  next();
}

export function originGuard(config) {
  return (request, _response, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
    const origin = request.get('Origin');
    if (!origin) return next();

    const forwardedHost = request.get('X-Forwarded-Host');
    const expectedHost = forwardedHost || request.get('Host');
    try {
      const originUrl = new URL(origin);
      const loopbackDevelopment = !config.isProduction && ['127.0.0.1', 'localhost', '::1'].includes(originUrl.hostname);
      if (originUrl.host !== expectedHost && !loopbackDevelopment) {
        return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origem da requisição não autorizada.'));
      }
    } catch {
      return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origem da requisição inválida.'));
    }
    return next();
  };
}

export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginated(data, total, page, pageSize) {
  return { data, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

export function notFound(_request, _response, next) {
  next(new ApiError(404, 'NOT_FOUND', 'Recurso não encontrado.'));
}

export function errorHandler(error, request, response, _next) {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'body', issue.message]));
    return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verifique os dados informados.', fields } });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return response.status(409).json({ error: { code: 'CONFLICT', message: 'Já existe um registro com os mesmos dados únicos.' } });
    }
    if (error.code === 'P2025') {
      return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registro não encontrado.' } });
    }
  }
  if (error instanceof ApiError) {
    return response.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) } });
  }

  request.log?.error({ err: error, requestId: request.id }, 'request failed');
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' } });
}
