import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import express from "express";
import compression from "compression";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";
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
  getUserProfile,
  listUsers,
  resetUserPassword,
  updateUser,
} from "./users.js";
import { createExcelReport, createPdfReport } from "./reports.js";

const statuses = Object.keys(STATUS_LABELS);
const initialStatuses = statuses.filter(
  (status) => !["REGISTRADO", "CANCELADO"].includes(status),
);
const transitionStatuses = statuses.filter((status) => status !== "CANCELADO");
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
const typeCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    prefix: z
      .string()
      .trim()
      .min(1)
      .max(8)
      .regex(/^[A-Za-z0-9-]+$/),
    digits: z.coerce.number().int().min(3).max(6),
  })
  .strict();
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
    status: z.enum(initialStatuses).default("ENVIADO"),
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
  responsibleUserId: z.string().min(1).optional(),
});
const documentLinkSchema = z.object({
  url: z.string().trim().url().max(2000).refine((value) => new URL(value).protocol === "https:", "Use uma URL HTTPS."),
}).strict();
const documentLinkUpdateSchema = documentLinkSchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos uma alteração.");
const statusSchema = z.object({ status: z.enum(transitionStatuses) });
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

function getLinkProvider(value) {
  const hostname = new URL(value).hostname.toLowerCase();
  if (hostname === "drive.google.com" || hostname.endsWith(".google.com")) return "Google Drive";
  if (hostname.includes("onedrive") || hostname.endsWith("sharepoint.com")) return "OneDrive/SharePoint";
  if (hostname.includes("dropbox.com")) return "Dropbox";
  return "Externo";
}

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

async function deleteDepartment(prisma, id) {
  try {
    await prisma.$transaction(async (transaction) => {
      const department = await transaction.department.findUnique({
        where: { id },
        select: {
          id: true,
          _count: {
            select: {
              originDocuments: true,
              destinationDocuments: true,
            },
          },
        },
      });
      if (!department) {
        throw new ApiError(
          404,
          "NOT_FOUND",
          "Departamento não encontrado.",
        );
      }
      const references =
        department._count.originDocuments +
        department._count.destinationDocuments;
      if (references > 0) {
        throw new ApiError(
          409,
          "DEPARTMENT_IN_USE",
          "O departamento possui documentos vinculados e não pode ser excluído. Desative-o para impedir novos usos.",
        );
      }
      await transaction.department.delete({ where: { id } });
    });
  } catch (error) {
    if (error?.code === "P2003") {
      throw new ApiError(
        409,
        "DEPARTMENT_IN_USE",
        "O departamento possui documentos vinculados e não pode ser excluído. Desative-o para impedir novos usos.",
      );
    }
    throw error;
  }
}

export function rateLimitClientIp(request, config) {
  const forwarded = config.isRailway
    ? request.get("X-Real-IP")?.trim()
    : "";
  return ipKeyGenerator(isIP(forwarded) ? forwarded : request.ip);
}

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
  app.use(compression({ threshold: 1024 }));
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
    keyGenerator: (request) => rateLimitClientIp(request, config),
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
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      response.json({ data: await listUsers(prisma) });
    }),
  );
  app.get(
    "/api/users/:id/profile",
    asyncRoute(async (request, response) => {
      if (request.user.role !== "admin" && request.user.id !== request.params.id) {
        throw new ApiError(403, "FORBIDDEN", "Você só pode consultar o próprio perfil.");
      }
      response.json({ data: await getUserProfile(prisma, request.params.id) });
    }),
  );
  app.post(
    "/api/users",
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      response
        .status(201)
        .json({ data: await createUser(prisma, request.body) });
    }),
  );
  app.patch(
    "/api/users/:id",
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      response.json({
        data: await updateUser(prisma, request.params.id, request.body),
      });
    }),
  );
  app.post(
    "/api/users/:id/password",
    requireRoles("admin"),
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
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      const input = normalizeType(typeCreateSchema.parse(request.body));
      const type = await prisma.documentType.create({ data: input });
      response.status(201).json({ data: type });
    }),
  );
  app.patch(
    "/api/document-types/:id",
    requireRoles("admin"),
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
        include: {
          _count: {
            select: {
              originDocuments: true,
              destinationDocuments: true,
            },
          },
        },
      });
      response.json({ data: departments });
    }),
  );
  app.post(
    "/api/departments",
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      const department = await prisma.department.create({
        data: normalizeDepartment(departmentCreateSchema.parse(request.body)),
      });
      response.status(201).json({ data: department });
    }),
  );
  app.patch(
    "/api/departments/:id",
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      const department = await prisma.department.update({
        where: { id: request.params.id },
        data: normalizeDepartment(departmentUpdateSchema.parse(request.body)),
      });
      response.json({ data: department });
    }),
  );
  app.delete(
    "/api/departments/:id",
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      await deleteDepartment(prisma, request.params.id);
      response.status(204).end();
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
    requireRoles("admin", "OPERATOR"),
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
    requireRoles("admin", "OPERATOR"),
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
    requireRoles("admin", "OPERATOR"),
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
    requireRoles("admin"),
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

  app.post(
    "/api/documents/:id/links",
    requireRoles("admin", "OPERATOR"),
    asyncRoute(async (request, response) => {
      const input = documentLinkSchema.parse(request.body);
      const document = await prisma.document.findUnique({ where: { id: request.params.id } });
      if (!document) throw new ApiError(404, "NOT_FOUND", "Documento não encontrado.");
      assertCanMutateDocument(request.user, document);
      const link = await prisma.documentLink.create({
        data: { ...input, provider: getLinkProvider(input.url), documentId: document.id, createdById: request.user.id },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      await prisma.documentHistory.create({
        data: { documentId: document.id, action: "UPDATE", description: `Link documental adicionado: ${link.provider}`, detailsJson: JSON.stringify({ linkId: link.id, url: link.url, provider: link.provider }), userId: request.user.id },
      });
      response.status(201).json({ data: link });
    }),
  );
  app.patch(
    "/api/links/:id",
    requireRoles("admin", "OPERATOR"),
    asyncRoute(async (request, response) => {
      const input = documentLinkUpdateSchema.parse(request.body);
      const current = await prisma.documentLink.findUnique({ where: { id: request.params.id }, include: { document: true } });
      if (!current) throw new ApiError(404, "NOT_FOUND", "Link documental não encontrado.");
      assertCanMutateDocument(request.user, current.document);
      const link = await prisma.documentLink.update({
        where: { id: current.id },
        data: { ...input, ...(input.url ? { provider: getLinkProvider(input.url) } : {}) },
        include: { createdBy: { select: { id: true, name: true } } },
      });
      await prisma.documentHistory.create({ data: { documentId: current.documentId, action: "UPDATE", description: `Link documental atualizado: ${link.provider}`, userId: request.user.id } });
      response.json({ data: link });
    }),
  );
  app.delete(
    "/api/links/:id",
    requireRoles("admin", "OPERATOR"),
    asyncRoute(async (request, response) => {
      const current = await prisma.documentLink.findUnique({ where: { id: request.params.id }, include: { document: true } });
      if (!current) throw new ApiError(404, "NOT_FOUND", "Link documental não encontrado.");
      assertCanMutateDocument(request.user, current.document);
      await prisma.documentLink.delete({ where: { id: current.id } });
      await prisma.documentHistory.create({ data: { documentId: current.documentId, action: "UPDATE", description: `Link documental removido: ${current.provider}`, detailsJson: JSON.stringify({ linkId: current.id, url: current.url }), userId: request.user.id } });
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
    requireRoles("admin"),
    asyncRoute(async (request, response) => {
      const format = z
        .enum(["csv", "json", "pdf", "xlsx"])
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
      const metadata = {
        generatedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date()),
        generatedBy: request.user.name,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        typeLabel: query.typeId === "all" ? "Todos" : documents[0]?.type?.name || "Selecionado",
      };
      if (format === "xlsx") {
        response.set("Content-Disposition", `attachment; filename="relatorio-documentos-${stamp}.xlsx"`);
        return response.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").send(createExcelReport(data, metadata));
      }
      if (format === "pdf") {
        response.set("Content-Disposition", `attachment; filename="relatorio-documentos-${stamp}.pdf"`);
        return createPdfReport(data, metadata).then((buffer) => response.type("application/pdf").send(buffer));
      }
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
      app.use(express.static(distPath, {
        index: false,
        maxAge: "1h",
        setHeaders(response, filePath) {
          if (/\\.[a-f0-9]{8,}\\.(?:js|css|woff2?|png|jpg|svg|webp|avif)$/i.test(filePath)) {
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }));
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
