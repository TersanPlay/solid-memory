export function formatDate(date) {
  return date
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T12:00:00`))
    : "—";
}

export function formatDateTime(date) {
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))
    : "—";
}

export function formatFileSize(bytes = 0) {
  return bytes >= 1024 * 1024
    ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export function canEditDocument(session, document) {
  return (
    document.status !== "CANCELADO" &&
    (session.role === "admin" ||
      (session.role === "OPERATOR" && document.createdById === session.id))
  );
}
