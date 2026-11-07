export function RemoveDepartmentModal({
  department,
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="remove-department-modal"
      title="Excluir departamento?"
      description="O cadastro será removido permanentemente e não poderá ser recuperado."
      onClose={onClose}
    >
      <div className="remove-department-body">
        <div className="remove-department-card">
          <span aria-hidden="true">
            <Building2 />
          </span>
          <div>
            <small>{department.code}</small>
            <strong>{department.name}</strong>
          </div>
        </div>
        <div className="removal-audit-note">
          <CircleHelp aria-hidden="true" />
          <div>
            <strong>Exclusão definitiva</strong>
            <p>
              Esta ação só é permitida porque não existem documentos vinculados
              a este departamento.
            </p>
          </div>
        </div>
        <InlineError error={error} />
        <div className="modal-actions remove-department-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter departamento
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Excluindo…" : "Excluir definitivamente"}</span>
            <span aria-hidden="true">
              <Trash2 />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}

const emptyDepartmentForm = { name: "", code: "" };
const departmentReferenceCount = (department) =>
  (department._count?.originDocuments || 0) +
  (department._count?.destinationDocuments || 0);
