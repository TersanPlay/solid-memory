import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  FileClock,
  Pencil,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { api } from "../api.js";
import BezelCard from "../components/shared/BezelCard";
import Eyebrow from "../components/shared/Eyebrow";
import PageHeader from "../components/shared/PageHeader";
import PrimaryButton from "../components/shared/PrimaryButton";
import { SoftSelect } from "../components/FormControls.jsx";

const entityOptions = [
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
const actionOptions = [
  ["BLOCK_AND_RETAIN", "Bloquear e manter"],
  ["ANONYMIZE", "Anonimizar"],
  ["CRYPTO_SHRED", "Destruir chave criptográfica"],
  ["HARD_DELETE", "Excluir definitivamente"],
];
const emptyRule = {
  entityKey: "Document",
  label: "",
  purpose: "",
  retentionMonths: "60",
  legalBasis: "",
  postAction: "BLOCK_AND_RETAIN",
  triggeredBy: "",
  notes: "",
};
const actionLabel = Object.fromEntries(actionOptions);
const entityLabel = Object.fromEntries(entityOptions);
const requestTypeOptions = [
  ["ACCESS", "Acesso"],
  ["CORRECTION", "Correção"],
  ["ANONYMIZATION", "Anonimização"],
  ["DELETION", "Eliminação"],
  ["PORTABILITY", "Portabilidade"],
  ["OPPOSITION", "Oposição"],
  ["CONSENT_REVOCATION", "Revogação de consentimento"],
];

function errorMessage(error) {
  return error?.message || "Não foi possível concluir a operação.";
}

export default function PrivacyGovernance() {
  const [governance, setGovernance] = useState(null);
  const [rule, setRule] = useState(emptyRule);
  const [editingId, setEditingId] = useState(null);
  const [settings, setSettings] = useState({
    DSAR_RESPONSE_DAYS: "15",
    PORTABILITY_LINK_HOURS: "48",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [limitSaving, setLimitSaving] = useState("");

  const load = async () => {
    try {
      setError("");
      const response = await api.get("/privacy-governance");
      setGovernance(response.data);
      setSettings({
        DSAR_RESPONSE_DAYS: String(response.data.settings.DSAR_RESPONSE_DAYS),
        PORTABILITY_LINK_HOURS: String(
          response.data.settings.PORTABILITY_LINK_HOURS,
        ),
      });
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await api.put("/privacy-governance/settings", settings);
      setGovernance(response.data);
      setNotice("Prazos operacionais salvos.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };
  const saveRule = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = editingId
        ? await api.patch(`/privacy-governance/retention-rules/${editingId}`, {
            ...rule,
            retentionMonths: Number(rule.retentionMonths),
          })
        : await api.post("/privacy-governance/retention-rules", {
            ...rule,
            retentionMonths: Number(rule.retentionMonths),
          });
      setGovernance((current) => ({
        ...current,
        rules: editingId
          ? current.rules.map((item) =>
              item.id === editingId ? response.data : item,
            )
          : [response.data, ...current.rules],
      }));
      setRule(emptyRule);
      setEditingId(null);
      setNotice("Regra de retenção salva.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };
  const toggleRule = async (item) => {
    try {
      setError("");
      const response = await api.patch(
        `/privacy-governance/retention-rules/${item.id}`,
        { active: !item.active },
      );
      setGovernance((current) => ({
        ...current,
        rules: current.rules.map((ruleItem) =>
          ruleItem.id === item.id ? response.data : ruleItem,
        ),
      }));
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    }
  };
  const saveRequestLimit = async (requestType, value, notes) => {
    if (!value) return;
    try {
      setLimitSaving(requestType);
      setError("");
      const response = await api.put(
        `/privacy-governance/request-limits/${requestType}`,
        { maxRetentionDays: Number(value), notes },
      );
      setGovernance((current) => ({
        ...current,
        requestLimits: [
          ...(current.requestLimits || []).filter(
            (item) => item.requestType !== requestType,
          ),
          response.data,
        ],
      }));
      setNotice("Limite máximo da solicitação salvo.");
    } catch (limitError) {
      setError(errorMessage(limitError));
    } finally {
      setLimitSaving("");
    }
  };
  const applyLgpdReference = () =>
    setRule((current) => ({
      ...current,
      legalBasis:
        "LGPD, arts. 15 e 16 — término quando a finalidade for alcançada ou os dados deixarem de ser necessários; conservação somente nas hipóteses legais.",
      triggeredBy: "Finalidade alcançada ou dados deixaram de ser necessários",
      notes:
        current.notes ||
        "A LGPD não define prazo numérico geral. Validar norma setorial, obrigação legal e aprovação do controlador.",
    }));
  const activeCount = useMemo(
    () => governance?.rules.filter((item) => item.active).length || 0,
    [governance],
  );
  const activeDigits = String(activeCount).padStart(2, "0").split("");

  return (
    <main className="page-content wrap privacy-governance-page">
      <PageHeader
        eyebrow="GOVERNANÇA LGPD"
        title="Configurações de privacidade"
        description="Cadastre prazos, finalidades e ações previstas para a governança do ciclo de vida dos dados. Esta tela documenta decisões administrativas; ela não executa exclusões automáticas."
        action={
          <div
            className="governance-header-metric"
            aria-label={`${activeCount} regras ativas`}
          >
            <span className="governance-header-metric-caption">REGRAS ATIVAS</span>
            <span className="governance-flip-display" aria-hidden="true">
              {activeDigits.map((digit, index) => (
                <span className="governance-flip-digit" key={`${index}-${digit}`}>
                  <span className="governance-flip-digit-value">{digit}</span>
                </span>
              ))}
            </span>
          </div>
        }
      />
      <div className="governance-feedback" aria-live="polite">
        {error && <span className="governance-error">{error}</span>}
        {notice && (
          <span className="governance-notice">
            <Check /> {notice}
          </span>
        )}
      </div>
      <section className="governance-grid">
        <BezelCard className="governance-card governance-settings-card">
          <div className="governance-card-heading">
            <span className="governance-card-icon">
              <Clock3 />
            </span>
            <div>
              <Eyebrow>PRAZOS DO MVP</Eyebrow>
              <h2>Parâmetros operacionais</h2>
            </div>
          </div>
          <p className="governance-muted">
            Esses valores são usados para calcular o prazo inicial de
            atendimento e a validade do link temporário de portabilidade.
          </p>
          <form className="governance-form" onSubmit={saveSettings}>
            <label>
              Prazo de resposta a solicitações
              <input
                type="number"
                min="1"
                max="365"
                value={settings.DSAR_RESPONSE_DAYS}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    DSAR_RESPONSE_DAYS: event.target.value,
                  })
                }
                required
              />
              <small>dias corridos</small>
            </label>
            <label>
              Validade de entrega de portabilidade
              <input
                type="number"
                min="1"
                max="720"
                value={settings.PORTABILITY_LINK_HOURS}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    PORTABILITY_LINK_HOURS: event.target.value,
                  })
                }
                required
              />
              <small>horas · uso único</small>
            </label>
            <div className="governance-form-actions">
              <PrimaryButton type="submit" disabled={saving} icon={<Save />}>
                {saving ? "Salvando…" : "Salvar parâmetros"}
              </PrimaryButton>
            </div>
          </form>
          <div className="governance-disabled">
            <SlidersHorizontal />
            <span>
              <strong>Exclusão automática</strong>
              <small>Desativada até aprovação institucional.</small>
            </span>
          </div>
        </BezelCard>
        <BezelCard className="governance-card governance-rule-form-card">
          <div className="governance-card-heading">
            <span className="governance-card-icon">
              <FileClock />
            </span>
            <div>
              <Eyebrow>{editingId ? "EDITAR REGRA" : "NOVA REGRA"}</Eyebrow>
              <h2>{editingId ? "Atualizar retenção" : "Cadastrar retenção"}</h2>
            </div>
          </div>
          <form className="governance-form" onSubmit={saveRule}>
            <label>
              Objeto dos dados
              <SoftSelect
                value={rule.entityKey}
                onChange={(value) => setRule({ ...rule, entityKey: value })}
                options={entityOptions.map(([value, label]) => ({
                  value,
                  label,
                }))}
                ariaLabel="Objeto dos dados"
              />
            </label>
            <label>
              Nome da regra
              <input
                value={rule.label}
                onChange={(event) =>
                  setRule({ ...rule, label: event.target.value })
                }
                placeholder="Ex.: Protocolos administrativos"
                required
              />
            </label>
            <label>
              Finalidade
              <p className="governance-field-hint">
                Por que o dado precisa ser mantido?
              </p>
              <textarea
                rows="2"
                value={rule.purpose}
                onChange={(event) =>
                  setRule({ ...rule, purpose: event.target.value })
                }
                required
              />
            </label>
            <div className="governance-form-row">
              <label>
                Prazo aprovado
                <input
                  type="number"
                  min="1"
                  max="1200"
                  value={rule.retentionMonths}
                  onChange={(event) =>
                    setRule({ ...rule, retentionMonths: event.target.value })
                  }
                  required
                />
                <small>meses · definido pela instituição</small>
              </label>
              <label>
                Ação pós-prazo
                <SoftSelect
                  value={rule.postAction}
                  onChange={(value) => setRule({ ...rule, postAction: value })}
                  options={actionOptions.map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  ariaLabel="Ação pós-prazo"
                />
              </label>
            </div>
            <label>
              Base legal ou decisão institucional
              <div className="governance-inline-control">
                <input
                  value={rule.legalBasis}
                  onChange={(event) =>
                    setRule({ ...rule, legalBasis: event.target.value })
                  }
                  placeholder="Ex.: obrigação legal a confirmar"
                  required
                />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={applyLgpdReference}
                >
                  Aplicar referência LGPD
                </button>
              </div>
              <p className="governance-field-hint">
                A LGPD não fornece um prazo numérico máximo geral. O botão
                preenche apenas a referência aos arts. 15 e 16; o prazo continua
                obrigatório e precisa ser aprovado.
              </p>
            </label>
            <label>
              Gatilho de revisão
              <input
                value={rule.triggeredBy}
                onChange={(event) =>
                  setRule({ ...rule, triggeredBy: event.target.value })
                }
                placeholder="Ex.: fim da finalidade"
                required
              />
            </label>
            <label>
              Observações
              <textarea
                rows="2"
                value={rule.notes}
                onChange={(event) =>
                  setRule({ ...rule, notes: event.target.value })
                }
                placeholder="Pendências ou condições para execução"
              />
            </label>
            <div className="governance-form-actions">
              <PrimaryButton
                type="submit"
                disabled={saving}
                icon={editingId ? <Check /> : <FileClock />}
              >
                {saving
                  ? "Salvando…"
                  : editingId
                    ? "Atualizar regra"
                    : "Adicionar regra"}
              </PrimaryButton>
              {editingId && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setRule(emptyRule);
                  }}
                >
                  <X /> Cancelar
                </button>
              )}
            </div>
          </form>
        </BezelCard>
      </section>
      <BezelCard className="governance-request-limits-card">
        <div className="governance-card-heading">
          <span className="governance-card-icon">
            <Clock3 />
          </span>
          <div>
            <Eyebrow>LIMITES INSTITUCIONAIS POR DIREITO</Eyebrow>
            <h2>Retenção institucional das solicitações</h2>
          </div>
        </div>
        <p className="governance-muted">
          Defina o prazo institucional aprovado para manter o registro de cada
          tipo de solicitação. A LGPD não fornece um número padrão; fundamente o
          valor na finalidade, em norma aplicável ou em obrigação legal.
        </p>
        <div className="governance-request-limit-list">
          {requestTypeOptions.map(([type, label]) => {
            const current = governance?.requestLimits?.find(
              (item) => item.requestType === type,
            );
            return (
              <div className="governance-request-limit-row" key={type}>
                <div>
                  <strong>{label}</strong>
                  <small>{type}</small>
                </div>
                <label>
                  <span className="sr-only">
                    Limite institucional para {label}, em dias
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    defaultValue={current?.maxRetentionDays || ""}
                    placeholder="Não definido"
                    id={`limit-${type}`}
                  />
                </label>
                <span className="governance-limit-unit">dias</span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={limitSaving === type}
                  onClick={() => {
                    const input = document.getElementById(`limit-${type}`);
                    saveRequestLimit(type, input?.value, current?.notes || "");
                  }}
                >
                  {limitSaving === type
                    ? "Salvando…"
                    : current
                      ? "Atualizar"
                      : "Definir limite"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="governance-limit-disclaimer">
          Enquanto um limite não for definido, o sistema não executa retenção ou
          eliminação automática com base nele.
        </p>
      </BezelCard>
      <BezelCard className="governance-rules-card">
        <div className="governance-card-heading">
          <span className="governance-card-icon">
            <ShieldCheck />
          </span>
          <div>
            <Eyebrow>REGISTRO DE DECISÕES</Eyebrow>
            <h2>Regras de retenção cadastradas</h2>
          </div>
        </div>
        <p className="governance-muted">
          Desative uma regra quando ela deixar de ser aplicável. O histórico
          permanece para revisão e auditoria.
        </p>
        <div className="governance-rules-list">
          {!governance?.rules.length ? (
            <div className="governance-empty">
              Nenhuma regra cadastrada. Adicione a primeira regra ao lado.
            </div>
          ) : (
            governance.rules.map((item) => (
              <article
                className={`governance-rule-row ${item.active ? "is-active" : "is-inactive"}`}
                key={item.id}
              >
                <div className="governance-rule-main">
                  <div>
                    <strong>{item.label}</strong>
                    <span>
                      {entityLabel[item.entityKey] || item.entityKey} ·{" "}
                      {item.retentionMonths} meses
                    </span>
                  </div>
                  <p>{item.purpose}</p>
                  <small>
                    {item.legalBasis} · gatilho: {item.triggeredBy}
                  </small>
                </div>
                <div className="governance-rule-meta">
                  <span
                    className={`governance-action governance-action-${item.postAction.toLowerCase()}`}
                  >
                    {actionLabel[item.postAction] || item.postAction}
                  </span>
                  <button
                    className="governance-switch"
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    aria-label={`${item.active ? "Desativar" : "Ativar"} ${item.label}`}
                    onClick={() => toggleRule(item)}
                  >
                    <span />
                    {item.active ? "Ativa" : "Inativa"}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Editar ${item.label}`}
                    onClick={() => {
                      setEditingId(item.id);
                      setRule({
                        ...item,
                        retentionMonths: String(item.retentionMonths),
                      });
                    }}
                  >
                    <Pencil />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </BezelCard>
    </main>
  );
}
