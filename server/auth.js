import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError } from './api.js';

const scrypt = promisify(crypto.scrypt);
export const SESSION_COOKIE = 'folio_session';

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, 64);
  return { hash: Buffer.from(derived).toString('hex'), salt };
}

export async function verifyPassword(password, hash, salt) {
  const candidate = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function readCookies(request) {
  const raw = request.get('Cookie') || '';
  return Object.fromEntries(raw.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? [part, ''] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

export async function issueSession(prisma, response, userId, config) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    expires: expiresAt,
  });
  return expiresAt;
}

export function clearSessionCookie(response, config) {
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' });
}

export function authenticate(prisma, config) {
  return async (request, _response, next) => {
    try {
      const token = readCookies(request)[SESSION_COOKIE];
      if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Autenticação necessária.');
      const tokenHash = hashSessionToken(token);
      const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!session || session.expiresAt <= new Date() || !session.user.active) {
        if (session) await prisma.session.delete({ where: { tokenHash } }).catch(() => undefined);
        throw new ApiError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
      }
      request.sessionTokenHash = tokenHash;
      request.user = session.user;
      if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
        await prisma.session.update({ where: { tokenHash }, data: { lastSeenAt: new Date() } });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRoles(...roles) {
  return (request, _response, next) => roles.includes(request.user?.role)
    ? next()
    : next(new ApiError(403, 'FORBIDDEN', 'Seu perfil não permite esta operação.'));
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
