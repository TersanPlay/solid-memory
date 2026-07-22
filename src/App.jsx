import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  FileArchive,
  FileBarChart,
  FilePlus2,
  Files,
  FileText,
  Filter,
  FolderClock,
  Home,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api, ApiClientError, queryString } from "./api.js";
import {
  DatePicker,
  SearchableSelect,
  SoftSelect,
} from "./components/FormControls.jsx";
import {
  formatProtocol,
  roleLabels,
  statusLabel,
  statusOptions,
} from "./data.js";

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const currentYear = Number(today.slice(0, 4));
const currentMonth = today.slice(5, 7);
const safeInternalPath = (value, fallback = "/inicio") =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  value !== "/login"
    ? value
    : fallback;
const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T12:00:00`))
    : "—";
const formatDateTime = (date) =>
  date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date))
    : "—";
export const formatFileSize = (bytes = 0) =>
  bytes >= 1024 * 1024
    ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`
    : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;

export function canEditDocument(session, document) {
  return (
    document.status !== "CANCELADO" &&
    (session.role === "ADMIN" ||
      (session.role === "OPERATOR" && document.createdById === session.id))
  );
}

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  icon = <ArrowUpRight />,
  className = "",
  ...props
}) {
  return (
    <button className={`primary-button ${className}`} {...props}>
      <span>{children}</span>
      <span className="button-icon">{icon}</span>
    </button>
  );
}

function Eyebrow({ children, tone = "" }) {
  return (
    <span className={`eyebrow ${tone}`}>
      <span className="eyebrow-dot" />
      {children}
    </span>
  );
}

function BezelCard({ children, className = "", as: Tag = "div" }) {
  return (
    <Tag className={`bezel ${className}`}>
      <div className="bezel-core">{children}</div>
    </Tag>
  );
}

function StatusBadge({ status }) {
  const label = statusLabel(status);
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(" ", "-");
  return (
    <span className={`status-badge status-${slug}`}>
      <span />
      {label}
    </span>
  );
}

function Avatar({ name = "?", small = false }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <span className={`avatar ${small ? "avatar-small" : ""}`}>
      {initials || "?"}
    </span>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Fólio">
      <span className="brand-mark">
        <FileText />
      </span>
      <span>fólio</span>
    </div>
  );
}

function InlineError({ error }) {
  if (!error) return null;
  return (
    <div className="inline-error" role="alert">
      <CircleHelp />
      <span>{error}</span>
    </div>
  );
}

function LoadingState({ text = "Carregando informações…" }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner dark" />
      {text}
    </div>
  );
}

function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

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
          <Eyebrow>GESTÃO DOCUMENTAL</Eyebrow>
          <h1>Organização que acolhe a rotina.</h1>
          <p>
            Protocolos seguros, histórico preservado e documentos fáceis de
            encontrar — em um só lugar.
          </p>
        </div>
        <div className="login-proof">
          <ShieldCheck />
          <span>
            <strong>Sequências protegidas</strong> por tipo de documento e por
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
              {loading ? "Entrando…" : "Entrar no Fólio"}
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

const navigationItems = [
  { path: "/inicio", label: "Início", icon: Home },
  { path: "/documentos", label: "Documentos", icon: Files },
  { path: "/departamentos", label: "Departamentos", icon: Building2, admin: true },
  { path: "/tipos", label: "Tipos", icon: FolderClock, admin: true },
  { path: "/usuarios", label: "Usuários", icon: Users, admin: true },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, admin: true },
];

function Navigation({ session, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const items = navigationItems.filter(
    (item) => !item.admin || session.role === "ADMIN",
  );
  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };
  return (
    <>
      <div className="nav-shell">
        <nav className="navbar" aria-label="Navegação principal">
          <Link
            to="/inicio"
            className="brand-button"
            onClick={closeMenus}
            aria-label="Ir para o início"
          >
            <Brand />
          </Link>
          <div className="nav-links">
            {items.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path !== "/documentos"}
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={closeMenus}
              >
                {label}
              </NavLink>
            ))}
          </div>
          <div className="nav-actions">
            <NavLink
              to="/atividades"
              aria-label="Atividades"
              title="Atividades"
              className={({ isActive }) =>
                `icon-button notification-button${isActive ? " active" : ""}`
              }
              onClick={closeMenus}
            >
              <Bell />
            </NavLink>
            <button
              className="profile-button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
            >
              <Avatar name={session.name} small />
              <span className="profile-name">{session.name.split(" ")[0]}</span>
              <ChevronDown />
            </button>
            <IconButton
              label="Abrir menu"
              className="menu-button"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu />
            </IconButton>
          </div>
          {profileOpen && (
            <div className="profile-popover">
              <div className="profile-summary">
                <Avatar name={session.name} />
                <div>
                  <strong>{session.name}</strong>
                  <span>{roleLabels[session.role]}</span>
                </div>
              </div>
              <Link to="/atividades" onClick={closeMenus}>
                <Activity /> Histórico de atividades
              </Link>
              <button onClick={onLogout}>
                <LogOut /> Sair
              </button>
            </div>
          )}
        </nav>
      </div>
      {menuOpen && (
        <div className="mobile-menu bezel">
          <div className="bezel-core">
            <div className="mobile-menu-head">
              <span>Navegação</span>
              <IconButton
                label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </IconButton>
            </div>
            {items.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path !== "/documentos"}
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={closeMenus}
              >
                <Icon />
                {label}
                <ChevronRight />
              </NavLink>
            ))}
            {session.role !== "VIEWER" && (
              <Link to="/documentos/novo" onClick={closeMenus}>
                <FilePlus2 />
                Novo documento
                <ChevronRight />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header wrap reveal-now">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Dashboard({
  types,
  onNew,
  onViewDocuments,
  onSelect,
  reloadKey,
  canCreate,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get(`/dashboard?year=${currentYear}&month=${currentMonth}`)
      .then((result) => active && setData(result.data))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [reloadKey]);
  const memo =
    types.find((type) => type.prefix === "MEMO" && type.active) ||
    types.find((type) => type.active);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!memo) return;
    api
      .get(`/protocols/next${queryString({ typeId: memo.id, date: today })}`)
      .then((result) => setPreview(result.data))
      .catch(() => setPreview(null));
  }, [memo, reloadKey]);
  if (error)
    return (
      <main className="page-content wrap">
        <InlineError error={error} />
      </main>
    );
  if (!data)
    return (
      <main className="page-content wrap">
        <LoadingState />
      </main>
    );
  const activeFlow = ["REGISTRADO", "EM_ELABORACAO", "ENVIADO"].reduce(
    (sum, status) => sum + (data.byStatus[status] || 0),
    0,
  );
  const maxStatus = Math.max(
    1,
    ...statusOptions.map((item) => data.byStatus[item.value] || 0),
  );
  return (
    <>
      <section className="hero wrap reveal-now">
        <div className="hero-copy">
          <Eyebrow>AMBIENTE SEGURO · {formatDate(today).toUpperCase()}</Eyebrow>
          <h1>
            Documentos em ordem. <span>Rotinas mais leves.</span>
          </h1>
          <p className="lede">
            Registre, acompanhe e encontre cada documento administrativo com a
            tranquilidade de uma numeração confiável.
          </p>
          <div className="hero-actions">
            {canCreate && (
              <PrimaryButton onClick={onNew}>Registrar documento</PrimaryButton>
            )}
            <button className="ghost-button" onClick={onViewDocuments}>
              Consultar registros <ChevronRight />
            </button>
          </div>
          <div className="trust-line">
            <span className="avatar-stack">
              <Avatar name="Equipe de protocolo" small />
            </span>
            <span>
              <strong>{activeFlow} documentos</strong> em andamento agora
            </span>
          </div>
        </div>
        <BezelCard className="protocol-preview">
          <div className="preview-top">
            <div>
              <span className="micro-label">PRÓXIMO PROTOCOLO</span>
              <span className="live-label">
                <i />
                PRÉVIA
              </span>
            </div>
            <span className="soft-icon">
              <Sparkles />
            </span>
          </div>
          <div className="protocol-number">
            {preview?.protocol || formatProtocol(memo, 1, currentYear)}
          </div>
          <p>A sequência só é reservada ao confirmar o cadastro.</p>
          <div className="protocol-meta">
            <span>
              <FileText />
              {memo?.name || "Tipo documental"}
            </span>
            <span>
              <CalendarDays />
              Ano de {currentYear}
            </span>
          </div>
          {canCreate && (
            <button className="preview-action" onClick={onNew}>
              <span>Registrar documento</span>
              <ArrowUpRight />
            </button>
          )}
          <div className="preview-foot">
            <ShieldCheck />
            <span>Números cancelados não são reutilizados.</span>
          </div>
        </BezelCard>
      </section>
      <section className="block wrap">
        <div className="section-heading reveal">
          <div>
            <Eyebrow>PANORAMA</Eyebrow>
            <h2>Uma visão clara do que está circulando.</h2>
          </div>
          <p>Indicadores calculados diretamente no banco de dados.</p>
        </div>
        <div className="bento-grid reveal">
          <BezelCard className="metric-card metric-primary wide-card">
            <div className="metric-head">
              <span className="metric-icon">
                <Files />
              </span>
            </div>
            <div className="metric-value">{data.total}</div>
            <strong>documentos no acervo</strong>
            <p>Incluindo registros cancelados.</p>
          </BezelCard>
          <BezelCard className="metric-card">
            <div className="metric-head">
              <span className="metric-icon terracotta">
                <CalendarDays />
              </span>
              <span className="micro-label">MÊS</span>
            </div>
            <div className="metric-value">{data.monthTotal}</div>
            <strong>registrados no mês</strong>
            <p>Em todos os tipos documentais.</p>
          </BezelCard>
          <BezelCard className="metric-card tall-card dark-card">
            <div className="metric-head">
              <span className="metric-icon light">
                <Activity />
              </span>
              <span className="micro-label light-text">EM FLUXO</span>
            </div>
            <div className="metric-value">{activeFlow}</div>
            <strong>pedem acompanhamento</strong>
            <div className="flow-list">
              {data.recent.slice(0, 3).map((document) => (
                <button key={document.id} onClick={() => onSelect(document)}>
                  <span>{document.protocol}</span>
                  <StatusBadge status={document.status} />
                </button>
              ))}
            </div>
          </BezelCard>
          <BezelCard className="metric-card">
            <div className="metric-head">
              <span className="metric-icon coral">
                <FileArchive />
              </span>
              <span className="micro-label">{currentYear}</span>
            </div>
            <div className="metric-value">{data.yearTotal}</div>
            <strong>documentos no ano</strong>
            <p>Sequências por competência.</p>
          </BezelCard>
        </div>
      </section>
      <section className="block wrap overview-section">
        <div className="section-heading reveal">
          <div>
            <Eyebrow>ACOMPANHAMENTO</Eyebrow>
            <h2>O que movimentou o protocolo.</h2>
          </div>
          <button className="ghost-button" onClick={onViewDocuments}>
            Ver todos <ChevronRight />
          </button>
        </div>
        <div className="overview-grid reveal">
          <BezelCard className="recent-card">
            <div className="card-title-row">
              <div>
                <span className="micro-label">ATUALIZAÇÕES RECENTES</span>
                <h3>Últimos registros</h3>
              </div>
              <span className="soft-icon">
                <Clock3 />
              </span>
            </div>
            <div className="document-list">
              {data.recent.length ? (
                data.recent.map((document) => (
                  <button
                    key={document.id}
                    className="document-row"
                    onClick={() => onSelect(document)}
                  >
                    <span className="doc-file-icon">
                      <FileText />
                    </span>
                    <span className="doc-main">
                      <strong>{document.protocol}</strong>
                      <small>{document.subject}</small>
                    </span>
                    <span className="doc-date">
                      {formatDate(document.date)}
                    </span>
                    <StatusBadge status={document.status} />
                    <ChevronRight />
                  </button>
                ))
              ) : (
                <EmptyState
                  icon={<FileText />}
                  title="Acervo vazio"
                  text="O primeiro registro aparecerá aqui."
                />
              )}
            </div>
          </BezelCard>
          <BezelCard className="status-card">
            <div className="card-title-row">
              <div>
                <span className="micro-label">DISTRIBUIÇÃO</span>
                <h3>Por situação</h3>
              </div>
              <span className="soft-icon">
                <BarChart3 />
              </span>
            </div>
            <div className="status-bars">
              {statusOptions.map(({ value, label }) => (
                <div className="status-bar-row" key={value}>
                  <div>
                    <span>{label}</span>
                    <strong>{data.byStatus[value] || 0}</strong>
                  </div>
                  <span className="status-bar">
                    <i
                      style={{
                        transform: `scaleX(${(data.byStatus[value] || 0) / maxStatus})`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </BezelCard>
        </div>
      </section>
    </>
  );
}

function Documents({ types, onNew, onSelect, reloadKey, canCreate }) {
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
    setPage(1);
  }, [debouncedQuery, typeId, status, year]);
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
  const clearFilters = () => {
    setQuery("");
    setTypeId("all");
    setStatus("all");
    setYear(String(currentYear));
  };
  return (
    <>
      <PageHeader
        eyebrow="ACERVO DOCUMENTAL"
        title="Documentos"
        description="Consulte protocolos, acompanhe situações e encontre informações sem percorrer planilhas."
        action={
          canCreate ? (
            <PrimaryButton onClick={onNew} icon={<Plus />}>
              Novo documento
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
                ariaLabel="Tipo documental"
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
                ariaLabel="Status documental"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "Todos os status" },
                  ...statusOptions,
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
        <InlineError error={error} />
        {!result ? (
          <LoadingState />
        ) : (
          <>
            <div className="results-meta">
              <span>
                <strong>{result.pagination.total}</strong> documento(s)
                encontrado(s)
              </span>
              <span>Ordenados pelos mais recentes</span>
            </div>
            <BezelCard className="table-card reveal">
              {result.data.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Protocolo</th>
                        <th>Documento</th>
                        <th>Emissão</th>
                        <th>Origem → destino</th>
                        <th>Responsável</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((document) => (
                        <tr
                          key={document.id}
                          onClick={() => onSelect(document)}
                        >
                          <td data-label="Protocolo">
                            <strong className="protocol-link">
                              {document.protocol}
                            </strong>
                          </td>
                          <td data-label="Documento">
                            <strong>{document.type.name}</strong>
                            <small>{document.subject}</small>
                          </td>
                          <td data-label="Emissão">
                            {formatDate(document.date)}
                          </td>
                          <td data-label="Origem e destino">
                            <span className="route-cell">
                              <small>{document.origin}</small>
                              <ArrowUpRight />
                              <small>{document.destination}</small>
                            </span>
                          </td>
                          <td data-label="Responsável">
                            <span className="person-cell">
                              <Avatar name={document.responsible} small />
                              {document.responsible}
                            </span>
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
                  title="Nenhum documento encontrado"
                  text="Revise os filtros ou registre um novo documento."
                  action={
                    canCreate ? (
                      <PrimaryButton onClick={onNew} icon={<Plus />}>
                        Novo documento
                      </PrimaryButton>
                    ) : null
                  }
                />
              )}
            </BezelCard>
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

export function AttachmentPicker({ file, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const remove = () => {
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };
  return (
    <div className="span-two attachment-picker">
      <label
        className={`file-drop ${file ? "has-file" : ""} ${disabled ? "disabled" : ""}`}
      >
        <Upload />
        <span>
          <strong>{file?.name || "Adicionar documento anexo"}</strong>
          <small>
            {file
              ? `${formatFileSize(file.size)} · PDF, DOCX, XLSX, JPEG ou PNG`
              : "PDF, DOCX, XLSX, JPEG ou PNG · até 10 MB"}
          </small>
        </span>
        <input
          ref={inputRef}
          type="file"
          disabled={disabled}
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </label>
      {file && (
        <button
          type="button"
          className="selected-file-remove"
          disabled={disabled}
          onClick={remove}
        >
          <Trash2 />
          Remover anexo selecionado
        </button>
      )}
    </div>
  );
}

function NewDocument({
  types,
  departments,
  users,
  session,
  onBack,
  onSaved,
  notify,
}) {
  const activeTypes = types.filter((item) => item.active);
  const activeDepartments = departments.filter((item) => item.active);
  const activeUsers = users.filter((item) => item.active);
  const [form, setForm] = useState({
    typeId: activeTypes[0]?.id || "",
    date: today,
    originDepartmentId: activeDepartments[0]?.id || "",
    destinationDepartmentId:
      activeDepartments[1]?.id || activeDepartments[0]?.id || "",
    destinationText: "",
    destinationMode: "internal",
    subject: "",
    responsibleUserId: session.id,
    status: "REGISTRADO",
    notes: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  useEffect(() => {
    if (!form.typeId || !form.date) return;
    api
      .get(
        `/protocols/next${queryString({ typeId: form.typeId, date: form.date })}`,
      )
      .then((result) => setPreview(result.data))
      .catch(() => setPreview(null));
  }, [form.typeId, form.date]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        typeId: form.typeId,
        date: form.date,
        originDepartmentId: form.originDepartmentId,
        destinationDepartmentId:
          form.destinationMode === "internal"
            ? form.destinationDepartmentId
            : null,
        destinationText:
          form.destinationMode === "external" ? form.destinationText : null,
        subject: form.subject,
        responsibleUserId:
          session.role === "OPERATOR" ? session.id : form.responsibleUserId,
        status: form.status,
        notes: form.notes,
      };
      let document = (await api.post("/documents", payload)).data;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        try {
          await api.post(`/documents/${document.id}/attachments`, body);
          document = (await api.get(`/documents/${document.id}`)).data;
        } catch (uploadError) {
          notify(
            `Documento ${document.protocol} salvo, mas o anexo falhou: ${uploadError.message}`,
            true,
          );
        }
      }
      notify(`Documento ${document.protocol} registrado com sucesso.`);
      onSaved(document);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="NOVO REGISTRO"
        title="Registrar documento"
        description="Preencha os dados essenciais. O protocolo definitivo será emitido pelo servidor ao confirmar."
      />
      <main className="page-content wrap form-layout">
        <form className="document-form" onSubmit={submit}>
          <div className="inline-protocol reveal">
            <span className="soft-icon">
              <Sparkles />
            </span>
            <div>
              <span className="micro-label">PRÉVIA · NÃO RESERVADA</span>
              <strong>{preview?.protocol || "Selecione tipo e data"}</strong>
            </div>
            <span className="live-label">
              <i />
              PRÉVIA
            </span>
          </div>
          <BezelCard className="form-section reveal">
            <div className="form-section-head">
              <span>01</span>
              <div>
                <h2>Identificação</h2>
                <p>Tipo, data e percurso do documento.</p>
              </div>
            </div>
            <div className="fields-grid two-cols">
              <label>
                Tipo de documento <span>*</span>
                <SearchableSelect
                  ariaLabel="Tipo de documento"
                  value={form.typeId}
                  onChange={(value) => update("typeId", value)}
                  options={activeTypes.map((type) => ({
                    value: type.id,
                    label: `${type.name} · ${type.prefix}`,
                    keywords: [type.prefix],
                  }))}
                  required
                />
              </label>
              <label>
                Data de emissão <span>*</span>
                <DatePicker
                  ariaLabel="Data de emissão"
                  value={form.date}
                  onChange={(value) => update("date", value)}
                  required
                />
              </label>
              <label>
                Origem <span>*</span>
                <SearchableSelect
                  ariaLabel="Departamento de origem"
                  value={form.originDepartmentId}
                  onChange={(value) => update("originDepartmentId", value)}
                  options={activeDepartments.map((department) => ({
                    value: department.id,
                    label: `${department.code} · ${department.name}`,
                    keywords: [department.name],
                  }))}
                  required
                />
              </label>
              <label>
                Tipo de destino
                <SoftSelect
                  ariaLabel="Tipo de destino"
                  value={form.destinationMode}
                  onChange={(value) => update("destinationMode", value)}
                  options={[
                    { value: "internal", label: "Departamento interno" },
                    { value: "external", label: "Destino externo" },
                  ]}
                />
              </label>
              {form.destinationMode === "internal" ? (
                <label className="span-two">
                  Destino <span>*</span>
                  <SearchableSelect
                    ariaLabel="Departamento de destino"
                    value={form.destinationDepartmentId}
                    onChange={(value) =>
                      update("destinationDepartmentId", value)
                    }
                    options={activeDepartments.map((department) => ({
                      value: department.id,
                      label: `${department.code} · ${department.name}`,
                      keywords: [department.name],
                    }))}
                    required
                  />
                </label>
              ) : (
                <label className="span-two">
                  Destino externo <span>*</span>
                  <input
                    value={form.destinationText}
                    onChange={(event) =>
                      update("destinationText", event.target.value)
                    }
                    maxLength="160"
                    required
                  />
                </label>
              )}
              <label className="span-two">
                Assunto <span>*</span>
                <textarea
                  value={form.subject}
                  onChange={(event) => update("subject", event.target.value)}
                  rows="3"
                  maxLength="300"
                  required
                />
              </label>
            </div>
          </BezelCard>
          <BezelCard className="form-section reveal">
            <div className="form-section-head">
              <span>02</span>
              <div>
                <h2>Acompanhamento</h2>
                <p>Responsável, situação e informações complementares.</p>
              </div>
            </div>
            <div className="fields-grid two-cols">
              <label>
                Responsável <span>*</span>
                <SearchableSelect
                  ariaLabel="Responsável"
                  value={form.responsibleUserId}
                  onChange={(value) => update("responsibleUserId", value)}
                  options={activeUsers.map((user) => ({
                    value: user.id,
                    label: user.name,
                    keywords: [user.email],
                  }))}
                  disabled={session.role === "OPERATOR"}
                  required
                />
              </label>
              <label>
                Status inicial <span>*</span>
                <SoftSelect
                  ariaLabel="Status inicial"
                  value={form.status}
                  onChange={(value) => update("status", value)}
                  options={statusOptions.filter(
                    (item) => item.value !== "CANCELADO",
                  )}
                  required
                />
              </label>
              <label className="span-two">
                Observações
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows="4"
                  maxLength="4000"
                />
              </label>
              <AttachmentPicker
                file={file}
                onChange={setFile}
                disabled={saving}
              />
            </div>
          </BezelCard>
          <InlineError error={error} />
          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Cancelar
            </button>
            <PrimaryButton
              type="submit"
              disabled={
                saving || !activeTypes.length || !activeDepartments.length
              }
              icon={saving ? <span className="spinner" /> : <Check />}
            >
              {saving ? "Salvando…" : "Confirmar e registrar"}
            </PrimaryButton>
          </div>
        </form>
        <aside className="form-aside reveal">
          <BezelCard className="aside-card">
            <span className="soft-icon sage">
              <ShieldCheck />
            </span>
            <h3>Numeração protegida</h3>
            <p>
              Cada tipo tem uma sequência anual própria. Cancelamentos
              permanecem no histórico.
            </p>
            <ul>
              <li>
                <Check />
                Transação no SQLite
              </li>
              <li>
                <Check />
                Sem edição manual
              </li>
              <li>
                <Check />
                Histórico automático
              </li>
            </ul>
          </BezelCard>
        </aside>
      </main>
    </>
  );
}

function DetailPanel({ document, session, onClose, onUpdate, notify }) {
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [attachmentToRemove, setAttachmentToRemove] = useState(null);
  useEffect(() => {
    if (!document) return;
    api
      .get(`/documents/${document.id}/history`)
      .then((result) => setHistory(result.data))
      .catch((err) => setError(err.message));
  }, [document]);
  if (!document) return null;
  const canEdit = canEditDocument(session, document);
  const updateStatus = async (status) => {
    setBusy(true);
    setError("");
    try {
      const updated = (
        await api.patch(`/documents/${document.id}/status`, { status })
      ).data;
      onUpdate(updated);
      notify(`Status de ${document.protocol} atualizado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = (await api.post(`/documents/${document.id}/cancel`)).data;
      onUpdate(updated);
      setConfirmingCancel(false);
      notify(`${document.protocol} foi cancelado.`);
    } catch (err) {
      setError(err.message);
      setConfirmingCancel(false);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post(`/documents/${document.id}/attachments`, body);
      const updated = (await api.get(`/documents/${document.id}`)).data;
      onUpdate(updated);
      notify("Anexo adicionado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const removeAttachment = async () => {
    if (!attachmentToRemove) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/attachments/${attachmentToRemove.id}`);
      const [updated, latestHistory] = await Promise.all([
        api.get(`/documents/${document.id}`),
        api.get(`/documents/${document.id}/history`),
      ]);
      onUpdate(updated.data);
      setHistory(latestHistory.data);
      notify(`Anexo ${attachmentToRemove.originalName} removido.`);
      setAttachmentToRemove(null);
    } catch (err) {
      setError(err.message);
      setAttachmentToRemove(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div
        className="drawer-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${document.protocol}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <aside className="detail-drawer">
          <div className="drawer-head">
            <button className="text-button" onClick={onClose}>
              <ArrowLeft />
              Voltar
            </button>
            <div>
              <IconButton label="Imprimir" onClick={() => window.print()}>
                <FileText />
              </IconButton>
              <IconButton label="Fechar" onClick={onClose}>
                <X />
              </IconButton>
            </div>
          </div>
          <div className="drawer-content">
            <div className="detail-hero">
              <Eyebrow>{document.type.name}</Eyebrow>
              <h2>{document.protocol}</h2>
              <p>{document.subject}</p>
              <StatusBadge status={document.status} />
            </div>
            <div className="detail-grid">
              <div>
                <span>Data de emissão</span>
                <strong>{formatDate(document.date)}</strong>
              </div>
              <div>
                <span>Responsável</span>
                <strong>{document.responsible}</strong>
              </div>
              <div>
                <span>Origem</span>
                <strong>{document.origin}</strong>
              </div>
              <div>
                <span>Destino</span>
                <strong>{document.destination}</strong>
              </div>
            </div>
            <InlineError error={error} />
            <section className="detail-section detail-status-section">
              <div className="detail-section-title">
                <h3>Situação do documento</h3>
                <Activity />
              </div>
              {canEdit ? (
                <label>
                  Status atual
                  <SoftSelect
                    ariaLabel="Status atual"
                    value={
                      document.status === "CANCELADO"
                        ? "CANCELADO"
                        : document.status
                    }
                    disabled={busy || document.status === "CANCELADO"}
                    onChange={updateStatus}
                    options={statusOptions.filter(
                      (item) =>
                        item.value !== "CANCELADO" ||
                        document.status === "CANCELADO",
                    )}
                  />
                </label>
              ) : (
                <p>
                  Seu perfil possui acesso somente para consulta deste registro.
                </p>
              )}
              {session.role === "ADMIN" && document.status !== "CANCELADO" && (
                <button
                  className="danger-text"
                  aria-label="Cancelar documento e preservar número"
                  disabled={busy}
                  onClick={() => setConfirmingCancel(true)}
                >
                  <span className="danger-text-icon" aria-hidden="true">
                    <X />
                  </span>
                  <span className="danger-text-copy">
                    <strong>Cancelar documento</strong>
                    <small>O número do protocolo será preservado</small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <h3>Observações e anexos</h3>
                <Paperclip />
              </div>
              <p>{document.notes || "Nenhuma observação adicionada."}</p>
              {document.attachments?.map((attachment) => (
                <div className="attachment-row" key={attachment.id}>
                  <button
                    type="button"
                    className="attachment-download"
                    onClick={() =>
                      api
                        .download(
                          `/attachments/${attachment.id}`,
                          attachment.originalName,
                        )
                        .catch((err) => setError(err.message))
                    }
                  >
                    <span className="doc-file-icon">
                      <FileText />
                    </span>
                    <span>
                      <strong>{attachment.originalName}</strong>
                      <small>{formatFileSize(attachment.size)}</small>
                    </span>
                    <Download />
                  </button>
                  {canEdit && (
                    <IconButton
                      label={`Remover anexo ${attachment.originalName}`}
                      className="attachment-remove"
                      disabled={busy}
                      onClick={() => setAttachmentToRemove(attachment)}
                    >
                      <Trash2 />
                    </IconButton>
                  )}
                </div>
              ))}
              {!document.attachments?.length && (
                <div className="empty-inline">
                  <Paperclip />
                  Nenhum arquivo anexado
                </div>
              )}
              {canEdit && (
                <label className="ghost-button attachment-upload">
                  <Upload />
                  Adicionar anexo
                  <input
                    type="file"
                    hidden
                    disabled={busy}
                    accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                    onChange={(event) => upload(event.target.files?.[0])}
                  />
                </label>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <h3>Histórico</h3>
                <FolderClock />
              </div>
              <div className="timeline">
                {history.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <i />
                    <div>
                      <strong>{item.description}</strong>
                      <span>
                        {formatDateTime(item.createdAt)} · {item.user.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="detail-footer">
              <small>
                Cadastrado em {formatDateTime(document.createdAt)} por{" "}
                {document.createdBy.name}
              </small>
              <small>
                Última alteração em {formatDateTime(document.updatedAt)}
              </small>
            </div>
          </div>
        </aside>
      </div>
      {confirmingCancel && (
        <CancelDocumentModal
          protocol={document.protocol}
          busy={busy}
          onClose={() => {
            if (!busy) setConfirmingCancel(false);
          }}
          onConfirm={cancel}
        />
      )}
      {attachmentToRemove && (
        <RemoveAttachmentModal
          attachment={attachmentToRemove}
          busy={busy}
          onClose={() => {
            if (!busy) setAttachmentToRemove(null);
          }}
          onConfirm={removeAttachment}
        />
      )}
    </>
  );
}

export function SimpleModal({
  title,
  description,
  onClose,
  children,
  className = "",
  role = "dialog",
}) {
  return createPortal(
    <div
      className="modal-overlay"
      role={role}
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <BezelCard className={`modal-card ${className}`}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <IconButton label="Fechar" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        {children}
      </BezelCard>
    </div>,
    document.body,
  );
}

export function CancelDocumentModal({
  protocol,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="cancel-confirm-modal"
      title="Cancelar documento?"
      description="Revise esta ação antes de confirmar. O cancelamento não poderá ser desfeito."
      onClose={onClose}
    >
      <div className="cancel-confirm-body">
        <div className="cancel-protocol-card">
          <span aria-hidden="true">
            <FileArchive />
          </span>
          <div>
            <small>PROTOCOLO</small>
            <strong>{protocol}</strong>
          </div>
        </div>
        <div className="cancel-preservation-note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Numeração preservada</strong>
            <p>O protocolo continuará no histórico e nunca será reutilizado.</p>
          </div>
        </div>
        <div className="modal-actions cancel-confirm-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter documento
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Cancelando…" : "Confirmar cancelamento"}</span>
            <span aria-hidden="true">
              <X />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}

export function RemoveAttachmentModal({
  attachment,
  busy = false,
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="remove-attachment-modal"
      title="Remover anexo?"
      description="O arquivo será excluído permanentemente do banco de dados."
      onClose={onClose}
    >
      <div className="remove-attachment-body">
        <div className="remove-attachment-card">
          <span aria-hidden="true">
            <FileText />
          </span>
          <div>
            <small>ARQUIVO</small>
            <strong title={attachment.originalName}>
              {attachment.originalName}
            </strong>
            <p>{formatFileSize(attachment.size)}</p>
          </div>
        </div>
        <div className="removal-audit-note">
          <CircleHelp aria-hidden="true" />
          <div>
            <strong>Conteúdo irrecuperável</strong>
            <p>
              Nome, tamanho, usuário e data permanecerão registrados no
              histórico.
            </p>
          </div>
        </div>
        <div className="modal-actions remove-attachment-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter anexo
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Removendo…" : "Remover definitivamente"}</span>
            <span aria-hidden="true">
              <Trash2 />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}

function Departments({ departments, refresh, notify }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/departments", form);
      await refresh();
      setAdding(false);
      setForm({ name: "", code: "" });
      notify("Departamento adicionado.");
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = async (department) => {
    try {
      await api.patch(`/departments/${department.id}`, {
        active: !department.active,
      });
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="ESTRUTURA ADMINISTRATIVA"
        title="Departamentos"
        description="Mantenha as unidades de origem e destino organizadas e consistentes."
        action={
          <PrimaryButton onClick={() => setAdding(true)} icon={<Plus />}>
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
          {departments.map((department) => (
            <BezelCard className="department-card" key={department.id}>
              <div className="department-icon">
                <Building2 />
              </div>
              <div className="department-copy">
                <span className="micro-label">{department.code}</span>
                <h3>{department.name}</h3>
                <StatusBadge status={department.active ? "Ativo" : "Inativo"} />
              </div>
              <label
                className="switch"
                aria-label={`${department.active ? "Desativar" : "Ativar"} ${department.name}`}
              >
                <input
                  type="checkbox"
                  checked={department.active}
                  onChange={() => toggle(department)}
                />
                <span />
              </label>
            </BezelCard>
          ))}
        </div>
      </main>
      {adding && (
        <SimpleModal
          title="Novo departamento"
          description="A unidade ficará disponível nos campos de origem e destino."
          onClose={() => setAdding(false)}
        >
          <form onSubmit={save} className="form-stack">
            <label>
              Nome completo
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
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
                required
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
                Adicionar
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
    </>
  );
}

function Types({ types, refresh, notify }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    prefix: "",
    separator: "/",
    digits: 3,
  });
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/document-types", {
        ...form,
        digits: Number(form.digits),
      });
      await refresh();
      setAdding(false);
      setForm({ name: "", prefix: "", separator: "/", digits: 3 });
      notify("Tipo documental criado.");
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = async (type) => {
    try {
      await api.patch(`/document-types/${type.id}`, { active: !type.active });
      await refresh();
    } catch (err) {
      notify(err.message, true);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="CONFIGURAÇÃO DOCUMENTAL"
        title="Tipos de documento"
        description="Cada tipo mantém prefixo, formato e sequência anual próprios."
        action={
          <PrimaryButton onClick={() => setAdding(true)} icon={<Plus />}>
            Novo tipo
          </PrimaryButton>
        }
      />
      <main className="page-content wrap">
        <div className="type-grid reveal">
          {types.map((type, index) => (
            <BezelCard className="type-card" key={type.id}>
              <div className={`type-monogram tone-${index % 4}`}>
                {type.prefix}
              </div>
              <div className="type-head">
                <div>
                  <span className="micro-label">
                    {type.active ? "ATIVO" : "INATIVO"}
                  </span>
                  <h3>{type.name}</h3>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={type.active}
                    onChange={() => toggle(type)}
                  />
                  <span />
                </label>
              </div>
              <div className="type-protocol">
                {formatProtocol(type, 1, currentYear)}
              </div>
              <div className="type-meta">
                <span>
                  <strong>{type._count?.documents || 0}</strong> registros
                </span>
                <span>
                  <strong>{type.digits}</strong> dígitos
                </span>
                <span>
                  Separador <strong>{type.separator}</strong>
                </span>
              </div>
            </BezelCard>
          ))}
        </div>
      </main>
      {adding && (
        <SimpleModal
          title="Novo tipo de documento"
          description="Defina como os próximos protocolos serão formados."
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
            <div className="fields-grid three-cols">
              <label>
                Prefixo
                <input
                  value={form.prefix}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      prefix: event.target.value.toUpperCase().slice(0, 8),
                    })
                  }
                  required
                />
              </label>
              <label>
                Separador
                <SoftSelect
                  ariaLabel="Separador"
                  value={form.separator}
                  onChange={(value) => setForm({ ...form, separator: value })}
                  options={[
                    { value: "/", label: "/" },
                    { value: "-", label: "-" },
                  ]}
                />
              </label>
              <label>
                Dígitos
                <input
                  type="number"
                  min="3"
                  max="6"
                  value={form.digits}
                  onChange={(event) =>
                    setForm({ ...form, digits: event.target.value })
                  }
                />
              </label>
            </div>
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
                Criar tipo
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
    </>
  );
}

function UsersPage({ users, refresh, notify }) {
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

function Reports({ types, notify }) {
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
        `relatorio-documentos.${format}`,
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
                ariaLabel="Tipo documental do relatório"
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
        </BezelCard>
        <aside className="report-side reveal">
          <div className="help-card">
            <ShieldCheck />
            <div>
              <strong>Dados preservados</strong>
              <p>
                As exportações incluem documentos cancelados e sua numeração.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}

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
        description="Uma trilha transparente de tudo o que mudou nos documentos."
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

function Toast({ message, error, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast ${error ? "toast-error" : ""}`} role="status">
      <span>{error ? <CircleHelp /> : <Check />}</span>
      <div>
        <strong>{error ? "Atenção" : "Tudo certo"}</strong>
        <p>{message}</p>
      </div>
      <IconButton label="Fechar" onClick={onClose}>
        <X />
      </IconButton>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div>
        <span>FÓLIO · GESTÃO DOCUMENTAL</span>
        <span>SQLITE · SEQUÊNCIAS SEGURAS · HISTÓRICO PRESERVADO</span>
      </div>
    </footer>
  );
}

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

function RequireRole({ session, roles, children }) {
  if (roles.includes(session.role)) return children;
  return (
    <RouteMessage
      eyebrow="ACESSO RESTRITO"
      title="Acesso não autorizado"
      description="Seu perfil não possui permissão para acessar esta página."
    />
  );
}

function PageTitle() {
  const location = useLocation();
  useEffect(() => {
    const pathname = location.pathname;
    let title = "Fólio · Gestão documental";
    if (pathname === "/login") title = "Acesso · Fólio";
    else if (pathname === "/inicio" || pathname === "/") title = "Início · Fólio";
    else if (pathname === "/documentos") title = "Documentos · Fólio";
    else if (pathname === "/documentos/novo") title = "Novo registro · Fólio";
    else if (pathname.startsWith("/documentos/"))
      title = "Detalhes do documento · Fólio";
    else if (pathname === "/departamentos") title = "Departamentos · Fólio";
    else if (pathname === "/tipos") title = "Tipos documentais · Fólio";
    else if (pathname === "/usuarios") title = "Usuários · Fólio";
    else if (pathname === "/relatorios") title = "Relatórios · Fólio";
    else if (pathname === "/atividades") title = "Atividades · Fólio";
    else title = "Página não encontrada · Fólio";
    document.title = title;
  }, [location.pathname]);
  return null;
}

function ScrollToPageTop() {
  const location = useLocation();
  const pageKey =
    location.pathname.startsWith("/documentos/") &&
    location.pathname !== "/documentos/novo"
      ? "/documentos"
      : location.pathname;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pageKey]);
  return null;
}

function DocumentsWorkspace({
  types,
  onNew,
  onSelect,
  reloadKey,
  canCreate,
}) {
  return (
    <>
      <Documents
        types={types}
        onNew={onNew}
        onSelect={onSelect}
        reloadKey={reloadKey}
        canCreate={canCreate}
      />
      <Outlet />
    </>
  );
}

function DetailRouteState({ error, onClose }) {
  return (
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={error ? "Falha ao abrir documento" : "Carregando documento"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="detail-drawer detail-route-state">
        <div className="drawer-head">
          <button className="text-button" onClick={onClose}>
            <ArrowLeft /> Voltar
          </button>
          <IconButton label="Fechar" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="drawer-content">
          {error ? (
            <div className="route-drawer-message">
              <span className="soft-icon">
                <CircleHelp />
              </span>
              <h2>Não foi possível abrir o documento</h2>
              <p>{error}</p>
              <button className="ghost-button" onClick={onClose}>
                Voltar aos documentos
              </button>
            </div>
          ) : (
            <LoadingState text="Carregando documento…" />
          )}
        </div>
      </aside>
    </div>
  );
}

function DocumentDetailsRoute({ session, onUpdate, notify }) {
  const { documentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialDocument =
    location.state?.document?.id === documentId
      ? location.state.document
      : null;
  const [documentRecord, setDocumentRecord] = useState(initialDocument);
  const [loading, setLoading] = useState(!initialDocument);
  const [error, setError] = useState("");

  const close = () => {
    if (location.state?.closeWithBack) navigate(-1);
    else
      navigate(safeInternalPath(location.state?.returnTo, "/documentos"), {
        replace: true,
      });
  };

  useEffect(() => {
    let active = true;
    setDocumentRecord(initialDocument);
    setLoading(!initialDocument);
    setError("");
    api
      .get(`/documents/${documentId}`)
      .then((result) => {
        if (active) setDocumentRecord(result.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (documentRecord?.protocol)
      document.title = `${documentRecord.protocol} · Fólio`;
  }, [documentRecord?.protocol]);

  if ((loading && !documentRecord) || error)
    return <DetailRouteState error={error} onClose={close} />;

  return (
    <DetailPanel
      document={documentRecord}
      session={session}
      onClose={close}
      onUpdate={(updatedDocument) => {
        setDocumentRecord(updatedDocument);
        onUpdate(updatedDocument);
      }}
      notify={notify}
    />
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [types, setTypes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState({ message: "", error: false });
  const notify = (message, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast({ message: "", error: false }), 5000);
  };
  const refreshTypes = async () =>
    setTypes((await api.get("/document-types")).data);
  const refreshDepartments = async () =>
    setDepartments((await api.get("/departments")).data);
  const refreshUsers = async () => setUsers((await api.get("/users")).data);
  const loadReferenceData = async (user) => {
    await Promise.all([
      refreshTypes(),
      refreshDepartments(),
      user.role === "ADMIN"
        ? refreshUsers()
        : Promise.resolve(setUsers([user])),
    ]);
  };

  useEffect(() => {
    [
      "folio-session",
      "folio-documents",
      "folio-types",
      "folio-departments",
    ].forEach((key) => localStorage.removeItem(key));
    api
      .get("/auth/me")
      .then(async (result) => {
        await loadReferenceData(result.data);
        setSession(result.data);
      })
      .catch((error) => {
        if (!(error instanceof ApiClientError) || error.status !== 401)
          notify(error.message, true);
        setSession(null);
      });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    const register = () => {
      if (typeof document === "undefined") return;
      document
        .querySelectorAll(".reveal:not(.is-in)")
        .forEach((element) => observer.observe(element));
    };
    const frame = window.requestAnimationFrame(register);
    const mutations = new MutationObserver(register);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  if (session === undefined)
    return (
      <>
        <PageTitle />
        <main className="login-page">
          <div className="ambient-mesh" />
          <LoadingState text="Verificando sessão…" />
        </main>
      </>
    );
  if (!session)
    return (
      <>
        <PageTitle />
        <Routes>
          <Route
            path="/login"
            element={
              <Login
                onLogin={async (user) => {
                  await loadReferenceData(user);
                  setSession(user);
                  const destination = safeInternalPath(location.state?.from);
                  navigate(destination, { replace: true });
                }}
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
                state={{
                  from: `${location.pathname}${location.search}${location.hash}`,
                }}
              />
            }
          />
        </Routes>
      </>
    );

  const canCreate = session.role !== "VIEWER";
  const goNew = () => canCreate && navigate("/documentos/novo");
  const openDocument = (documentRecord) =>
    navigate(`/documentos/${encodeURIComponent(documentRecord.id)}`, {
      state: {
        document: documentRecord,
        returnTo: `${location.pathname}${location.search}${location.hash}`,
        closeWithBack: true,
      },
    });
  const saved = (document) => {
    setReloadKey((value) => value + 1);
    navigate(`/documentos/${encodeURIComponent(document.id)}`, {
      replace: true,
      state: { document, returnTo: "/documentos", closeWithBack: false },
    });
  };
  const updated = () => {
    setReloadKey((value) => value + 1);
  };
  const logout = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setSession(null);
    navigate("/login", { replace: true });
  };
  const loginReturnPath = safeInternalPath(location.state?.from);

  return (
    <>
      <PageTitle />
      {location.pathname === "/login" ? (
        <Navigate to={loginReturnPath} replace />
      ) : (
        <div className="app">
          <ScrollToPageTop />
          <div className="ambient-mesh" aria-hidden="true" />
          <Navigation session={session} onLogout={logout} />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route
                path="/inicio"
                element={
                  <Dashboard
                    types={types}
                    onNew={goNew}
                    onViewDocuments={() => navigate("/documentos")}
                    onSelect={openDocument}
                    reloadKey={reloadKey}
                    canCreate={canCreate}
                  />
                }
              />
              <Route
                path="/documentos/novo"
                element={
                  <RequireRole session={session} roles={["ADMIN", "OPERATOR"]}>
                    <NewDocument
                      types={types}
                      departments={departments}
                      users={users.length ? users : [session]}
                      session={session}
                      onBack={() => navigate("/documentos")}
                      onSaved={saved}
                      notify={notify}
                    />
                  </RequireRole>
                }
              />
              <Route
                path="/documentos"
                element={
                  <DocumentsWorkspace
                    types={types}
                    onNew={goNew}
                    onSelect={openDocument}
                    reloadKey={reloadKey}
                    canCreate={canCreate}
                  />
                }
              >
                <Route
                  path=":documentId"
                  element={
                    <DocumentDetailsRoute
                      session={session}
                      onUpdate={updated}
                      notify={notify}
                    />
                  }
                />
              </Route>
              <Route
                path="/departamentos"
                element={
                  <RequireRole session={session} roles={["ADMIN"]}>
                    <Departments
                      departments={departments}
                      refresh={refreshDepartments}
                      notify={notify}
                    />
                  </RequireRole>
                }
              />
              <Route
                path="/tipos"
                element={
                  <RequireRole session={session} roles={["ADMIN"]}>
                    <Types
                      types={types}
                      refresh={refreshTypes}
                      notify={notify}
                    />
                  </RequireRole>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <RequireRole session={session} roles={["ADMIN"]}>
                    <UsersPage
                      users={users}
                      refresh={refreshUsers}
                      notify={notify}
                    />
                  </RequireRole>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <RequireRole session={session} roles={["ADMIN"]}>
                    <Reports types={types} notify={notify} />
                  </RequireRole>
                }
              />
              <Route path="/atividades" element={<ActivityPage />} />
              <Route
                path="*"
                element={
                  <RouteMessage
                    eyebrow="ROTA NÃO ENCONTRADA"
                    title="Página não encontrada"
                    description="O endereço informado não corresponde a nenhuma página desta aplicação."
                  />
                }
              />
            </Routes>
          </div>
          <Footer />
          <Toast
            message={toast.message}
            error={toast.error}
            onClose={() => setToast({ message: "", error: false })}
          />
        </div>
      )}
    </>
  );
}
