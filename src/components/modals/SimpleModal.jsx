export function SimpleModal({
  title,
  description,
  onClose,
  children,
  className = "",
  role = "dialog",
}) {
  return createPortal(
    <div
      className="modal-overlay"
      role={role}
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <BezelCard className={`modal-card ${className}`}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </BezelCard>
    </div>,
    document.body,
  );
}
