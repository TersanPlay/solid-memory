import { useState, useEffect } from "react";
import { api } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { Plus, Pencil, Trash2, Check, UserRound } from "lucide-react";
import { roleLabels } from "../data.js";
import { Avatar } from "../components/shared/Avatar";
import { SearchableSelect, SoftSelect } from "../components/FormControls.jsx";
import { SimpleModal } from "../components/modals/SimpleModal";
export default function UsersPage({ users, refresh, notify }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER",
  });
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/users", form);
      await refresh();
      setAdding(false);
      setForm({ name: "", email: "", password: "", role: "VIEWER" });
      notify("Usuário criado.");
    } catch (err) {
      setError(err.message);
    }
  };
  const update = async (user, changes) => {
    try {
      await api.patch(`/users/${user.id}`, changes);
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="CONTROLE DE ACESSO"
        title="Usuários"
        description="Gerencie perfis e acessos sem expor credenciais."
        action={
          <PrimaryButton onClick={() => setAdding(true)} icon={<Plus />}>
            Novo usuário
          </PrimaryButton>
        }
      />
      <main className="page-content wrap">
        <BezelCard className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="person-cell">
                        <Avatar name={user.name} small />
                        {user.name}
                      </span>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <SoftSelect
                        ariaLabel={`Perfil de ${user.name}`}
                        value={user.role}
                        onChange={(value) => update(user, { role: value })}
                        options={Object.entries(roleLabels).map(
                          ([optionValue, label]) => ({
                            value: optionValue,
                            label,
                          }),
                        )}
                      />
                    </td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={user.active}
                          onChange={() =>
                            update(user, { active: !user.active })
                          }
                        />
                        <span />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BezelCard>
        <div className="user-mobile-list" aria-label="Usuários cadastrados">
          {users.map((user) => (
            <BezelCard className="user-mobile-card" key={user.id}>
              <div className="user-mobile-heading">
                <span className="person-cell"><Avatar name={user.name} small /><strong>{user.name}</strong></span>
                <span className={`user-mobile-status ${user.active ? "is-active" : "is-inactive"}`}>
                  {user.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <span className="user-mobile-email">{user.email}</span>
              <div className="user-mobile-controls">
                <label>
                  <span>Perfil de acesso</span>
                  <SoftSelect
                    ariaLabel={`Perfil de ${user.name}`}
                    value={user.role}
                    onChange={(value) => update(user, { role: value })}
                    options={Object.entries(roleLabels).map(([optionValue, label]) => ({ value: optionValue, label }))}
                  />
                </label>
                <label className="user-mobile-switch">
                  <span>Acesso ativo</span>
                  <span className="switch"><input type="checkbox" checked={user.active} onChange={() => update(user, { active: !user.active })} /><span /></span>
                </label>
              </div>
            </BezelCard>
          ))}
        </div>
      </main>
      {adding && (
        <SimpleModal
          title="Novo usuário"
          description="A senha será armazenada com hash seguro."
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
            <label>
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              Senha inicial
              <input
                type="password"
                minLength="10"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required
              />
            </label>
            <label>
              Perfil
              <SoftSelect
                ariaLabel="Perfil"
                value={form.role}
                onChange={(value) => setForm({ ...form, role: value })}
                options={Object.entries(roleLabels).map(
                  ([optionValue, label]) => ({ value: optionValue, label }),
                )}
              />
            </label>
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
                Criar usuário
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
    </>
  );
}

