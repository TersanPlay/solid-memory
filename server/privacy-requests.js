import { z } from 'zod';
import crypto from 'node:crypto';
import { ApiError } from './api.js';

export const PRIVACY_REQUEST_TYPES = [
  'ACCESS', 'CORRECTION', 'ANONYMIZATION', 'DELETION', 'PORTABILITY', 'OPPOSITION', 'CONSENT_REVOCATION',
];
export const PRIVACY_REQUEST_STATUSES = ['OPEN', 'IN_REVIEW', 'COMPLETED', 'REJECTED'];

export const privacyRequestCreateSchema = z.object({
  type: z.enum(PRIVACY_REQUEST_TYPES),
  description: z.string().trim().max(2000).default(''),
  subjectUserId: z.string().min(1).optional(),
}).strict();

export const privacyRequestUpdateSchema = z.object({
  status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
  responseNote: z.string().trim().max(4000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'Informe ao menos uma alteração.');

export const publicPrivacyRequestCreateSchema = z.object({
  requesterName: z.string().trim().min(2).max(120),
  requesterEmail: z.string().trim().toLowerCase().pipe(z.email()),
  type: z.enum(PRIVACY_REQUEST_TYPES),
  description: z.string().trim().max(2000).default(''),
}).strict();

function serializeRequest(request) {
  return {
    id: request.id,
    source: request.source || 'AUTHENTICATED',
    publicReference: request.publicReference,
    subjectUserId: request.subjectUserId,
    requesterName: request.requesterName,
    requesterEmail: request.requesterEmail,
    type: request.type,
    status: request.status,
    description: request.description,
    responseNote: request.responseNote,
    dueAt: request.dueAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt,
    ...(request.subjectUser && { subjectUser: { id: request.subjectUser.id, name: request.subjectUser.name, email: request.subjectUser.email } }),
    ...(request.createdBy && { createdBy: { id: request.createdBy.id, name: request.createdBy.name } }),
    ...(request.handledBy && { handledBy: { id: request.handledBy.id, name: request.handledBy.name } }),
    events: request.events || [],
  };
}

const requestInclude = {
  subjectUser: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  handledBy: { select: { id: true, name: true } },
};

export async function createPrivacyRequest(prisma, rawInput, currentUser) {
  const input = privacyRequestCreateSchema.parse(rawInput);
  const subjectUserId = currentUser.role === 'admin' && input.subjectUserId
    ? input.subjectUserId
    : currentUser.id;
  if (subjectUserId !== currentUser.id && currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Você só pode abrir uma solicitação para si mesmo.');
  }
  const subject = await prisma.user.findUnique({ where: { id: subjectUserId }, select: { id: true } });
  if (!subject) throw new ApiError(404, 'NOT_FOUND', 'Usuário titular não encontrado.');
  const dueAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const request = await prisma.dataSubjectRequest.create({
    data: { subjectUserId, createdById: currentUser.id, type: input.type, description: input.description, dueAt },
    include: requestInclude,
  });
  await prisma.privacyRequestEvent.create({ data: { requestId: request.id, source: 'AUTHENTICATED', action: 'CREATED', actorId: currentUser.id } });
  return serializeRequest(request);
}

export async function createPublicPrivacyRequest(prisma, rawInput) {
  const input = publicPrivacyRequestCreateSchema.parse(rawInput);
  const id = `PUB-${crypto.randomUUID()}`;
  const publicReference = `DSAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const dueAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const request = await prisma.publicPrivacyRequest.create({ data: { id, publicReference, ...input, dueAt } });
  await prisma.privacyRequestEvent.create({ data: { requestId: request.id, source: 'PUBLIC', action: 'CREATED', note: 'Solicitação recebida pelo canal público.' } });
  return { reference: publicReference, type: request.type, status: request.status, createdAt: request.createdAt, dueAt: request.dueAt };
}

export async function listPrivacyRequests(prisma, currentUser) {
  const where = currentUser.role === 'admin' ? {} : { subjectUserId: currentUser.id };
  const [requests, publicRequests] = await Promise.all([
    prisma.dataSubjectRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { ...requestInclude, } }),
    currentUser.role === 'admin' ? prisma.publicPrivacyRequest.findMany({ orderBy: { createdAt: 'desc' } }) : [],
  ]);
  const requestIds = [...requests.map((item) => item.id), ...publicRequests.map((item) => item.id)];
  const events = requestIds.length ? await prisma.privacyRequestEvent.findMany({ where: { requestId: { in: requestIds } }, orderBy: { createdAt: 'asc' }, include: { actor: { select: { id: true, name: true } } } }) : [];
  return [...requests.map((item) => serializeRequest({ ...item, source: 'AUTHENTICATED', events: events.filter((event) => event.requestId === item.id) })), ...publicRequests.map((item) => serializeRequest({ ...item, source: 'PUBLIC', events: events.filter((event) => event.requestId === item.id) }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function updatePrivacyRequest(prisma, id, rawInput, currentUser) {
  const input = privacyRequestUpdateSchema.parse(rawInput);
  if (currentUser.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Somente administradores podem tratar solicitações.');
  if (id.startsWith('PUB-')) {
    const current = await prisma.publicPrivacyRequest.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
    const completed = ['COMPLETED', 'REJECTED'].includes(input.status ?? current.status);
    const request = await prisma.publicPrivacyRequest.update({ where: { id }, data: { ...input, ...(completed ? { completedAt: current.completedAt ?? new Date() } : {}) } });
    await prisma.privacyRequestEvent.create({ data: { requestId: id, source: 'PUBLIC', action: input.status ? `STATUS_${input.status}` : 'NOTE_UPDATED', note: input.responseNote || '', actorId: currentUser.id } });
    return serializeRequest({ ...request, source: 'PUBLIC', events: [] });
  }
  const current = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
  const completed = ['COMPLETED', 'REJECTED'].includes(input.status ?? current.status);
  const request = await prisma.dataSubjectRequest.update({
    where: { id },
    data: {
      ...input,
      ...(completed ? { completedAt: current.completedAt ?? new Date(), handledById: currentUser.id } : {}),
      ...(input.status && !completed ? { handledById: currentUser.id } : {}),
    },
    include: requestInclude,
  });
  await prisma.privacyRequestEvent.create({ data: { requestId: id, source: 'AUTHENTICATED', action: input.status ? `STATUS_${input.status}` : 'NOTE_UPDATED', note: input.responseNote || '', actorId: currentUser.id } });
  return serializeRequest(request);
}
