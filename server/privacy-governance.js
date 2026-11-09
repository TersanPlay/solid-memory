import { z } from "zod";
import { ApiError } from "./api.js";

export const RETENTION_ENTITY_OPTIONS = [
  ["User", "Contas de usuários"],
  ["Session", "Sessões"],
  ["Document", "Protocolos e documentos"],
  ["Attachment", "Anexos"],
  ["DocumentHistory", "Histórico funcional"],
  ["DataSubjectRequest", "Solicitações de titulares"],
  ["PrivacyRequestMessage", "Mensagens internas"],
  ["PrivacyRequestDelivery", "Entregas de portabilidade"],
  ["Export", "Exportações administrativas"],
];

export const RETENTION_ACTIONS = [
  "HARD_DELETE",
  "ANONYMIZE",
  "CRYPTO_SHRED",
  "BLOCK_AND_RETAIN",
];

export const PRIVACY_REQUEST_TYPES = [
  ["ACCESS", "Acesso"], ["CORRECTION", "Correção"], ["ANONYMIZATION", "Anonimização"],
  ["DELETION", "Eliminação"], ["PORTABILITY", "Portabilidade"], ["OPPOSITION", "Oposição"],
  ["CONSENT_REVOCATION", "Revogação de consentimento"],
];

export const PRIVACY_SETTING_DEFAULTS = {
  DSAR_RESPONSE_DAYS: "15",
  PORTABILITY_LINK_HOURS: "48",
};

const entityKeys = RETENTION_ENTITY_OPTIONS.map(([key]) => key);

const retentionRuleFields = {
  entityKey: z.enum(entityKeys),
  label: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(5).max(300),
  retentionMonths: z.coerce.number().int().min(1).max(1200),
  legalBasis: z.string().trim().min(3).max(300),
  postAction: z.enum(RETENTION_ACTIONS),
  triggeredBy: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(1000).default(""),
};

export const retentionRuleCreateSchema = z.object(retentionRuleFields).strict();
export const retentionRuleUpdateSchema = retentionRuleCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo.");

export const privacySettingsSchema = z.object({
  DSAR_RESPONSE_DAYS: z.coerce.number().int().min(1).max(365),
  PORTABILITY_LINK_HOURS: z.coerce.number().int().min(1).max(720),
}).strict();

export const privacyRequestRetentionLimitSchema = z.object({
  maxRetentionDays: z.coerce.number().int().min(1).max(3650),
  notes: z.string().trim().max(1000).default(""),
  active: z.boolean().optional(),
}).strict();

function settingNumber(settings, key, fallback) {
  const value = Number(settings.find((setting) => setting.key === key)?.value ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : Number(fallback);
}

async function ensureDefaultSettings(prisma) {
  const existing = await prisma.privacySetting.findMany({
    where: { key: { in: Object.keys(PRIVACY_SETTING_DEFAULTS) } },
  });
  const existingKeys = new Set(existing.map((setting) => setting.key));
  await Promise.all(Object.entries(PRIVACY_SETTING_DEFAULTS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => prisma.privacySetting.create({ data: { key, value } })));
}

export async function getPrivacyGovernance(prisma) {
  await ensureDefaultSettings(prisma);
  const [rules, settings] = await Promise.all([
    prisma.retentionRule.findMany({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }] }),
    prisma.privacySetting.findMany({ where: { key: { in: Object.keys(PRIVACY_SETTING_DEFAULTS) } } }),
  ]);
  const requestLimits = await prisma.privacyRequestRetentionLimit.findMany({ orderBy: { requestType: "asc" } });
  return {
    rules,
    settings: {
      DSAR_RESPONSE_DAYS: settingNumber(settings, "DSAR_RESPONSE_DAYS", PRIVACY_SETTING_DEFAULTS.DSAR_RESPONSE_DAYS),
      PORTABILITY_LINK_HOURS: settingNumber(settings, "PORTABILITY_LINK_HOURS", PRIVACY_SETTING_DEFAULTS.PORTABILITY_LINK_HOURS),
    },
    requestLimits,
    automaticErasure: {
      enabled: false,
      reason: "A aplicação apenas cadastra a regra. A execução depende de política institucional aprovada e rotina operacional revisada.",
    },
  };
}

export async function updatePrivacyRequestRetentionLimit(prisma, requestType, input, user) {
  if (!PRIVACY_REQUEST_TYPES.some(([key]) => key === requestType)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Tipo de solicitação inválido.");
  }
  const data = privacyRequestRetentionLimitSchema.parse(input);
  return prisma.privacyRequestRetentionLimit.upsert({
    where: { requestType },
    create: { requestType, maxRetentionDays: data.maxRetentionDays, notes: data.notes, active: data.active ?? true, updatedById: user.id },
    update: { maxRetentionDays: data.maxRetentionDays, notes: data.notes, ...(data.active === undefined ? {} : { active: data.active }), updatedById: user.id },
  });
}

export async function createRetentionRule(prisma, input, user) {
  const data = retentionRuleCreateSchema.parse(input);
  return prisma.retentionRule.create({ data: { ...data, createdById: user.id, updatedById: user.id } });
}

export async function updateRetentionRule(prisma, id, input, user) {
  const data = retentionRuleUpdateSchema.parse(input);
  try {
    return await prisma.retentionRule.update({ where: { id }, data: { ...data, updatedById: user.id } });
  } catch (error) {
    if (error?.code === "P2025") throw new ApiError(404, "NOT_FOUND", "Regra de retenção não encontrada.");
    throw error;
  }
}

export async function updatePrivacySettings(prisma, input, user) {
  const data = privacySettingsSchema.parse(input);
  await Promise.all(Object.entries(data).map(([key, value]) => prisma.privacySetting.upsert({
    where: { key },
    create: { key, value: String(value), updatedById: user.id },
    update: { value: String(value), updatedById: user.id },
  })));
  return getPrivacyGovernance(prisma);
}

export async function getPrivacySettingNumber(prisma, key, fallback) {
  const setting = await prisma.privacySetting.findUnique({ where: { key } });
  const value = Number(setting?.value ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function runPrivacyGovernanceDiagnostics(prisma) {
  const startedAt = Date.now();
  const checks = [];
  const addCheck = async (id, label, run) => {
    const checkStartedAt = Date.now();
    try {
      const result = await run();
      checks.push({ id, label, status: result.ok ? "PASS" : "WARN", detail: result.detail, durationMs: Date.now() - checkStartedAt });
    } catch (error) {
      checks.push({ id, label, status: "FAIL", detail: error?.message || "Falha inesperada na verificação.", durationMs: Date.now() - checkStartedAt });
    }
  };

  await addCheck("database", "Banco de governança acessível", async () => {
    await prisma.privacySetting.count();
    await prisma.retentionRule.count();
    return { ok: true, detail: "Tabelas de configurações e regras respondem normalmente." };
  });
  // O diagnóstico é deliberadamente somente leitura: não inicializa defaults,
  // não cria regras e não altera o estado da governança.
  const [rules, settings, requestLimits] = await Promise.all([
    prisma.retentionRule.findMany({ orderBy: [{ active: "desc" }, { updatedAt: "desc" }] }),
    prisma.privacySetting.findMany({ where: { key: { in: Object.keys(PRIVACY_SETTING_DEFAULTS) } } }),
    prisma.privacyRequestRetentionLimit.findMany({ orderBy: { requestType: "asc" } }),
  ]);
  const governance = {
    rules,
    settings: {
      DSAR_RESPONSE_DAYS: settingNumber(settings, "DSAR_RESPONSE_DAYS", PRIVACY_SETTING_DEFAULTS.DSAR_RESPONSE_DAYS),
      PORTABILITY_LINK_HOURS: settingNumber(settings, "PORTABILITY_LINK_HOURS", PRIVACY_SETTING_DEFAULTS.PORTABILITY_LINK_HOURS),
    },
    requestLimits,
    automaticErasure: { enabled: false },
  };
  await addCheck("objects", "Objetos de dados com regras", async () => {
    const configured = new Set(governance.rules.filter((rule) => rule.active).map((rule) => rule.entityKey));
    const missing = RETENTION_ENTITY_OPTIONS.map(([key]) => key).filter((key) => !configured.has(key));
    return { ok: missing.length === 0, detail: missing.length ? `Sem regra ativa: ${missing.join(", ")}.` : `${RETENTION_ENTITY_OPTIONS.length} objetos possuem regra ativa.` };
  });
  await addCheck("rule-values", "Prazos e ações válidos", async () => {
    const invalid = governance.rules.filter((rule) => rule.retentionMonths < 1 || rule.retentionMonths > 1200 || !RETENTION_ACTIONS.includes(rule.postAction));
    return { ok: invalid.length === 0, detail: invalid.length ? `${invalid.length} regra(s) possuem valores inválidos.` : "Todos os prazos e ações estão dentro dos valores permitidos." };
  });
  await addCheck("settings", "Parâmetros operacionais válidos", async () => {
    const valid = governance.settings.DSAR_RESPONSE_DAYS >= 1 && governance.settings.DSAR_RESPONSE_DAYS <= 365 && governance.settings.PORTABILITY_LINK_HOURS >= 1 && governance.settings.PORTABILITY_LINK_HOURS <= 720;
    return { ok: valid, detail: valid ? `DSAR: ${governance.settings.DSAR_RESPONSE_DAYS} dias · portabilidade: ${governance.settings.PORTABILITY_LINK_HOURS} horas.` : "Os parâmetros estão fora dos limites da API." };
  });
  await addCheck("request-limits", "Limites por tipo de solicitação", async () => {
    const knownTypes = new Set(PRIVACY_REQUEST_TYPES.map(([key]) => key));
    const invalid = governance.requestLimits.filter((limit) => !knownTypes.has(limit.requestType) || limit.maxRetentionDays < 1 || limit.maxRetentionDays > 3650);
    return { ok: invalid.length === 0, detail: invalid.length ? `${invalid.length} limite(s) possuem valores inválidos.` : `${governance.requestLimits.length} limite(s) institucionais cadastrados; ausências não são tratadas como prazo legal.` };
  });
  await addCheck("automatic-erasure", "Exclusão automática desativada", async () => ({ ok: governance.automaticErasure.enabled === false, detail: governance.automaticErasure.enabled === false ? "Nenhuma ação destrutiva é executada por este diagnóstico." : "A execução automática está ativa." }));

  return { ranAt: new Date().toISOString(), durationMs: Date.now() - startedAt, passed: checks.filter((check) => check.status === "PASS").length, warnings: checks.filter((check) => check.status === "WARN").length, failed: checks.filter((check) => check.status === "FAIL").length, checks };
}
