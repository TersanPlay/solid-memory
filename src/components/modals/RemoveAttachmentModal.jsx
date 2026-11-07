export function RemoveAttachmentModal({
  attachment,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="remove-attachment-modal"
      title="Remover anexo?"
      description="O arquivo será excluído permanentemente do banco de dados."
      onClose={onClose}
    >
      <div className="remove-attachment-body">
        <div className="remove-attachment-card">
          <span aria-hidden="true">
            <FileText />
          </span>
          <div>
            <small>ARQUIVO</small>
            <strong title={attachment.originalName}>
              {attachment.originalName}
            </strong>
            <p>{formatFileSize(attachment.size)}</p>
          </div>
        </div>
        <div className="removal-audit-note">
          <CircleHelp aria-hidden="true" />
          <div>
            <strong>Conteúdo irrecuperável</strong>
            <p>
              Nome, tamanho, usuário e data permanecerão registrados no
              histórico.
            </p>
          </div>
        </div>
        <div className="modal-actions remove-attachment-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter anexo
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Removendo…" : "Remover definitivamente"}</span>
            <span aria-hidden="true">
              <Trash2 />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}
