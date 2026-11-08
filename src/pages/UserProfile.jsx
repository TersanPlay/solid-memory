import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Activity, FileText, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import { roleLabels, statusLabel } from "../data.js";
import { formatDate, formatDateTime } from "../utils/format.js";
import Avatar from "../components/shared/Avatar";
import BezelCard from "../components/shared/BezelCard";
import Eyebrow from "../components/shared/Eyebrow";
import InlineError from "../components/shared/InlineError";
import LoadingState from "../components/shared/LoadingState";

export default function UserProfile({ session }) {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile(null);
    setError("");
    api.get(`/users/${encodeURIComponent(userId)}/profile`)
      .then((result) => setProfile(result.data))
      .catch((err) => setError(err.message));
  }, [userId]);

  if (error) {
    return <main className="page-content wrap"><InlineError error={error} /></main>;
  }
  if (!profile) return <main className="page-content wrap"><LoadingState /></main>;

  const { user, metrics, documents, history } = profile;
  const isOwnProfile = session.id === user.id;

  return (
    <>
      <header className="profile-page-header wrap reveal-now">
        <Link className="profile-back-link" to={isOwnProfile ? "/inicio" : "/usuarios"}>
          <ArrowLeft /> Voltar
        </Link>
        <div className="profile-identity">
          <Avatar name={user.name} />
          <div>
            <Eyebrow>{isOwnProfile ? "MEU PERFIL" : "PERFIL DO USUÁRIO"}</Eyebrow>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <span className={`profile-status ${user.active ? "is-active" : "is-inactive"}`}>
          <span /> {user.active ? "Ativo" : "Inativo"}
        </span>
      </header>

      <main className="page-content wrap user-profile-content">
        <section className="profile-overview-grid">
          <BezelCard className="profile-info-card">
            <div className="profile-card-heading"><ShieldCheck /><div><Eyebrow>ACESSO</Eyebrow><h2>Informações do usuário</h2></div></div>
            <dl className="profile-details">
              <div><dt>Perfil</dt><dd>{roleLabels[user.role] || user.role}</dd></div>
              <div><dt>Cadastro</dt><dd>{formatDate(user.createdAt?.slice?.(0, 10) || user.createdAt)}</dd></div>
              <div><dt>Última atualização</dt><dd>{formatDateTime(user.updatedAt)}</dd></div>
            </dl>
          </BezelCard>
          <div className="profile-metrics-grid">
            <BezelCard><span className="profile-metric-label">Documentos criados</span><strong>{metrics.createdDocuments}</strong><small>protocolos alimentados por este usuário</small></BezelCard>
            <BezelCard><span className="profile-metric-label">Responsável por</span><strong>{metrics.responsibleDocuments}</strong><small>documentos sob acompanhamento</small></BezelCard>
            <BezelCard><span className="profile-metric-label">Atividades</span><strong>{metrics.activityEntries}</strong><small>registros no histórico documental</small></BezelCard>
          </div>
        </section>

        <section className="profile-history-grid">
          <BezelCard className="profile-history-card">
            <div className="profile-card-heading"><Activity /><div><Eyebrow>RASTREABILIDADE</Eyebrow><h2>Histórico recente</h2></div></div>
            {history.length ? <div className="timeline profile-timeline">{history.map((item) => <div className="timeline-item" key={item.id}><i /><div><strong>{item.description}</strong><span><b>{item.document.protocol}</b> · {formatDateTime(item.createdAt)}</span></div></div>)}</div> : <p className="profile-empty">Nenhuma atividade registrada para este usuário.</p>}
          </BezelCard>
          <BezelCard className="profile-documents-card">
            <div className="profile-card-heading"><FileText /><div><Eyebrow>ACERVO</Eyebrow><h2>Documentos relacionados</h2></div></div>
            {documents.length ? <div className="profile-document-list">{documents.map((document) => <Link to={`/documentos/${encodeURIComponent(document.id)}`} className="profile-document-row" key={document.id}><span><strong>{document.protocol}</strong><small>{document.subject}</small></span><span className="profile-document-meta">{document.createdById === user.id ? "Criado" : "Responsável"}<em>{statusLabel(document.status)}</em></span></Link>)}</div> : <p className="profile-empty">Nenhum documento relacionado a este usuário.</p>}
          </BezelCard>
        </section>
      </main>
    </>
  );
}
