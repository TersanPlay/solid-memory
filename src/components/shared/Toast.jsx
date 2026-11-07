import { X, Check, CircleHelp } from "lucide-react";
import { IconButton } from "./IconButton";
function Toast({ message, error, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast ${error ? "toast-error" : ""}`} role="status">
      <span>{error ? <CircleHelp /> : <Check />}</span>
      <div>
        <strong>{error ? "Atenção" : "Tudo certo"}</strong>
        <p>{message}</p>
      </div>
      <IconButton label="Fechar" onClick={onClose}>
        <X />
      </IconButton>
    </div>
  );
}

