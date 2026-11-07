import { useState, useEffect } from "react";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { SearchableSelect, SoftSelect } from "../components/FormControls.jsx";
import { AttachmentPicker } from "../components/shared/AttachmentPicker";
import { SimpleModal } from "../components/modals/SimpleModal";
import { CancelDocumentModal } from "../components/modals/CancelDocumentModal";
import { RemoveAttachmentModal } from "../components/modals/RemoveAttachmentModal";
import { Sparkles, X, ChevronRight, Paperclip, Upload, Download, Trash2, FileText, ChevronDown, Activity, FolderClock } from "lucide-react";
import { formatDate, formatDateTime, formatFileSize, canEditDocument } from "../utils/format";
function DetailPanel({ document, session, onClose, onUpdate, notify }) {
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [attachmentToRemove, setAttachmentToRemove] = useState(null);
  useEffect(() => {
    if (!document) return;
    api
      .get(`/documents/${document.id}/history`)
      .then((result) => setHistory(result.data))
      .catch((err) => setError(err.message));
  }, [document]);
  if (!document) return null;
  const canEdit = canEditDocument(session, document);
  const updateStatus = async (status) => {
    setBusy(true);
    setError("");
    try {
      const updated = (
        await api.patch(`/documents/${document.id}/status`, { status })
      ).data;
      onUpdate(updated);
      notify(`Status de ${document.protocol} atualizado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = (await api.post(`/documents/${document.id}/cancel`)).data;
      onUpdate(updated);
      setConfirmingCancel(false);
      notify(`${document.protocol} foi cancelado.`);
    } catch (err) {
      setError(err.message);
      setConfirmingCancel(false);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post(`/documents/${document.id}/attachments`, body);
      const updated = (await api.get(`/documents/${document.id}`)).data;
      onUpdate(updated);
      notify("Anexo adicionado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const removeAttachment = async () => {
    if (!attachmentToRemove) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/attachments/${attachmentToRemove.id}`);
      const [updated, latestHistory] = await Promise.all([
        api.get(`/documents/${document.id}`),
        api.get(`/documents/${document.id}/history`),
      ]);
      onUpdate(updated.data);
      setHistory(latestHistory.data);
      notify(`Anexo ${attachmentToRemove.originalName} removido.`);
      setAttachmentToRemove(null);
    } catch (err) {
      setError(err.message);
      setAttachmentToRemove(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div
        className="drawer-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${document.protocol}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <aside className="detail-drawer">
          <div className="drawer-head">
            <button className="text-button" onClick={onClose}>
              <ArrowLeft />
              Voltar
            </button>
            <div>
              <IconButton label="Imprimir" onClick={() => window.print()}>
                <FileText />
              </IconButton>
              <IconButton label="Fechar" onClick={onClose}>
                <X />
              </IconButton>
            </div>
          </div>
          <div className="drawer-content">
            <div className="detail-hero">
              <Eyebrow>{document.type.name}</Eyebrow>
              <h2>{document.protocol}</h2>
              <p>{document.subject}</p>
              <StatusBadge status={document.status} />
            </div>
            <div className="detail-grid">
              <div>
                <span>Data de emissão</span>
                <strong>{formatDate(document.date)}</strong>
              </div>
              <div>
                <span>Responsável</span>
                <strong>{document.responsible}</strong>
              </div>
              <div>
                <span>Origem</span>
                <strong>{document.origin}</strong>
              </div>
              <div>
                <span>Destino</span>
                <strong>{document.destination}</strong>
              </div>
            </div>
            <InlineError error={error} />
            <section className="detail-section detail-status-section">
              <div className="detail-section-title">
                <h3>Situação do documento</h3>
                <Activity />
              </div>
              {canEdit ? (
                <label>
                  Status atual
                  <SoftSelect
                    ariaLabel="Status atual"
                    value={
                      document.status === "CANCELADO"
                        ? "CANCELADO"
                        : document.status
                    }
                    disabled={busy || document.status === "CANCELADO"}
                    onChange={updateStatus}
                    options={statusOptions.filter(
                      (item) =>
                        item.value !== "CANCELADO" ||
                        document.status === "CANCELADO",
                    )}
                  />
                </label>
              ) : (
                <p>
                  Seu perfil possui acesso somente para consulta deste registro.
                </p>
              )}
              {session.role === "admin" && document.status !== "CANCELADO" && (
                <button
                  className="danger-text"
                  aria-label="Cancelar documento e preservar número"
                  disabled={busy}
                  onClick={() => setConfirmingCancel(true)}
                >
                  <span className="danger-text-icon" aria-hidden="true">
                    <X />
                  </span>
                  <span className="danger-text-copy">
                    <strong>Cancelar documento</strong>
                    <small>O número do protocolo será preservado</small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <h3>Observações e anexos</h3>
                <Paperclip />
              </div>
              <p>{document.notes || "Nenhuma observação adicionada."}</p>
              {document.attachments?.map((attachment) => (
                <div className="attachment-row" key={attachment.id}>
                  <button
                    type="button"
                    className="attachment-download"
                    onClick={() =>
                      api
                        .download(
                          `/attachments/${attachment.id}`,
                          attachment.originalName,
                        )
                        .catch((err) => setError(err.message))
                    }
                  >
                    <span className="doc-file-icon">
                      <FileText />
                    </span>
                    <span>
                      <strong>{attachment.originalName}</strong>
                      <small>{formatFileSize(attachment.size)}</small>
                    </span>
                    <Download />
                  </button>
                  {canEdit && (
                    <IconButton
                      label={`Remover anexo ${attachment.originalName}`}
                      className="attachment-remove"
                      disabled={busy}
                      onClick={() => setAttachmentToRemove(attachment)}
                    >
                      <Trash2 />
                    </IconButton>
                  )}
                </div>
              ))}
              {!document.attachments?.length && (
                <div className="empty-inline">
                  <Paperclip />
                  Nenhum arquivo anexado
                </div>
              )}
              {canEdit && (
                <label className="ghost-button attachment-upload">
                  <Upload />
                  Adicionar anexo
                  <input
                    type="file"
                    hidden
                    disabled={busy}
                    accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                    onChange={(event) => upload(event.target.files?.[0])}
                  />
                </label>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <h3>Histórico</h3>
                <FolderClock />
              </div>
              <div className="timeline">
                {history.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <i />
                    <div>
                      <strong>{item.description}</strong>
                      <span>
                        {formatDateTime(item.createdAt)} · {item.user.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="detail-footer">
              <small>
                Cadastrado em {formatDateTime(document.createdAt)} por{" "}
                {document.createdBy.name}
              </small>
              <small>
                Última alteração em {formatDateTime(document.updatedAt)}
              </small>
            </div>
          </div>
        </aside>
      </div>
      {confirmingCancel && (
        <CancelDocumentModal
          protocol={document.protocol}
          busy={busy}
          onClose={() => {
            if (!busy) setConfirmingCancel(false);
          }}
          onConfirm={cancel}
        />
      )}
      {attachmentToRemove && (
        <RemoveAttachmentModal
          attachment={attachmentToRemove}
          busy={busy}
          onClose={() => {
            if (!busy) setAttachmentToRemove(null);
          }}
          onConfirm={removeAttachment}
        />
      )}
    </>
  );
}

