import fs from "node:fs";
import path from "node:path";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { fileTypeFromBuffer } from "file-type";
import helmet from "helmet";
import multer from "multer";
import pinoHttp from "pino-http";
import { z } from "zod";
import {
  ApiError,
  asyncRoute,
  errorHandler,
  notFound,
  originGuard,
  paginated,
  parsePagination,
  requestId,
} from "./api.js";
import {
  authenticate,
  clearSessionCookie,
  issueSession,
  normalizeEmail,
  publicUser,
  readCookies,
  requireRoles,
  SESSION_COOKIE,
  hashSessionToken,
  verifyPassword,
} from "./auth.js";
import {
  cancelDocument,
  changeStatus,
  createDocument,
  documentFilters,
  documentInclude,
  formatProtocol,
  serializeDocument,
  updateDocument,
  assertCanMutateDocument,
  STATUS_LABELS,
} from "./documents.js";
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from "./users.js";
import {
  buildAttachmentStorageKey,
  finalizeStagedAttachmentRemoval,
  normalizeOriginalName,
  readAttachmentFile,
  removeAttachmentFile,
  restoreStagedAttachmentFile,
  stageAttachmentFileRemoval,
  writeAttachmentFile,
} from "./attachment-storage.js";

const statuses = Object.keys(STATUS_LABELS);
const initialStatuses = statuses.filter((status) => status !== "CANCELADO");
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }, "Data inválida.");

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});
const typeCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  prefix: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .regex(/^[A-Za-z0-9-]+$/),
  separator: z.enum(["/", "-"]),
  digits: z.coerce.number().int().min(3).max(6),
});
const typeUpdateSchema = typeCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Informe ao menos uma alteração.",
  );
const departmentCreateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/),
});
const departmentUpdateSchema = departmentCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Informe ao menos uma alteração.",
  );
const documentCreateSchema = z
  .object({
    typeId: z.string().min(1),
    date: dateOnly,
    originDepartmentId: z.string().min(1),
    destinationDepartmentId: z.string().min(1).nullable().optional(),
    destinationText: z.string().trim().min(2).max(160).nullable().optional(),
    subject: z.string().trim().min(3).max(300),
    responsibleUserId: z.string().min(1).optional(),
    status: z.enum(initialStatuses).default("REGISTRADO"),
    notes: z.string().max(4000).optional().default(""),
  })
  .superRefine((value, context) => {
    const internal = Boolean(value.destinationDepartmentId);
    const external = Boolean(value.destinationText);
    if (internal === external)
      context.addIssue({
        code: "custom",
        path: ["destinationDepartmentId"],
        message: "Informe um destino interno ou externo, exclusivamente.",
      });
  });
const documentUpdateSchema = z.object({
  subject: z.string().trim().min(3).max(300).optional(),
  notes: z.string().max(4000).optional(),
  responsibleUserId: z.string().min(1).optional(),
});
const statusSchema = z.object({ status: z.enum(initialStatuses) });
const documentQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    typeId: z.string().min(1).optional(),
    status: z.enum(statuses).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    originDepartmentId: z.string().min(1).optional(),
    destinationDepartmentId: z.string().min(1).optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
    format: z.string().optional(),
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    {
      path: ["dateTo"],
      message: "A data final deve ser igual ou posterior à inicial.",
    },
  );

function normalizeType(input) {
  return {
    ...input,
    name: input.name?.trim(),
    prefix: input.prefix?.trim().toUpperCase(),
  };
}

function normalizeDepartment(input) {
  return {
    ...input,
    name: input.name?.trim(),
    code: input.code?.trim().toUpperCase(),
  };
}

const allowedFiles = new Map([
  ["application/pdf", ["pdf"]],
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ["docx"],
  ],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ["xlsx"],
  ],
]);

export function createApp({ prisma, config }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use(requestId);
  app.use(
    pinoHttp({
      quietReqLogger: true,
      autoLogging: config.nodeEnv !== "test",
      redact: ["req.headers.cookie", "req.headers.authorization"],
      serializers: {
        req: (request) => ({
          id: request.id,
          method: request.method,
          url: request.url,
        }),
        res: (response) => ({ statusCode: response.statusCode }),
      },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(originGuard(config));

  app.get(
    "/api/health",
    asyncRoute(async (_request, response) => {
      await prisma.$queryRawUnsafe("SELECT 1");
      response.json({
        data: {
          status: "ok",
          database: "sqlite",
          timestamp: new Date().toISOString(),
        },
      });
    }),
  );

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde alguns minutos.",
      },
    },
  });
  app.post(
    "/api/auth/login",
    loginLimiter,
    asyncRoute(async (request, response) => {
      const input = loginSchema.parse(request.body);
      const user = await prisma.user.findUnique({
        where: { email: normalizeEmail(input.email) },
      });
      const valid =
        user?.active &&
        (await verifyPassword(
          input.password,
          user.passwordHash,
          user.passwordSalt,
        ));
      if (!valid)
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "E-mail ou senha inválidos.",
        );
      await prisma.session.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
      const expiresAt = await issueSession(prisma, response, user.id, config);
      response.json({ data: { user: publicUser(user), expiresAt } });
    }),
  );

  app.post(
    "/api/auth/logout",
    asyncRoute(async (request, response) => {
      const token = readCookies(request)[SESSION_COOKIE];
      if (token)
        await prisma.session
          .delete({ where: { tokenHash: hashSessionToken(token) } })
          .catch(() => undefined);
      clearSessionCookie(response, config);
      response.status(204).end();
    }),
  );

  const requireAuth = authenticate(prisma, config);
  app.use("/api", requireAuth);

  app.get("/api/auth/me", (request, response) =>
    response.json({ data: publicUser(request.user) }),
  );

  app.get(
    "/api/users",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      response.json({ data: await listUsers(prisma) });
    }),
  );
  app.post(
    "/api/users",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      response
        .status(201)
        .json({ data: await createUser(prisma, request.body) });
    }),
  );
  app.patch(
    "/api/users/:id",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      response.json({
        data: await updateUser(prisma, request.params.id, request.body),
      });
    }),
  );
  app.post(
    "/api/users/:id/password",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      await resetUserPassword(prisma, request.params.id, request.body);
      response.status(204).end();
    }),
  );

  app.get(
    "/api/document-types",
    asyncRoute(async (_request, response) => {
      const types = await prisma.documentType.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { documents: true } } },
      });
      response.json({ data: types });
    }),
  );
  app.post(
    "/api/document-types",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      const input = normalizeType(typeCreateSchema.parse(request.body));
      const type = await prisma.documentType.create({ data: input });
      response.status(201).json({ data: type });
    }),
  );
  app.patch(
    "/api/document-types/:id",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      const input = normalizeType(typeUpdateSchema.parse(request.body));
      const type = await prisma.documentType.update({
        where: { id: request.params.id },
        data: input,
      });
      response.json({ data: type });
    }),
  );

  app.get(
    "/api/departments",
    asyncRoute(async (_request, response) => {
      const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
      });
      response.json({ data: departments });
    }),
  );
  app.post(
    "/api/departments",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      const department = await prisma.department.create({
        data: normalizeDepartment(departmentCreateSchema.parse(request.body)),
      });
      response.status(201).json({ data: department });
    }),
  );
  app.patch(
    "/api/departments/:id",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      const department = await prisma.department.update({
        where: { id: request.params.id },
        data: normalizeDepartment(departmentUpdateSchema.parse(request.body)),
      });
      response.json({ data: department });
    }),
  );

  app.get(
    "/api/protocols/next",
    asyncRoute(async (request, response) => {
      const input = z
        .object({ typeId: z.string().min(1), date: dateOnly })
        .parse(request.query);
      const type = await prisma.documentType.findUnique({
        where: { id: input.typeId },
      });
      if (!type?.active)
        throw new ApiError(
          404,
          "NOT_FOUND",
          "Tipo documental ativo não encontrado.",
        );
      const year = Number(input.date.slice(0, 4));
      const sequence = await prisma.protocolSequence.findUnique({
        where: { typeId_year: { typeId: type.id, year } },
      });
      const next = (sequence?.lastNumber ?? 0) + 1;
      response.json({
        data: {
          protocol: formatProtocol(type, next, year),
          sequence: next,
          year,
          reserved: false,
        },
      });
    }),
  );

  app.get(
    "/api/documents",
    asyncRoute(async (request, response) => {
      const query = documentQuerySchema.parse(request.query);
      const { page, pageSize, skip } = parsePagination(query);
      const where = documentFilters(query);
      const [documents, total] = await prisma.$transaction([
        prisma.document.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }, { protocol: "desc" }],
          include: documentInclude,
        }),
        prisma.document.count({ where }),
      ]);
      response.json(
        paginated(documents.map(serializeDocument), total, page, pageSize),
      );
    }),
  );
  app.post(
    "/api/documents",
    requireRoles("ADMIN", "OPERATOR"),
    asyncRoute(async (request, response) => {
      const input = documentCreateSchema.parse(request.body);
      const document = await createDocument(prisma, input, request.user);
      response.status(201).json({ data: document });
    }),
  );
  app.get(
    "/api/documents/:id",
    asyncRoute(async (request, response) => {
      const document = await prisma.document.findUnique({
        where: { id: request.params.id },
        include: documentInclude,
      });
      if (!document)
        throw new ApiError(404, "NOT_FOUND", "Documento não encontrado.");
      response.json({ data: serializeDocument(document) });
    }),
  );
  app.patch(
    "/api/documents/:id",
    requireRoles("ADMIN", "OPERATOR"),
    asyncRoute(async (request, response) => {
      response.json({
        data: await updateDocument(
          prisma,
          request.params.id,
          documentUpdateSchema.parse(request.body),
          request.user,
        ),
      });
    }),
  );
  app.patch(
    "/api/documents/:id/status",
    requireRoles("ADMIN", "OPERATOR"),
    asyncRoute(async (request, response) => {
      response.json({
        data: await changeStatus(
          prisma,
          request.params.id,
          statusSchema.parse(request.body).status,
          request.user,
        ),
      });
    }),
  );
  app.post(
    "/api/documents/:id/cancel",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      response.json({
        data: await cancelDocument(prisma, request.params.id, request.user),
      });
    }),
  );
  app.get(
    "/api/documents/:id/history",
    asyncRoute(async (request, response) => {
      const history = await prisma.documentHistory.findMany({
        where: { documentId: request.params.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      });
      response.json({ data: history });
    }),
  );

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxAttachmentBytes, files: 1 },
  });
  app.post(
    "/api/documents/:id/attachments",
    requireRoles("ADMIN", "OPERATOR"),
    upload.single("file"),
    asyncRoute(async (request, response) => {
      if (!request.file)
        throw new ApiError(400, "FILE_REQUIRED", "Selecione um arquivo.");
      const document = await prisma.document.findUnique({
        where: { id: request.params.id },
      });
      if (!document)
        throw new ApiError(404, "NOT_FOUND", "Documento não encontrado.");
      assertCanMutateDocument(request.user, document);
      const detected = await fileTypeFromBuffer(request.file.buffer);
      const allowedExtensions = detected && allowedFiles.get(detected.mime);
      const suppliedExtension = path
        .extname(request.file.originalname)
        .slice(1)
        .toLowerCase();
      if (!allowedExtensions?.includes(suppliedExtension))
        throw new ApiError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Formato de arquivo não permitido ou assinatura incompatível.",
        );
      const originalName = normalizeOriginalName(request.file.originalname);
      const storageKey = buildAttachmentStorageKey({
        documentId: document.id,
        originalName,
      });
      await writeAttachmentFile(
        config.attachmentsDir,
        storageKey,
        request.file.buffer,
      );
      let attachment;
      try {
        attachment = await prisma.$transaction(async (transaction) => {
          const created = await transaction.attachment.create({
            data: {
              documentId: document.id,
              originalName,
              mimeType: detected.mime,
              size: request.file.size,
              storageKey,
              uploadedById: request.user.id,
            },
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          });
          await transaction.documentHistory.create({
            data: {
              documentId: document.id,
              action: "ATTACHMENT_ADD",
              description: `Anexo adicionado: ${created.originalName}`,
              userId: request.user.id,
            },
          });
          return created;
        });
      } catch (error) {
        await removeAttachmentFile(config.attachmentsDir, storageKey).catch(
          (cleanupError) =>
            request.log?.error(
              { err: cleanupError, requestId: request.id },
              "attachment rollback cleanup failed",
            ),
        );
        throw error;
      }
      response.status(201).json({ data: attachment });
    }),
  );
  app.get(
    "/api/attachments/:id",
    asyncRoute(async (request, response) => {
      const attachment = await prisma.attachment.findUnique({
        where: { id: request.params.id },
      });
      if (!attachment)
        throw new ApiError(404, "NOT_FOUND", "Anexo não encontrado.");
      response.set({
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.size),
        "Content-Disposition": `attachment; filename="${normalizeOriginalName(attachment.originalName)}"`,
        "Cache-Control": "private, no-store",
      });
      let content;
      if (attachment.storageKey) {
        try {
          content = await readAttachmentFile(
            config.attachmentsDir,
            attachment.storageKey,
          );
        } catch (error) {
          if (error.code === "ENOENT") {
            throw new ApiError(
              500,
              "ATTACHMENT_CONTENT_MISSING",
              "O conteúdo do anexo não foi encontrado no armazenamento.",
            );
          }
          throw error;
        }
      } else if (attachment.content) {
        content = Buffer.from(attachment.content);
      } else {
        throw new ApiError(
          500,
          "ATTACHMENT_CONTENT_MISSING",
          "O conteúdo do anexo não foi encontrado no armazenamento.",
        );
      }
      response.send(content);
    }),
  );
  app.delete(
    "/api/attachments/:id",
    requireRoles("ADMIN", "OPERATOR"),
    asyncRoute(async (request, response) => {
      const current = await prisma.attachment.findUnique({
        where: { id: request.params.id },
        include: { document: true },
      });
      if (!current)
        throw new ApiError(404, "NOT_FOUND", "Anexo não encontrado.");
      assertCanMutateDocument(request.user, current.document);
      const staged = current.storageKey
        ? await stageAttachmentFileRemoval(
            config.attachmentsDir,
            current.storageKey,
          )
        : null;
      try {
        await prisma.$transaction(async (transaction) => {
          const attachment = await transaction.attachment.findUnique({
            where: { id: request.params.id },
            include: { document: true },
          });
          if (!attachment)
            throw new ApiError(404, "NOT_FOUND", "Anexo não encontrado.");
          assertCanMutateDocument(request.user, attachment.document);
          const audit = {
            attachmentId: attachment.id,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            size: attachment.size,
            uploadedById: attachment.uploadedById,
            uploadedAt: attachment.createdAt.toISOString(),
          };
          await transaction.attachment.delete({
            where: { id: attachment.id },
          });
          await transaction.document.update({
            where: { id: attachment.documentId },
            data: { updatedById: request.user.id },
          });
          await transaction.documentHistory.create({
            data: {
              documentId: attachment.documentId,
              action: "ATTACHMENT_REMOVE",
              description: `Anexo removido: ${attachment.originalName}`,
              detailsJson: JSON.stringify(audit),
              userId: request.user.id,
            },
          });
        });
      } catch (error) {
        await restoreStagedAttachmentFile(staged).catch((restoreError) =>
          request.log?.error(
            { err: restoreError, requestId: request.id },
            "attachment restore failed",
          ),
        );
        throw error;
      }
      await finalizeStagedAttachmentRemoval(staged).catch((cleanupError) =>
        request.log?.error(
          { err: cleanupError, requestId: request.id },
          "attachment file cleanup failed",
        ),
      );
      response.status(204).end();
    }),
  );

  app.get(
    "/api/dashboard",
    asyncRoute(async (request, response) => {
      const year =
        Number.parseInt(request.query.year, 10) || new Date().getFullYear();
      const month = String(
        request.query.month || new Date().getMonth() + 1,
      ).padStart(2, "0");
      const [total, yearTotal, monthTotal, statusGroups, typeGroups, recent] =
        await Promise.all([
          prisma.document.count(),
          prisma.document.count({ where: { year } }),
          prisma.document.count({
            where: { date: { startsWith: `${year}-${month}` } },
          }),
          prisma.document.groupBy({ by: ["status"], _count: { _all: true } }),
          prisma.document.groupBy({ by: ["typeId"], _count: { _all: true } }),
          prisma.document.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: documentInclude,
          }),
        ]);
      response.json({
        data: {
          total,
          year,
          yearTotal,
          month,
          monthTotal,
          byStatus: Object.fromEntries(
            statusGroups.map((item) => [item.status, item._count._all]),
          ),
          byType: Object.fromEntries(
            typeGroups.map((item) => [item.typeId, item._count._all]),
          ),
          recent: recent.map(serializeDocument),
        },
      });
    }),
  );

  app.get(
    "/api/activity",
    asyncRoute(async (request, response) => {
      const { page, pageSize, skip } = parsePagination(request.query);
      const [events, total] = await prisma.$transaction([
        prisma.documentHistory.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
            document: { select: { id: true, protocol: true } },
          },
        }),
        prisma.documentHistory.count(),
      ]);
      response.json(paginated(events, total, page, pageSize));
    }),
  );

  app.get(
    "/api/reports/documents",
    requireRoles("ADMIN"),
    asyncRoute(async (request, response) => {
      const format = z
        .enum(["csv", "json"])
        .parse(request.query.format || "csv");
      const query = documentQuerySchema.parse(request.query);
      const documents = await prisma.document.findMany({
        where: documentFilters(query),
        orderBy: { createdAt: "desc" },
        include: documentInclude,
      });
      const data = documents
        .map(serializeDocument)
        .map((document) => ({
          protocol: document.protocol,
          type: document.type.name,
          date: document.date,
          origin: document.origin,
          destination: document.destination,
          subject: document.subject,
          responsible: document.responsible,
          status: document.statusLabel,
        }));
      const stamp = new Date().toISOString().slice(0, 10);
      response.set(
        "Content-Disposition",
        `attachment; filename="relatorio-documentos-${stamp}.${format}"`,
      );
      if (format === "json")
        return response
          .type("application/json")
          .send(JSON.stringify(data, null, 2));
      const safe = (value) => {
        const text = String(value ?? "");
        const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${protectedText.replaceAll('"', '""')}"`;
      };
      const rows = [
        [
          "Protocolo",
          "Tipo",
          "Data",
          "Origem",
          "Destino",
          "Assunto",
          "Responsável",
          "Status",
        ],
        ...data.map(Object.values),
      ];
      return response
        .type("text/csv; charset=utf-8")
        .send(`\ufeff${rows.map((row) => row.map(safe).join(";")).join("\n")}`);
    }),
  );

  if (config.isProduction) {
    const distPath = path.join(config.rootDir, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { index: false, maxAge: "1h" }));
      app.use((request, response, next) =>
        request.method === "GET" && !request.path.startsWith("/api/")
          ? response.sendFile(path.join(distPath, "index.html"))
          : next(),
      );
    }
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
