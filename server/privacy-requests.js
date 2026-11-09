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
  subjectUserId: z.string().min(1).optional(),
  identityVerified: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'Informe ao menos uma alteração.');

export const privacyDeliverySchema = z.object({
  channel: z.enum(['LINK', 'EMAIL']).default('LINK'),
}).strict();

export const privacyMessageSchema = z.object({
  body: z.string().trim().min(1, 'Escreva uma mensagem.').max(4000),
}).strict();

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
    subjectUserId: request.subjectUserId,
    identityVerifiedAt: request.identityVerifiedAt,
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
    const { identityVerified, subjectUserId, ...statusInput } = input;
    if (subjectUserId) {
      const subject = await prisma.user.findUnique({ where: { id: subjectUserId }, select: { id: true } });
      if (!subject) throw new ApiError(404, 'NOT_FOUND', 'Usuário titular não encontrado.');
    }
    const request = await prisma.publicPrivacyRequest.update({ where: { id }, data: {
      ...statusInput,
      ...(subjectUserId ? { subjectUserId } : {}),
      ...(identityVerified ? { identityVerifiedAt: new Date(), identityVerifiedById: currentUser.id } : {}),
      ...(completed ? { completedAt: current.completedAt ?? new Date() } : {}),
    } });
    await prisma.privacyRequestEvent.create({ data: { requestId: id, source: 'PUBLIC', action: input.status ? `STATUS_${input.status}` : 'NOTE_UPDATED', note: input.responseNote || '', actorId: currentUser.id } });
    return serializeRequest({ ...request, source: 'PUBLIC', events: [] });
  }
  const current = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
  const { identityVerified: _identityVerified, subjectUserId: _subjectUserId, ...statusInput } = input;
  const completed = ['COMPLETED', 'REJECTED'].includes(statusInput.status ?? current.status);
  const request = await prisma.dataSubjectRequest.update({
    where: { id },
    data: {
      ...statusInput,
      ...(completed ? { completedAt: current.completedAt ?? new Date(), handledById: currentUser.id } : {}),
      ...(statusInput.status && !completed ? { handledById: currentUser.id } : {}),
    },
    include: requestInclude,
  });
  await prisma.privacyRequestEvent.create({ data: { requestId: id, source: 'AUTHENTICATED', action: statusInput.status ? `STATUS_${statusInput.status}` : 'NOTE_UPDATED', note: statusInput.responseNote || '', actorId: currentUser.id } });
  return serializeRequest(request);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function resolveRequestSubject(prisma, id) {
  if (id.startsWith('PUB-')) {
    const request = await prisma.publicPrivacyRequest.findUnique({ where: { id } });
    if (!request) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
    if (!request.subjectUserId || !request.identityVerifiedAt) {
      throw new ApiError(409, 'IDENTITY_NOT_VERIFIED', 'Valide a identidade e associe o pedido a um usuário antes de gerar a portabilidade.');
    }
    return { request, source: 'PUBLIC', subjectUserId: request.subjectUserId, recipientEmail: request.requesterEmail };
  }
  const request = await prisma.dataSubjectRequest.findUnique({ where: { id }, include: { subjectUser: { select: { email: true } } } });
  if (!request) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
  return { request, source: 'AUTHENTICATED', subjectUserId: request.subjectUserId, recipientEmail: request.subjectUser.email };
}

async function buildPortableBundle(prisma, subjectUserId, request) {
  const user = await prisma.user.findUnique({ where: { id: subjectUserId }, select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Usuário titular não encontrado.');
  const [documents, histories] = await Promise.all([
    prisma.document.findMany({
      where: { OR: [{ responsibleUserId: subjectUserId }, { createdById: subjectUserId }, { updatedById: subjectUserId }] },
      orderBy: { createdAt: 'asc' },
      select: { id: true, protocol: true, date: true, subject: true, status: true, notes: true, createdAt: true, updatedAt: true, links: { select: { url: true, provider: true, createdAt: true } } },
    }),
    prisma.documentHistory.findMany({ where: { userId: subjectUserId }, orderBy: { createdAt: 'asc' }, select: { documentId: true, action: true, fromStatus: true, toStatus: true, description: true, createdAt: true } }),
  ]);
  return {
    schemaVersion: 'memorydoc-portable-v1',
    generatedAt: new Date().toISOString(),
    request: { id: request.id, type: request.type, createdAt: request.createdAt },
    subject: user,
    data: { documents, documentHistory: histories },
    exclusions: ['Senhas, tokens de sessão e credenciais não são exportados.', 'Conteúdo de links HTTPS externos não é acessado nem incluído.', 'Anexos físicos não são disponibilizados pelo MemoryDoc.'],
  };
}

export async function createPrivacyDelivery(prisma, id, rawInput, currentUser) {
  if (currentUser.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Somente administradores podem gerar entregas.');
  const input = privacyDeliverySchema.parse(rawInput ?? {});
  const { request, source, subjectUserId, recipientEmail } = await resolveRequestSubject(prisma, id);
  if (request.type !== 'PORTABILITY') throw new ApiError(409, 'INVALID_REQUEST_TYPE', 'A entrega estruturada está disponível somente para portabilidade.');
  const bundle = await buildPortableBundle(prisma, subjectUserId, request);
  const payload = JSON.stringify(bundle);
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const delivery = await prisma.privacyRequestDelivery.create({ data: { requestId: id, source, format: 'json', tokenHash: sha256(rawToken), recipientEmail, bundleHash: sha256(payload), expiresAt, createdById: currentUser.id } });
  await prisma.privacyRequestEvent.create({ data: { requestId: id, source, action: input.channel === 'EMAIL' ? 'DELIVERY_EMAIL_PREPARED' : 'DELIVERY_LINK_GENERATED', note: 'Entrega estruturada criada; envio automático depende de provedor de e-mail configurado.', actorId: currentUser.id } });
  return { id: delivery.id, channel: input.channel, recipientEmail, expiresAt, bundleHash: delivery.bundleHash, downloadPath: `/api/privacy-deliveries/${delivery.id}/download?token=${encodeURIComponent(rawToken)}`, emailConfigured: false };
}

export async function downloadPrivacyDelivery(prisma, id, rawToken) {
  if (!rawToken || rawToken.length < 32) throw new ApiError(404, 'NOT_FOUND', 'Entrega não encontrada.');
  const delivery = await prisma.privacyRequestDelivery.findUnique({ where: { id } });
  if (!delivery || delivery.tokenHash !== sha256(rawToken)) throw new ApiError(404, 'NOT_FOUND', 'Entrega não encontrada.');
  if (delivery.downloadedAt || delivery.expiresAt <= new Date()) throw new ApiError(410, 'DELIVERY_EXPIRED', 'Este link de entrega expirou ou já foi utilizado.');
  const { request, subjectUserId } = await resolveRequestSubject(prisma, delivery.requestId);
  const bundle = await buildPortableBundle(prisma, subjectUserId, request);
  const payload = JSON.stringify(bundle, null, 2);
  const claimed = await prisma.privacyRequestDelivery.updateMany({ where: { id, downloadedAt: null, expiresAt: { gt: new Date() } }, data: { downloadedAt: new Date() } });
  if (claimed.count !== 1) throw new ApiError(410, 'DELIVERY_EXPIRED', 'Este link de entrega expirou ou já foi utilizado.');
  await prisma.privacyRequestEvent.create({ data: { requestId: delivery.requestId, source: delivery.source, action: 'DELIVERY_DOWNLOADED', note: 'Pacote estruturado baixado por link temporário.', actorId: null } });
  return { payload, filename: `memorydoc-portabilidade-${delivery.id}.json` };
}

async function resolveMessageRequest(prisma, id, currentUser) {
  if (id.startsWith('PUB-')) {
    const request = await prisma.publicPrivacyRequest.findUnique({ where: { id } });
    if (!request) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
    if (currentUser.role !== 'admin' && request.subjectUserId !== currentUser.id) throw new ApiError(403, 'FORBIDDEN', 'Você só pode consultar a conversa dos seus pedidos.');
    return { request, source: 'PUBLIC', subjectUserId: request.subjectUserId, creatorId: null };
  }
  const request = await prisma.dataSubjectRequest.findUnique({ where: { id } });
  if (!request) throw new ApiError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
  if (currentUser.role !== 'admin' && request.subjectUserId !== currentUser.id) throw new ApiError(403, 'FORBIDDEN', 'Você só pode consultar a conversa dos seus pedidos.');
  return { request, source: 'AUTHENTICATED', subjectUserId: request.subjectUserId, creatorId: request.createdById };
}

export async function listPrivacyRequestMessages(prisma, id, currentUser) {
  const { subjectUserId } = await resolveMessageRequest(prisma, id, currentUser);
  const messages = await prisma.privacyRequestMessage.findMany({ where: { requestId: id }, orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true, email: true, role: true } } } });
  return messages.map((message) => ({ id: message.id, requestId: message.requestId, sender: message.sender, recipientScope: message.recipientScope, body: message.body, createdAt: message.createdAt, isMine: message.senderId === currentUser.id, subjectUserId }));
}

export async function createPrivacyRequestMessage(prisma, id, rawInput, currentUser) {
  const input = privacyMessageSchema.parse(rawInput);
  const { request, source, subjectUserId } = await resolveMessageRequest(prisma, id, currentUser);
  const isAdmin = currentUser.role === 'admin';
  if (isAdmin && !subjectUserId) throw new ApiError(409, 'IDENTITY_NOT_VERIFIED', 'Associe e valide o titular antes de enviar mensagens.');
  if (!isAdmin && request.type === 'PORTABILITY' && !subjectUserId) throw new ApiError(409, 'IDENTITY_NOT_VERIFIED', 'Este pedido ainda não está associado a um titular validado.');
  const message = await prisma.privacyRequestMessage.create({ data: { requestId: id, source, senderId: currentUser.id, recipientUserId: isAdmin ? subjectUserId : null, recipientScope: isAdmin ? 'SUBJECT' : 'ADMIN', body: input.body }, include: { sender: { select: { id: true, name: true, email: true, role: true } } } });
  await prisma.privacyRequestEvent.create({ data: { requestId: id, source, action: isAdmin ? 'MESSAGE_SENT_TO_SUBJECT' : 'MESSAGE_SENT_TO_ADMIN', note: 'Mensagem interna enviada na solicitação.', actorId: currentUser.id } });
  return { id: message.id, requestId: id, sender: message.sender, recipientScope: message.recipientScope, body: message.body, createdAt: message.createdAt, isMine: true };
}
