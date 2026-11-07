import { Link } from "react-router";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
function RouteMessage({ eyebrow, title, description }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <main className="page-content wrap route-message-wrap">
        <BezelCard className="route-message-card reveal-now">
          <span className="soft-icon sage">
            <CircleHelp />
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
          <Link className="ghost-button" to="/inicio">
            <ArrowLeft /> Voltar ao início
          </Link>
        </BezelCard>
      </main>
    </>
  );
}

