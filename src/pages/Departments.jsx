import { useState, useEffect } from "react";
import { api } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { Building2, Plus, Pencil, Trash2, Check } from "lucide-react";
import { SimpleModal } from "../components/modals/SimpleModal";
import { RemoveDepartmentModal } from "../components/modals/RemoveDepartmentModal";
import { InlineError } from "../components/shared/InlineError";
import { Avatar } from "../components/shared/Avatar";
import { departmentReferenceCount, emptyDepartmentForm } from "../utils/departments";
export default function Departments({ departments, refresh, notify }) {
  const [formMode, setFormMode] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [form, setForm] = useState(emptyDepartmentForm);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const resetEditor = () => {
    setFormMode(null);
    setSelectedDepartment(null);
    setForm(emptyDepartmentForm);
    setError("");
  };

  const openCreate = () => {
    setSelectedDepartment(null);
    setForm(emptyDepartmentForm);
    setError("");
    setFormMode("create");
  };

  const openEdit = (department) => {
    setSelectedDepartment(department);
    setForm({ name: department.name, code: department.code });
    setError("");
    setFormMode("edit");
  };

  const closeEditor = () => {
    if (!saving) resetEditor();
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (formMode === "edit") {
        await api.patch(`/departments/${selectedDepartment.id}`, form);
      } else {
        await api.post("/departments", form);
      }
      await refresh();
      const editing = formMode === "edit";
      resetEditor();
      notify(
        editing ? "Departamento atualizado." : "Departamento adicionado.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (department) => {
    setSwitchingId(department.id);
    try {
      await api.patch(`/departments/${department.id}`, {
        active: !department.active,
      });
      await refresh();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setSwitchingId(null);
    }
  };

  const openDelete = (department) => {
    if (departmentReferenceCount(department) > 0) return;
    setDeleteError("");
    setDepartmentToDelete(department);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDepartmentToDelete(null);
    setDeleteError("");
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/departments/${departmentToDelete.id}`);
      await refresh();
      setDepartmentToDelete(null);
      notify("Departamento excluído.");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="ESTRUTURA ADMINISTRATIVA"
        title="Departamentos"
        description="Mantenha as unidades de origem e destino organizadas e consistentes."
        action={
          <PrimaryButton onClick={openCreate} icon={<Plus />}>
            Novo departamento
          </PrimaryButton>
        }
      />
      <main className="page-content wrap">
        <div className="summary-strip reveal">
          <span>
            <strong>{departments.length}</strong> departamentos cadastrados
          </span>
          <span>
            <i />
            {departments.filter((item) => item.active).length} ativos
          </span>
        </div>
        <div className="cards-list reveal">
          {departments.map((department) => {
            const references = departmentReferenceCount(department);
            const deleteLabel =
              references > 0
                ? `Não é possível excluir ${department.name}: ${references} vínculo${references === 1 ? "" : "s"} com documentos`
                : `Excluir ${department.name}`;
            return (
              <BezelCard className="department-card" key={department.id}>
                <div className="department-icon">
                  <Building2 />
                </div>
                <div className="department-copy">
                  <span className="micro-label">{department.code}</span>
                  <h3>{department.name}</h3>
                  <div className="department-meta">
                    <StatusBadge
                      status={department.active ? "Ativo" : "Inativo"}
                    />
                    <span>
                      {references === 0
                        ? "Sem vínculos"
                        : `${references} vínculo${references === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </div>
                <label
                  className="switch"
                  aria-label={`${department.active ? "Desativar" : "Ativar"} ${department.name}`}
                >
                  <input
                    type="checkbox"
                    checked={department.active}
                    disabled={switchingId === department.id}
                    onChange={() => toggle(department)}
                  />
                  <span />
                </label>
                <div className="department-actions">
                  <IconButton
                    type="button"
                    label={`Editar ${department.name}`}
                    onClick={() => openEdit(department)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    type="button"
                    className="department-delete-button"
                    label={deleteLabel}
                    disabled={references > 0}
                    onClick={() => openDelete(department)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </BezelCard>
            );
          })}
        </div>
      </main>
      {formMode && (
        <SimpleModal
          title={
            formMode === "edit"
              ? "Editar departamento"
              : "Novo departamento"
          }
          description={
            formMode === "edit"
              ? "As alterações serão usadas nos próximos registros; documentos emitidos preservam os dados históricos."
              : "A unidade ficará disponível nos campos de origem e destino."
          }
          onClose={closeEditor}
        >
          <form onSubmit={save} className="form-stack">
            <label>
              Nome completo
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                disabled={saving}
                required
              />
            </label>
            <label>
              Identificador
              <input
                value={form.code}
                onChange={(event) =>
                  setForm({
                    ...form,
                    code: event.target.value.toUpperCase().replaceAll(" ", "-"),
                  })
                }
                placeholder="DEP-JURIDICO"
                disabled={saving}
                required
              />
            </label>
            <InlineError error={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={saving}
                onClick={closeEditor}
              >
                Cancelar
              </button>
              <PrimaryButton type="submit" icon={<Check />} disabled={saving}>
                {saving
                  ? "Salvando…"
                  : formMode === "edit"
                    ? "Salvar alterações"
                    : "Adicionar"}
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
      {departmentToDelete && (
        <RemoveDepartmentModal
          department={departmentToDelete}
          busy={deleting}
          error={deleteError}
          onClose={closeDelete}
          onConfirm={remove}
        />
      )}
    </>
  );
}

