import { useState } from "react";
import { navigate } from "react-router";
import { api } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { Logo } from "../components/shared/Brand";
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.post("/auth/login", { email, password });
      await onLogin(result.data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="ambient-mesh" aria-hidden="true" />
      <section className="login-intro reveal-now">
        <Brand />
        <div>
          <Eyebrow>REGISTRO DE PROTOCOLOS</Eyebrow>
          <h1>Organização que acolhe a rotina.</h1>
          <p>
            Protocolos seguros, histórico preservado e consultas fáceis de
            realizar — em um só lugar.
          </p>
        </div>
        <div className="login-proof">
          <ShieldCheck />
          <span>
            <strong>Sequências protegidas</strong> por tipo de protocolo e por
            ano.
          </span>
        </div>
      </section>
      <section className="login-card-wrap">
        <BezelCard className="login-card">
          <div className="login-heading">
            <span className="soft-icon">
              <LockKeyhole />
            </span>
            <div>
              <span className="micro-label">ACESSO INSTITUCIONAL</span>
              <h2>Boas-vindas de volta</h2>
            </div>
          </div>
          <p className="muted">
            Use as credenciais cadastradas pelo administrador.
          </p>
          <form onSubmit={submit} className="form-stack">
            <label>
              E-mail institucional
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <div className="input-affix">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Eye />
              </div>
            </label>
            <InlineError error={error} />
            <PrimaryButton
              type="submit"
              className="full-button"
              disabled={loading}
              icon={loading ? <span className="spinner" /> : <ArrowUpRight />}
            >
              {loading ? "Entrando…" : "Entrar no MemoryDoc"}
            </PrimaryButton>
          </form>
          <div className="login-note">
            <CircleHelp /> Solicite acesso ao administrador responsável.
          </div>
        </BezelCard>
      </section>
    </main>
  );
}

