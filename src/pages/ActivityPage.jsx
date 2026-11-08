import { useState, useEffect } from "react";
import { api } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { InlineError } from "../components/shared/InlineError";
import { LoadingState } from "../components/shared/LoadingState";
import { formatDateTime } from "../utils/format";
function ActivityPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/activity?pageSize=100")
      .then(setResult)
      .catch((err) => setError(err.message));
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="RASTREABILIDADE"
        title="Histórico de atividades"
        description="Uma trilha transparente de consultas, visualizações e movimentações dos protocolos."
      />
      <main className="page-content wrap">
        <InlineError error={error} />
        {!result ? (
          <LoadingState />
        ) : (
          <BezelCard className="activity-card reveal">
            <div className="timeline activity-timeline">
              {result.data.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <i />
                  <div>
                    <strong>{event.description}</strong>
                    <span>
                      <b>{event.document.protocol}</b> ·{" "}
                      {formatDateTime(event.createdAt)} · {event.user.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </BezelCard>
        )}
      </main>
    </>
  );
}

