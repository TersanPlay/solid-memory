import { useState, useEffect } from "react";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { SearchableSelect } from "../components/FormControls.jsx";
import { formatProtocol } from "../data.js";
import { Search, Plus, ChevronLeft, ChevronRight, MoreHorizontal, FileText, Avatar as LucideAvatar, UserRound, CalendarDays, Filter } from "lucide-react";
import { InlineError } from "../components/shared/InlineError";
import { LoadingState } from "../components/shared/LoadingState";
import { EmptyState } from "../components/shared/EmptyState";
import { formatDate, formatFileSize } from "../utils/format";
function DocumentsWorkspace({
  types,
  onNew,
  onSelect,
  reloadKey,
  canCreate,
}) {
  return (
    <>
      <Documents
        types={types}
        onNew={onNew}
        onSelect={onSelect}
        reloadKey={reloadKey}
        canCreate={canCreate}
      />
      <Outlet />
    </>
  );
}

function DetailRouteState({ error, onClose }) {
  return (
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={error ? "Falha ao abrir documento" : "Carregando documento"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="detail-drawer detail-route-state">
        <div className="drawer-head">
          <button className="text-button" onClick={onClose}>
            <ArrowLeft /> Voltar
          </button>
          <IconButton label="Fechar" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="drawer-content">
          {error ? (
            <div className="route-drawer-message">
              <span className="soft-icon">
                <CircleHelp />
              </span>
              <h2>Não foi possível abrir o documento</h2>
              <p>{error}</p>
              <button className="ghost-button" onClick={onClose}>
                Voltar aos documentos
              </button>
            </div>
          ) : (
            <LoadingState text="Carregando documento…" />
          )}
        </div>
      </aside>
    </div>
  );
}

