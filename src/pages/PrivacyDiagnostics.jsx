import { useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, Play, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../api.js";
import BezelCard from "../components/shared/BezelCard";
import Eyebrow from "../components/shared/Eyebrow";
import PageHeader from "../components/shared/PageHeader";
import PrimaryButton from "../components/shared/PrimaryButton";

const statusMeta = {
  PASS: { label: "Aprovado", className: "is-pass", icon: CheckCircle2 },
  WARN: { label: "Atenção", className: "is-warn", icon: CircleAlert },
  FAIL: { label: "Falhou", className: "is-fail", icon: XCircle },
};

function errorMessage(error) {
  return error?.message || "Não foi possível executar o diagnóstico.";
}

export default function PrivacyDiagnostics() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    try {
      setRunning(true);
      setError("");
      const response = await api.post("/privacy-governance/diagnostics/run");
      setReport(response.data);
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="page-content wrap privacy-diagnostics-page">
      <PageHeader
        eyebrow="DIAGNÓSTICO LGPD"
        title="Testes da governança"
        description="Execute verificações seguras na instância atual e acompanhe a saúde das regras, prazos e permissões de privacidade. Nenhum dado é criado, excluído ou alterado durante o diagnóstico."
        action={<PrimaryButton onClick={runDiagnostics} disabled={running} icon={<Play />}>{running ? "Executando…" : "Executar diagnóstico"}</PrimaryButton>}
      />
      {error && <div className="diagnostics-error" role="alert"><CircleAlert /> {error}</div>}
      {!report ? (
        <BezelCard className="diagnostics-empty-card">
          <ShieldCheck />
          <h2>Pronto para verificar</h2>
          <p>O diagnóstico consulta a configuração atual, testa os valores permitidos e confirma que a exclusão automática permanece desativada.</p>
          <button className="ghost-button" type="button" onClick={runDiagnostics} disabled={running}>{running ? "Executando…" : "Iniciar verificações"}</button>
        </BezelCard>
      ) : (
        <>
          <section className="diagnostics-summary" aria-label="Resumo do diagnóstico">
            <BezelCard className="diagnostics-summary-card"><span className="diagnostics-summary-value is-pass">{report.passed}</span><span>Aprovados</span></BezelCard>
            <BezelCard className="diagnostics-summary-card"><span className="diagnostics-summary-value is-warn">{report.warnings}</span><span>Atenções</span></BezelCard>
            <BezelCard className="diagnostics-summary-card"><span className="diagnostics-summary-value is-fail">{report.failed}</span><span>Falhas</span></BezelCard>
            <BezelCard className="diagnostics-summary-card diagnostics-time-card"><Clock3 /><span>{report.durationMs} ms</span><small>{new Date(report.ranAt).toLocaleString("pt-BR")}</small></BezelCard>
          </section>
          <BezelCard className="diagnostics-results-card">
            <div className="diagnostics-results-header"><div><Eyebrow>RESULTADO DA INSTÂNCIA</Eyebrow><h2>Verificações executadas</h2></div><button className="ghost-button" type="button" onClick={runDiagnostics} disabled={running}>{running ? "Executando…" : "Executar novamente"}</button></div>
            <div className="diagnostics-list">{report.checks.map((check) => { const meta = statusMeta[check.status]; const Icon = meta.icon; return <article className={`diagnostics-check ${meta.className}`} key={check.id}><span className="diagnostics-check-icon"><Icon /></span><div><strong>{check.label}</strong><p>{check.detail}</p></div><small>{check.durationMs} ms</small><span className="diagnostics-status">{meta.label}</span></article>; })}</div>
            <p className="diagnostics-disclaimer">Este painel valida a configuração e a segurança operacional da instância. A bateria automatizada completa continua sendo executada por <code>npm test</code>.</p>
          </BezelCard>
        </>
      )}
    </main>
  );
}
