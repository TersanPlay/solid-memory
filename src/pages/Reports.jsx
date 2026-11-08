import { useState, useEffect } from "react";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { SearchableSelect, SoftSelect, DatePicker } from "../components/FormControls.jsx";
import { statusOptions } from "../data.js";
import { today, currentYear } from "../utils/constants";
import { Download, FileBarChart, ShieldCheck } from "lucide-react";
export default function Reports({ types, notify }) {
  const [filters, setFilters] = useState({
    typeId: "all",
    status: "all",
    dateFrom: `${currentYear}-01-01`,
    dateTo: today,
  });
  const download = async (format) => {
    try {
      await api.download(
        `/reports/documents${queryString({ ...filters, format })}`,
        `relatorio-protocolos.${format}`,
      );
      notify(`Relatório ${format.toUpperCase()} gerado.`);
    } catch (err) {
      notify(err.message, true);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="ANÁLISE E EXPORTAÇÃO"
        title="Relatórios"
        description="Recortes prontos para conferência e prestação de contas."
      />
      <main className="page-content wrap report-layout">
        <BezelCard className="report-builder reveal">
          <div className="card-title-row">
            <div>
              <span className="micro-label">NOVO RELATÓRIO</span>
              <h2>Escolha o recorte</h2>
            </div>
            <span className="soft-icon">
              <FileBarChart />
            </span>
          </div>
          <div className="fields-grid two-cols">
            <label>
              Tipo
              <SearchableSelect
                ariaLabel="Tipo de protocolo do relatório"
                value={filters.typeId}
                onChange={(value) => setFilters({ ...filters, typeId: value })}
                options={[
                  { value: "all", label: "Todos" },
                  ...types.map((type) => ({
                    value: type.id,
                    label: type.name,
                    keywords: [type.prefix],
                  })),
                ]}
              />
            </label>
            <label>
              Status
              <SoftSelect
                ariaLabel="Status do relatório"
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                options={[{ value: "all", label: "Todos" }, ...statusOptions]}
              />
            </label>
            <label>
              Período inicial
              <DatePicker
                ariaLabel="Período inicial"
                value={filters.dateFrom}
                onChange={(value) =>
                  setFilters({ ...filters, dateFrom: value })
                }
                maxDate={filters.dateTo}
                clearable
              />
            </label>
            <label>
              Período final
              <DatePicker
                ariaLabel="Período final"
                value={filters.dateTo}
                onChange={(value) => setFilters({ ...filters, dateTo: value })}
                minDate={filters.dateFrom}
                clearable
              />
            </label>
          </div>
          <div className="export-actions">
            <PrimaryButton onClick={() => download("csv")} icon={<Download />}>
              Exportar CSV
            </PrimaryButton>
            <button className="ghost-button" onClick={() => download("json")}>
              <Download />
              Exportar JSON
            </button>
          </div>
          <p className="report-mobile-note">O arquivo exportado reúne registros de protocolos conforme os filtros selecionados.</p>
        </BezelCard>
        <aside className="report-side reveal">
          <div className="help-card">
            <ShieldCheck />
            <div>
              <strong>Dados preservados</strong>
              <p>
                As exportações incluem protocolos cancelados e sua numeração.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}

