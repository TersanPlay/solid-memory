import { useState, useEffect } from "react";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { PageHeader } from "../components/shared/PageHeader";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { SearchableSelect, SoftSelect } from "../components/FormControls.jsx";
import { Search, Plus, Filter, ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpRight, FileText } from "lucide-react";
import { Avatar } from "../components/shared/Avatar";
import { StatusBadge } from "../components/shared/StatusBadge";
import { InlineError } from "../components/shared/InlineError";
import { LoadingState } from "../components/shared/LoadingState";
import { EmptyState } from "../components/shared/EmptyState";
import { formatDate } from "../utils/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { currentYear } from "../utils/constants";
export default function Documents({ types, onNew, onSelect, reloadKey, canCreate }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [typeId, setTypeId] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState(String(currentYear));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    api
      .get(
        `/documents${queryString({ q: debouncedQuery, typeId, status, year, page, pageSize: 10 })}`,
      )
      .then((data) => active && setResult(data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [debouncedQuery, typeId, status, year, page, reloadKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, typeId, status, year]);

  const clearFilters = () => {
    setQuery("");
    setTypeId("all");
    setStatus("all");
    setYear(String(currentYear));
  };

  return (
    <>
      <PageHeader
        eyebrow="REGISTRO DE PROTOCOLOS"
        title="Protocolos"
        description="Consulte protocolos, acompanhe situações e encontre informações sem percorrer planilhas."
        description="Consulte protocolos, acompanhe situações e encontre informações sem percorrer planilhas."
        action={
          canCreate ? (
            <PrimaryButton onClick={onNew} icon={<Plus />}>
              Novo Protocolo
            </PrimaryButton>
          ) : null
        }
      />
      <main className="page-content wrap">
        <BezelCard className="filters-card reveal">
          <div className="filter-primary">
            <div className="search-field">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por protocolo, assunto, origem…"
              />
            </div>
            <button
              className={`filter-toggle ${filtersOpen ? "active" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter />
              Filtros
              <span className="filter-count">
                {[typeId, status].filter((value) => value !== "all").length}
              </span>
            </button>
          </div>
          <div className={`filter-grid ${filtersOpen ? "open" : ""}`}>
            <label>
              Tipo
              <SearchableSelect
                ariaLabel="Tipo de protocolo"
                value={typeId}
                onChange={setTypeId}
                options={[
                  { value: "all", label: "Todos os tipos" },
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
                ariaLabel="Status do protocolo"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "Todos os status" },
                ]}
              />
            </label>
            <label>
              Ano
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
            <button className="text-button clear-filter" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        </BezelCard>

        {error && <InlineError error={error} />}
        {!result ? (
          <LoadingState />
        ) : (
          <>
            {result.data.length ? (
              <div className="document-list">
                <table>
                  <thead>
                    <tr>
                      <th>Protocolo</th>
                      <th>Assunto do protocolo</th>
                      <th>Emissão</th>
                      <th>Origem → destino</th>
                      <th>Responsável</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((document) => (
                      <tr key={document.id}>
                        <td>
                          <button className="link-button" onClick={() => onSelect(document)}>
                            {document.protocol}
                          </button>
                        </td>
                        <td>
                          <div className="document-cell">
                            <FileText />
                            <div>
                              <strong>{document.subject}</strong>
                              <span>{formatDate(document.date)}</span>
                            </div>
                          </div>
                        </td>
                        <td>{formatDate(document.date)}</td>
                        <td>
                          <div className="transfer">
                            <span>{document.originDepartment?.name}</span>
                            <ArrowUpRight />
                            <span>{document.destinationDepartment?.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="assignee">
                            <Avatar name={document.responsibleUser?.name} />
                            <span>{document.responsibleUser?.name}</span>
                          </div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={document.status} />
                        </td>
                        <td>
                          <IconButton label={`Abrir ${document.protocol}`}>
                            <MoreHorizontal />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Search />}
                title="Nenhum protocolo encontrado"
                text="Revise os filtros ou registre um novo protocolo."
                action={
                  canCreate ? (
                    <PrimaryButton onClick={onNew} icon={<Plus />}>
                      Novo protocolo
                    </PrimaryButton>
                  ) : null
                }
              />
            )}
            <div className="pagination">
              <button
                className="ghost-button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft />
                Anterior
              </button>
              <span>
                Página {result.pagination.page} de{" "}
                {result.pagination.totalPages}
              </span>
              <button
                className="ghost-button"
                disabled={page >= result.pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
