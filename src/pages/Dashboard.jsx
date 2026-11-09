import { useEffect, useMemo, useState } from "react";
import { api, queryString } from "../api.js";
import { formatProtocol, statusOptions } from "../data.js";
import { today, currentYear, currentMonth } from "../utils/constants";
import { formatDate } from "../utils/format";
import BezelCard from "../components/shared/BezelCard";
import Eyebrow from "../components/shared/Eyebrow";
import InlineError from "../components/shared/InlineError";
import LoadingState from "../components/shared/LoadingState";
import EmptyState from "../components/shared/EmptyState";
import StatusBadge from "../components/shared/StatusBadge";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  FileArchive,
  FilePlus2,
  FileText,
  Files,
  FolderClock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export default function Dashboard({
  types,
  onNew,
  onViewDocuments,
  onSelect,
  reloadKey,
  canCreate,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const memo = useMemo(
    () =>
      types.find((type) => type.prefix === "MEMO" && type.active) ||
      types.find((type) => type.active),
    [types],
  );
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null);
    api
      .getCached(`/dashboard?year=${currentYear}&month=${currentMonth}`)
      .then((result) => active && setData(result.data))
      .catch((requestError) => active && requestError.name !== "AbortError" && setError(requestError.message));
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!memo) return undefined;
    let active = true;
    const controller = new AbortController();
    api
      .get(`/protocols/next${queryString({ typeId: memo.id, date: today })}`, { signal: controller.signal })
      .then((result) => active && setPreview(result.data))
      .catch((requestError) => active && requestError.name !== "AbortError" && setPreview(null));
    return () => {
      active = false;
      controller.abort();
    };
  }, [memo, reloadKey]);

  if (error) return <main className="page-content wrap"><InlineError error={error} /></main>;
  if (!data) return <DashboardSkeleton />;

  const inFlow = ["ENVIADO"].reduce(
    (sum, status) => sum + (data.byStatus[status] || 0),
    0,
  );
  const maxStatus = Math.max(1, ...statusOptions.map(({ value }) => data.byStatus[value] || 0));
  const protocol = preview?.protocol || formatProtocol(memo, 1, currentYear);

  return (
    <main className="admin-dashboard wrap">
      <header className="dashboard-heading">
        <div>
          <Eyebrow>PAINEL ADMINISTRATIVO · {formatDate(today)}</Eyebrow>
          <h1>Protocolos em ordem. Visão geral do registro</h1>
          <p>Acompanhe os protocolos, o fluxo de registros e as atividades mais recentes.</p>
        </div>
        {canCreate && <button className="primary-button" onClick={onNew}><FilePlus2 /> Novo protocolo</button>}
      </header>

      <section className="dashboard-kpis" aria-label="Indicadores principais">
        <KpiCard icon={<Files />} label="Protocolos registrados" value={data.total} detail="registros no sistema" tone="sage" />
        <KpiCard icon={<CalendarDays />} label="Neste mês" value={data.monthTotal} detail="novos registros" tone="terracotta" />
        <KpiCard icon={<Activity />} label="Em andamento" value={inFlow} detail="exigem acompanhamento" tone="blue" />
        <KpiCard icon={<FileArchive />} label={`Ano ${currentYear}`} value={data.yearTotal} detail="protocolos registrados" tone="coral" />
      </section>

      <section className="dashboard-main-grid">
        <BezelCard className="dashboard-card dashboard-recent-card">
          <CardHeading eyebrow="ATIVIDADE RECENTE" title="Últimos protocolos" icon={<FileText />} action={<button className="text-action" onClick={onViewDocuments}>Ver protocolos <ChevronRight /></button>} />
          <div className="dashboard-document-list">
            {data.recent.length ? data.recent.map((document) => (
              <button className="dashboard-document-row" key={document.id} onClick={() => onSelect(document)}>
                <span className="dashboard-file-icon"><FileText /></span>
                <span className="dashboard-document-copy"><strong>{document.protocol}</strong><small>{document.subject}</small></span>
                <span className="dashboard-document-date">{formatDate(document.date)}</span>
                <StatusBadge status={document.status} />
                <ChevronRight className="row-chevron" />
              </button>
            )) : <EmptyState icon={<FileText />} title="Acervo vazio" text="O primeiro registro aparecerá aqui." />}
          </div>
        </BezelCard>

        <BezelCard className="dashboard-card dashboard-status-card">
          <CardHeading eyebrow="DISTRIBUIÇÃO" title="Situação do acervo" icon={<BarChart3 />} />
          <div className="dashboard-status-list">
            {statusOptions.map(({ value, label }) => {
              const amount = data.byStatus[value] || 0;
              return <div className="dashboard-status-row" key={value}><div><span>{label}</span><strong>{amount}</strong></div><span className="dashboard-status-track"><i style={{ width: `${(amount / maxStatus) * 100}%` }} /></span></div>;
            })}
          </div>
        </BezelCard>
      </section>

      <section className="dashboard-bottom-grid">
        <BezelCard className="dashboard-card dashboard-protocol-card">
          <div className="dashboard-card-topline"><span className="dashboard-sequence-year">{currentYear}</span></div>
          <div className="dashboard-sequence-main"><strong className="dashboard-protocol-number">{protocol}</strong><span className="dashboard-sequence-type">{memo?.name || "Tipo de protocolo"}</span></div>
          <div className="dashboard-sequence-rail" role="img" tabIndex="0" aria-label="Linha contínua da sequência" />
          <p>O número só é reservado ao confirmar o cadastro do protocolo.</p>
          {canCreate && <button className="secondary-action" onClick={onNew}>Registrar protocolo <ArrowUpRight /></button>}
          <div className="dashboard-security-note"><ShieldCheck /> Números cancelados não são reutilizados.</div>
        </BezelCard>

        <BezelCard className="dashboard-card dashboard-modules-card">
          <CardHeading eyebrow="MÓDULOS" title="Acessos rápidos" icon={<FolderClock />} />
          <div className="dashboard-module-links">
            <button onClick={onViewDocuments}><Files /><span><strong>Protocolos</strong><small>Consultar e acompanhar registros</small></span><ChevronRight /></button>
            <button onClick={onNew} disabled={!canCreate}><FilePlus2 /><span><strong>Novo protocolo</strong><small>Registrar um protocolo</small></span><ChevronRight /></button>
            <button onClick={() => window.location.assign("/atividades")}><Users /><span><strong>Atividades</strong><small>Histórico de movimentações</small></span><ChevronRight /></button>
          </div>
        </BezelCard>
      </section>
    </main>
  );
}

function DashboardSkeleton() {
  return <main className="admin-dashboard wrap dashboard-skeleton" aria-busy="true" aria-label="Carregando painel administrativo">
    <div className="skeleton-heading"><span /><span /><span /></div>
    <section className="dashboard-kpis">{[1, 2, 3, 4].map((item) => <BezelCard key={item} className="dashboard-kpi-card"><span className="skeleton-block icon" /><span className="skeleton-block line" /><span className="skeleton-block value" /><span className="skeleton-block short" /></BezelCard>)}</section>
    <section className="dashboard-main-grid"><BezelCard className="dashboard-card skeleton-panel" /><BezelCard className="dashboard-card skeleton-panel" /></section>
  </main>;
}

function KpiCard({ icon, label, value, detail, tone }) {
  return <BezelCard className={`dashboard-kpi-card ${tone}`}><span className="dashboard-icon-badge">{icon}</span><span className="dashboard-kpi-label">{label}</span><strong className="dashboard-kpi-value">{value}</strong><small>{detail}</small></BezelCard>;
}

function CardHeading({ eyebrow, title, icon, action }) {
  return <div className="dashboard-card-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2></div><span className="dashboard-icon-badge muted">{icon}</span>{action}</div>;
}
