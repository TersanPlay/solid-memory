import { useState, useEffect } from "react";
import { api } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { formatProtocol } from "../data.js";
import { InlineError } from "../components/shared/InlineError";
import { currentYear } from "../utils/constants";
import { SimpleModal } from "../components/modals/SimpleModal";
function Types({ types, refresh, notify }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    prefix: "",
    digits: 3,
  });
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/document-types", {
        ...form,
        digits: Number(form.digits),
      });
      await refresh();
      setAdding(false);
      setForm({ name: "", prefix: "", digits: 3 });
      notify("Tipo de protocolo criado.");
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = async (type) => {
    try {
      await api.patch(`/document-types/${type.id}`, { active: !type.active });
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="CONFIGURAÇÃO DE PROTOCOLOS"
        title="Tipos de protocolo"
        description="Cada tipo mantém prefixo, formato e sequência anual próprios."
        action={
          <PrimaryButton onClick={() => setAdding(true)} icon={<Plus />}>
            Novo tipo
          </PrimaryButton>
        }
      />
      <main className="page-content wrap">
        <div className="type-grid reveal" aria-label="Tipos de protocolo cadastrados">
          {types.map((type, index) => (
            <BezelCard className="type-card" key={type.id}>
              <div className={`type-monogram tone-${index % 4}`}>
                {type.prefix}
              </div>
              <div className="type-head">
                <div>
                  <span className="micro-label">
                    {type.active ? "ATIVO" : "INATIVO"}
                  </span>
                  <h3>{type.name}</h3>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={type.active}
                    onChange={() => toggle(type)}
                  />
                  <span />
                </label>
              </div>
              <div className="type-protocol" aria-label="Exemplo de numeração de protocolo">
                {formatProtocol(type, 1, currentYear)}
              </div>
              <div className="type-meta">
                <span>
                  <strong>{type._count?.documents || 0}</strong> registros
                </span>
                <span>
                  <strong>{type.digits}</strong> dígitos
                </span>
              </div>
            </BezelCard>
          ))}
        </div>
      </main>
      {adding && (
        <SimpleModal
          title="Novo tipo de protocolo"
          description="Defina como os próximos protocolos serão formados."
          onClose={() => setAdding(false)}
        >
          <form onSubmit={save} className="form-stack">
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>
            <div className="fields-grid two-cols">
              <label>
                Prefixo
                <input
                  value={form.prefix}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      prefix: event.target.value.toUpperCase().slice(0, 8),
                    })
                  }
                  required
                />
              </label>
              <label>
                Dígitos
                <input
                  type="number"
                  min="3"
                  max="6"
                  value={form.digits}
                  onChange={(event) =>
                    setForm({ ...form, digits: event.target.value })
                  }
                />
              </label>
            </div>
            <InlineError error={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setAdding(false)}
              >
                Cancelar
              </button>
              <PrimaryButton type="submit" icon={<Check />}>
                Criar tipo
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
    </>
  );
}

