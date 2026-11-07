  import { useState, useEffect } from "react";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { SearchableSelect, SoftSelect } from "../components/FormControls.jsx";
import { AttachmentPicker } from "../components/shared/AttachmentPicker";
import { Sparkles, Plus, Upload, ChevronRight, FileText, CalendarDays, X, Trash2, Eye, Paperclip, Users, Clock3, Download, ArrowUpRight } from "lucide-react";
import { formatProtocol } from "../data.js";
import { statusOptions, currentYear } from "../utils/constants";
import { canEditDocument } from "../utils/format";

export default function NewDocument() {
  const activeTypes = types.filter((item) => item.active);
  const activeDepartments = departments.filter((item) => item.active);
  const activeUsers = users.filter((item) => item.active);
  const [form, setForm] = useState({
    typeId: activeTypes[0]?.id || "",
    date: today,
    originDepartmentId: activeDepartments[0]?.id || "",
    destinationDepartmentId:
      activeDepartments[1]?.id || activeDepartments[0]?.id || "",
    destinationText: "",
    destinationMode: "internal",
    subject: "",
    responsibleUserId: session.id,
    status: "ENVIADO",
    notes: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  useEffect(() => {
    if (!form.typeId || !form.date) return;
    api
      .get(
        `/protocols/next${queryString({ typeId: form.typeId, date: form.date })}`,
      )
      .then((result) => setPreview(result.data))
      .catch(() => setPreview(null));
  }, [form.typeId, form.date]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        typeId: form.typeId,
        date: form.date,
        originDepartmentId: form.originDepartmentId,
        destinationDepartmentId:
          form.destinationMode === "internal"
            ? form.destinationDepartmentId
            : null,
        destinationText:
          form.destinationMode === "external" ? form.destinationText : null,
        subject: form.subject,
        responsibleUserId:
          session.role === "OPERATOR" ? session.id : form.responsibleUserId,
        status: form.status,
        notes: form.notes,
      };
      let document = (await api.post("/documents", payload)).data;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        try {
          await api.post(`/documents/${document.id}/attachments`, body);
          document = (await api.get(`/documents/${document.id}`)).data;
        } catch (uploadError) {
          notify(
            `Documento ${document.protocol} salvo, mas o anexo falhou: ${uploadError.message}`,
            true,
          );
        }
      }
      notify(`Documento ${document.protocol} registrado com sucesso.`);
      onSaved(document);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="NOVO REGISTRO"
        title="Registrar documento"
        description="Preencha os dados essenciais. O protocolo definitivo será emitido pelo servidor ao confirmar."
      />
      <main className="page-content wrap form-layout">
        <form className="document-form" onSubmit={submit}>
          <div className="inline-protocol reveal">
            <span className="soft-icon">
              <Sparkles />
            </span>
            <div>
              <span className="micro-label">PRÉVIA · NÃO RESERVADA</span>
              <strong>{preview?.protocol || "Selecione tipo e data"}</strong>
            </div>
            <span className="live-label">
              <i />
              PRÉVIA
            </span>
          </div>
          <BezelCard className="form-section reveal">
            <div className="form-section-head">
              <span>01</span>
              <div>
                <h2>Identificação</h2>
                <p>Tipo, data e percurso do documento.</p>
              </div>
            </div>
            <div className="fields-grid two-cols">
              <label>
                Tipo de documento <span>*</span>
                <SearchableSelect
                  ariaLabel="Tipo de documento"
                  value={form.typeId}
                  onChange={(value) => update("typeId", value)}
                  options={activeTypes.map((type) => ({
                    value: type.id,
                    label: `${type.name} · ${type.prefix}`,
                    keywords: [type.prefix],
                  }))}
                  required
                />
              </label>
              <label>
                Data de emissão <span>*</span>
                <DatePicker
                  ariaLabel="Data de emissão"
                  value={form.date}
                  onChange={(value) => update("date", value)}
                  required
                />
              </label>
              <label>
                Origem <span>*</span>
                <SearchableSelect
                  ariaLabel="Departamento de origem"
                  value={form.originDepartmentId}
                  onChange={(value) => update("originDepartmentId", value)}
                  options={activeDepartments.map((department) => ({
                    value: department.id,
                    label: `${department.code} · ${department.name}`,
                    keywords: [department.name],
                  }))}
                  required
                />
              </label>
              <label>
                Tipo de destino
                <SoftSelect
                  ariaLabel="Tipo de destino"
                  value={form.destinationMode}
                  onChange={(value) => update("destinationMode", value)}
                  options={[
                    { value: "internal", label: "Departamento interno" },
                    { value: "external", label: "Destino externo" },
                  ]}
                />
              </label>
              {form.destinationMode === "internal" ? (
                <label className="span-two">
                  Destino <span>*</span>
                  <SearchableSelect
                    ariaLabel="Departamento de destino"
                    value={form.destinationDepartmentId}
                    onChange={(value) =>
                      update("destinationDepartmentId", value)
                    }
                    options={activeDepartments.map((department) => ({
                      value: department.id,
                      label: `${department.code} · ${department.name}`,
                      keywords: [department.name],
                    }))}
                    required
                  />
                </label>
              ) : (
                <label className="span-two">
                  Destino externo <span>*</span>
                  <input
                    value={form.destinationText}
                    onChange={(event) =>
                      update("destinationText", event.target.value)
                    }
                    maxLength="160"
                    required
                  />
                </label>
              )}
              <label className="span-two">
                Assunto <span>*</span>
                <textarea
                  value={form.subject}
                  onChange={(event) => update("subject", event.target.value)}
                  rows="3"
                  maxLength="300"
                  required
                />
              </label>
            </div>
          </BezelCard>
          <BezelCard className="form-section reveal">
            <div className="form-section-head">
              <span>02</span>
              <div>
                <h2>Acompanhamento</h2>
                <p>Responsável, situação e informações complementares.</p>
              </div>
            </div>
            <div className="fields-grid two-cols">
              <label>
                Responsável <span>*</span>
                <SearchableSelect
                  ariaLabel="Responsável"
                  value={form.responsibleUserId}
                  onChange={(value) => update("responsibleUserId", value)}
                  options={activeUsers.map((user) => ({
                    value: user.id,
                    label: user.name,
                    keywords: [user.email],
                  }))}
                  disabled={session.role === "OPERATOR"}
                  required
                />
              </label>
              <label>
                Status inicial <span>*</span>
                <SoftSelect
                  ariaLabel="Status inicial"
                  value={form.status}
                  onChange={(value) => update("status", value)}
                options={statusOptions.filter((item) => item.value !== "CANCELADO")}
                  required
                />
              </label>
              <label className="span-two">
                Observações
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows="4"
                  maxLength="4000"
                />
              </label>
              <AttachmentPicker
                file={file}
                onChange={setFile}
                disabled={saving}
              />
            </div>
          </BezelCard>
          <InlineError error={error} />
          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Cancelar
            </button>
            <PrimaryButton
              type="submit"
              disabled={
                saving || !activeTypes.length || !activeDepartments.length
              }
              icon={saving ? <span className="spinner" /> : <Check />}
            >
              {saving ? "Salvando…" : "Confirmar e registrar"}
            </PrimaryButton>
          </div>
        </form>
      </main>
    </>
  );
}

