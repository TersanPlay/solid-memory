import { Prisma } from './generated/prisma/client.ts';
import { ApiError } from './api.js';

export const STATUS_LABELS = {
  REGISTRADO: 'Registrado',
  EM_ELABORACAO: 'Em elaboração',
  ENVIADO: 'Enviado',
  RECEBIDO: 'Recebido',
  ARQUIVADO: 'Arquivado',
  CANCELADO: 'Cancelado',
};

export const documentInclude = {
  type: true,
  responsibleUser: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  attachments: { select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true } },
};

export function formatProtocol(type, sequence, year) {
  return `${type.prefix}-${String(sequence).padStart(type.digits, '0')}/${year}`;
}

export function serializeDocument(document) {
  return {
    ...document,
    statusLabel: STATUS_LABELS[document.status],
    origin: document.originCodeSnapshot,
    destination: document.destinationCodeSnapshot || document.destinationNameSnapshot,
    responsible: document.responsibleUser?.name,
  };
}

function canMutateDocument(user, document) {
  return document.status !== 'CANCELADO' && (user.role === 'ADMIN' || (user.role === 'OPERATOR' && document.createdById === user.id));
}

export function assertCanMutateDocument(user, document) {
  if (document.status === 'CANCELADO') {
    throw new ApiError(409, 'CANCELLED_TERMINAL', 'Documentos cancelados não podem ser alterados.');
  }
  if (!canMutateDocument(user, document)) {
    throw new ApiError(403, 'FORBIDDEN', 'Você não pode alterar este documento.');
  }
}

export function documentFilters(query) {
  const filters = [];
  if (query.q?.trim()) {
    const q = query.q.trim();
    filters.push({ OR: [
      { protocol: { contains: q } }, { subject: { contains: q } },
      { originCodeSnapshot: { contains: q } }, { originNameSnapshot: { contains: q } },
      { destinationCodeSnapshot: { contains: q } }, { destinationNameSnapshot: { contains: q } },
      { responsibleUser: { name: { contains: q } } },
    ] });
  }
  if (query.typeId) filters.push({ typeId: query.typeId });
  if (query.status) filters.push({ status: query.status });
  if (query.year) filters.push({ year: Number(query.year) });
  if (query.month) filters.push({ date: { startsWith: `${query.year || new Date().getFullYear()}-${String(query.month).padStart(2, '0')}` } });
  if (query.dateFrom || query.dateTo) filters.push({ date: { ...(query.dateFrom && { gte: query.dateFrom }), ...(query.dateTo && { lte: query.dateTo }) } });
  if (query.originDepartmentId) filters.push({ originDepartmentId: query.originDepartmentId });
  if (query.destinationDepartmentId) filters.push({ destinationDepartmentId: query.destinationDepartmentId });
  return filters.length ? { AND: filters } : {};
}

async function allocateSequence(transaction, typeId, year) {
  const rows = await transaction.$queryRaw(Prisma.sql`
    INSERT INTO "ProtocolSequence" ("typeId", "year", "lastNumber")
    VALUES (${typeId}, ${year}, 1)
    ON CONFLICT ("typeId", "year") DO UPDATE SET "lastNumber" = "lastNumber" + 1
    RETURNING "lastNumber"
  `);
  return Number(rows[0].lastNumber);
}

function isBusy(error) {
  return /SQLITE_BUSY|database is locked/i.test(error?.message || '');
}

export async function createDocument(prisma, input, user) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const documentId = await prisma.$transaction(async (transaction) => {
        const [type, origin, destination] = await Promise.all([
          transaction.documentType.findUnique({ where: { id: input.typeId } }),
          transaction.department.findUnique({ where: { id: input.originDepartmentId } }),
          input.destinationDepartmentId ? transaction.department.findUnique({ where: { id: input.destinationDepartmentId } }) : null,
        ]);
        if (!type?.active) throw new ApiError(400, 'INACTIVE_REFERENCE', 'O tipo documental não está ativo.');
        if (!origin?.active) throw new ApiError(400, 'INACTIVE_REFERENCE', 'O departamento de origem não está ativo.');
        if (input.destinationDepartmentId && !destination?.active) throw new ApiError(400, 'INACTIVE_REFERENCE', 'O departamento de destino não está ativo.');

        const responsibleUserId = user.role === 'OPERATOR' ? user.id : input.responsibleUserId;
        if (!responsibleUserId) throw new ApiError(400, 'RESPONSIBLE_REQUIRED', 'Informe o responsável.');
        const responsible = await transaction.user.findUnique({ where: { id: responsibleUserId } });
        if (!responsible?.active) throw new ApiError(400, 'INACTIVE_REFERENCE', 'O responsável não está ativo.');

        const year = Number(input.date.slice(0, 4));
        const sequence = await allocateSequence(transaction, type.id, year);
        const protocol = formatProtocol(type, sequence, year);
        const document = await transaction.document.create({
          data: {
            protocol, sequence, year, typeId: type.id, date: input.date,
            originDepartmentId: origin.id, originCodeSnapshot: origin.code, originNameSnapshot: origin.name,
            destinationDepartmentId: destination?.id ?? null,
            destinationText: destination ? null : input.destinationText,
            destinationCodeSnapshot: destination?.code ?? null,
            destinationNameSnapshot: destination?.name ?? input.destinationText,
            subject: input.subject.trim(), responsibleUserId, status: input.status,
            notes: input.notes?.trim() || '', createdById: user.id, updatedById: user.id,
            history: { create: { action: 'CREATE', toStatus: input.status, description: 'Documento registrado', userId: user.id } },
          },
          select: { id: true },
        });
        return document.id;
      });
      const document = await prisma.document.findUnique({ where: { id: documentId }, include: documentInclude });
      return serializeDocument(document);
    } catch (error) {
      lastError = error;
      if (!isBusy(error) || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
  if (isBusy(lastError)) throw new ApiError(409, 'SQLITE_BUSY', 'O banco está ocupado. Tente novamente.');
  throw lastError;
}

export async function updateDocument(prisma, id, input, user) {
  const current = await prisma.document.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Documento não encontrado.');
  assertCanMutateDocument(user, current);
  const data = { updatedById: user.id };
  if (input.subject !== undefined) data.subject = input.subject.trim();
  if (input.notes !== undefined) data.notes = input.notes.trim();
  if (input.responsibleUserId !== undefined) {
    if (user.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Somente administradores podem reatribuir documentos.');
    const responsible = await prisma.user.findUnique({ where: { id: input.responsibleUserId } });
    if (!responsible?.active) throw new ApiError(400, 'INACTIVE_REFERENCE', 'O responsável não está ativo.');
    data.responsibleUserId = responsible.id;
  }
  const changes = Object.keys(data).filter((key) => key !== 'updatedById');
  if (!changes.length) throw new ApiError(400, 'NO_CHANGES', 'Nenhuma alteração foi informada.');
  const document = await prisma.document.update({
    where: { id }, data: { ...data, history: { create: { action: 'UPDATE', description: 'Dados do documento atualizados', detailsJson: JSON.stringify({ fields: changes }), userId: user.id } } },
    include: documentInclude,
  });
  return serializeDocument(document);
}

export async function changeStatus(prisma, id, status, user) {
  if (status === 'CANCELADO') throw new ApiError(400, 'USE_CANCEL_ENDPOINT', 'Use a operação de cancelamento.');
  const current = await prisma.document.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Documento não encontrado.');
  assertCanMutateDocument(user, current);
  if (current.status === status) throw new ApiError(409, 'STATUS_UNCHANGED', 'O documento já possui este status.');
  const document = await prisma.document.update({
    where: { id },
    data: { status, updatedById: user.id, history: { create: { action: 'STATUS_CHANGE', fromStatus: current.status, toStatus: status, description: `Status alterado para ${STATUS_LABELS[status]}`, userId: user.id } } },
    include: documentInclude,
  });
  return serializeDocument(document);
}

export async function cancelDocument(prisma, id, user) {
  const current = await prisma.document.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Documento não encontrado.');
  if (current.status === 'CANCELADO') throw new ApiError(409, 'ALREADY_CANCELLED', 'O documento já está cancelado.');
  const document = await prisma.document.update({
    where: { id }, data: { status: 'CANCELADO', cancelledAt: new Date(), updatedById: user.id, history: { create: { action: 'CANCEL', fromStatus: current.status, toStatus: 'CANCELADO', description: 'Documento cancelado; numeração preservada', userId: user.id } } },
    include: documentInclude,
  });
  return serializeDocument(document);
}
