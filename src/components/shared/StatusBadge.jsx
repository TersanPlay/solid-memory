import { statusLabel } from "../../data.js";

export default function StatusBadge({ status }) {
  const label = statusLabel(status);
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(" ", "-");
  return (
    <span className={`status-badge status-${slug}`}>
      <span />
      {label}
    </span>
  );
}
