import { z } from 'zod';
import { ApiError } from './api.js';
import { hashPassword, normalizeEmail, publicUser } from './auth.js';

export const USER_ROLES = ['admin', 'OPERATOR', 'VIEWER'];

const normalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: normalizedEmailSchema,
  password: z.string().min(10).max(200),
  role: z.enum(USER_ROLES).default('VIEWER'),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: normalizedEmailSchema.optional(),
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Informe ao menos uma alteração.');

export const passwordSchema = z.object({ password: z.string().min(10).max(200) });

export async function listUsers(prisma) {
  const users = await prisma.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return users.map(publicUser);
}

export async function getUserProfile(prisma, target) {
  const user = await findUserByTarget(prisma, target);
  const [documents, history, createdDocuments, responsibleDocuments] = await prisma.$transaction([
    prisma.document.findMany({
      where: { OR: [{ createdById: user.id }, { responsibleUserId: user.id }] },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        protocol: true,
        subject: true,
        status: true,
        date: true,
        updatedAt: true,
        createdById: true,
      },
    }),
    prisma.documentHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        action: true,
        description: true,
        createdAt: true,
        document: { select: { id: true, protocol: true } },
      },
    }),
    prisma.document.count({ where: { createdById: user.id } }),
    prisma.document.count({ where: { responsibleUserId: user.id } }),
  ]);

  return {
    user: publicUser(user),
    metrics: { createdDocuments, responsibleDocuments, activityEntries: await prisma.documentHistory.count({ where: { userId: user.id } }) },
    documents,
    history,
  };
}

export async function findUserByTarget(prisma, target) {
  const value = String(target || '').trim();
  if (!value) throw new ApiError(400, 'USER_TARGET_REQUIRED', 'Informe o ID ou e-mail do usuário.');
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: value }, { email: normalizeEmail(value) }] },
  });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado.');
  return user;
}

export async function createUser(prisma, rawInput) {
  const input = userCreateSchema.parse(rawInput);
  const password = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      passwordHash: password.hash,
      passwordSalt: password.salt,
      role: input.role,
    },
  });
  return publicUser(user);
}

export async function updateUser(prisma, target, rawInput) {
  const input = userUpdateSchema.parse(rawInput);
  return prisma.$transaction(async (transaction) => {
    const current = await findUserByTarget(transaction, target);
    const removesAdmin = current.role === 'admin'
      && current.active
      && ((input.role && input.role !== 'admin') || input.active === false);
    if (removesAdmin) {
      const activeAdminCount = await transaction.user.count({ where: { role: 'admin', active: true } });
      if (activeAdminCount <= 1) {
        throw new ApiError(409, 'LAST_ADMIN', 'O último administrador ativo não pode ser desativado ou rebaixado.');
      }
    }

    const user = await transaction.user.update({
      where: { id: current.id },
      data: { ...input, ...(input.email && { email: normalizeEmail(input.email) }) },
    });
    if (input.active === false) await transaction.session.deleteMany({ where: { userId: user.id } });
    return publicUser(user);
  });
}

export async function resetUserPassword(prisma, target, rawInput) {
  const input = passwordSchema.parse(rawInput);
  const password = await hashPassword(input.password);
  return prisma.$transaction(async (transaction) => {
    const current = await findUserByTarget(transaction, target);
    const user = await transaction.user.update({
      where: { id: current.id },
      data: { passwordHash: password.hash, passwordSalt: password.salt },
    });
    await transaction.session.deleteMany({ where: { userId: current.id } });
    return publicUser(user);
  });
}
