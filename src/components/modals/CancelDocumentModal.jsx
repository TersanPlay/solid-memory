export function CancelDocumentModal({
  protocol,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="cancel-confirm-modal"
      title="Cancelar documento?"
      description="Revise esta ação antes de confirmar. O cancelamento não poderá ser desfeito."
      onClose={onClose}
    >
      <div className="cancel-confirm-body">
        <div className="cancel-protocol-card">
          <span aria-hidden="true">
            <FileArchive />
          </span>
          <div>
            <small>PROTOCOLO</small>
            <strong>{protocol}</strong>
          </div>
        </div>
        <div className="cancel-preservation-note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Numeração preservada</strong>
            <p>O protocolo continuará no histórico e nunca será reutilizado.</p>
          </div>
        </div>
        <div className="modal-actions cancel-confirm-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter documento
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Cancelando…" : "Confirmar cancelamento"}</span>
            <span aria-hidden="true">
              <X />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}
