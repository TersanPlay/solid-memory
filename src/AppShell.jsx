import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileBarChart,
  FileImage,
  FilePlus2,
  Files,
  FileText,
  FileSpreadsheet,
  Filter,
  FolderClock,
  Home,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  Menu,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api, ApiClientError, queryString } from "./api.js";
const DashboardPage = lazy(() => import("./pages/Dashboard.jsx"));
const UserProfile = lazy(() => import("./pages/UserProfile.jsx"));
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
    (session.role === "admin" ||
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
    <div className="brand" aria-label="MemoryDoc">
      <span className="brand-mark">
        <FileText />
      </span>
      <span>MemoryDoc</span>
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
  const [showPassword, setShowPassword] = useState(false);
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
        <Link to="/lgpd" className="login-lgpd-card" aria-label="Abrir o Guia LGPD do MemoryDoc">
          <div className="login-lgpd-art" aria-hidden="true" />
          <div className="login-lgpd-copy"><Eyebrow>TRANSPARÊNCIA</Eyebrow><h2>Guia LGPD do MemoryDoc</h2><p>Veja o que já foi implementado, o que falta e o roadmap de privacidade do MVP.</p><span className="login-lgpd-link">Abrir guia <ArrowUpRight /></span></div>
        </Link>
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <Eye />
                </button>
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
            <CircleHelp /> Solicite acesso ao administrador responsável. <Link to="/lgpd">Guia LGPD</Link> · <Link to="/privacidade">Privacidade</Link> · <Link to="/cookies">Cookies</Link>
          </div>
        </BezelCard>
      </section>
    </main>
  );
}

const legalLinks = {
  lgpd: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  ecaDigital: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm',
  anpd: 'https://www.gov.br/anpd/pt-br/assuntos/legislacao',
};

const isLgpdAttention = (value) => /ainda falta|falta implementar|faltam|pendente|pendentes|precisa ser|precisam ser|não foi|não há|não possui|deve ser definido|revisar|reavalia|não identificado|não implementado|roadmap/i.test(String(value));
const lgpdStatusPattern = /^\[(IMPLEMENTADO|OK|PARCIAL|PENDENTE)\]\s*/i;
const lgpdStatusMeta = (value) => {
  const match = String(value).match(lgpdStatusPattern);
  if (!match) return { status: '', text: String(value) };
  const normalized = match[1].toUpperCase();
  return { status: normalized === 'OK' ? 'IMPLEMENTADO' : normalized, text: String(value).replace(lgpdStatusPattern, '') };
};
const lgpdStatusLabel = (status) => status === 'IMPLEMENTADO' ? 'OK' : status === 'PARCIAL' ? 'Parcial' : status === 'PENDENTE' ? 'Pendente' : '';
const lgpdPriorityClass = (value) => {
  const normalized = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (normalized === 'alta') return 'lgpd-priority-alta';
  if (normalized === 'media') return 'lgpd-priority-media';
  if (normalized === 'baixa') return 'lgpd-priority-baixa';
  if (normalized.includes('resolvido')) return 'lgpd-priority-resolvido';
  return '';
};

function renderLegalText(value, keyPrefix) {
  const parts = String(value).split(/(Arts?\.?\s*\d+(?:º|°)?(?:\s*(?:e|,|–|-)?\s*\d+(?:º|°)?)*|LGPD|Lei nº\s*13\.709\/2018|Lei nº\s*15\.211\/2025|Res\.\s*(?:CD\/)?ANPD\s*nº\s*\d+\/\d{4})/gi).filter(Boolean);
  return parts.map((part, index) => {
    const normalized = part.toLowerCase();
    const isEca = normalized.includes('15.211/2025');
    const isResolution = normalized.includes('res.') || normalized.includes('anpd nº');
    const isLegal = isEca || isResolution || normalized === 'lgpd' || normalized.includes('13.709/2018') || /^arts?\.?\s*\d/i.test(part);
    if (!isLegal) return part;
    const href = isEca ? legalLinks.ecaDigital : isResolution ? legalLinks.anpd : legalLinks.lgpd;
    return <a className="lgpd-legal-link" key={`${keyPrefix}-${index}`} href={href} target="_blank" rel="noreferrer" title="Abrir referência oficial">{part}</a>;
  });
}

function renderLgpdInline(value) {
  const parts = String(value).split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{renderLegalText(part.slice(2, -2), `strong-${index}`)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <span key={index}>{renderLegalText(part, `text-${index}`)}</span>;
  });
}

function renderLgpdMarkdown(content) {
  const lines = String(content).split(/\r?\n/);
  const nodes = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { const Tag = `h${heading[1].length}`; nodes.push(<Tag className={isLgpdAttention(heading[2]) ? 'lgpd-attention-heading' : ''} key={index}>{renderLgpdInline(heading[2])}</Tag>); index += 1; continue; }
    if (line.trim().startsWith('>')) { const quote = line.replace(/^\s*>\s?/, ''); nodes.push(<blockquote className={isLgpdAttention(quote) ? 'lgpd-attention' : ''} key={index}>{renderLgpdInline(quote)}</blockquote>); index += 1; continue; }
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) tableLines.push(lines[index++]);
      const rows = tableLines.filter((row) => !/^\s*\|?\s*:?-{2,}/.test(row)).map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
      if (rows.length) nodes.push(<div className="lgpd-table-wrap" key={`table-${index}`}><table><thead><tr>{rows[0].map((cell, cellIndex) => <th className={lgpdPriorityClass(cell)} key={cellIndex}>{renderLgpdInline(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td className={lgpdPriorityClass(cell)} key={cellIndex}>{renderLgpdInline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        const raw = lines[index++].replace(/^\s*\d+[.)]\s+/, '');
        const status = lgpdStatusMeta(raw);
        items.push(<li className={`${isLgpdAttention(status.text) ? 'lgpd-attention ' : ''}${status.status ? `lgpd-status-${status.status.toLowerCase()}` : ''}`} key={items.length}><span className="lgpd-list-number">{items.length + 1}</span>{status.status && <span className={`lgpd-status-tag lgpd-status-tag-${status.status.toLowerCase()}`}>{lgpdStatusLabel(status.status)}</span>}<span>{renderLgpdInline(status.text)}</span></li>);
      }
      nodes.push(<ol className="lgpd-ordered-list" key={`ordered-list-${index}`}>{items}</ol>); continue;
    }
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        const raw = lines[index++].replace(/^\s*-\s+/, '');
        const checked = raw.match(/^\[([ xX])\]\s*(.*)$/);
        const itemText = checked ? checked[2] : raw;
        items.push(<li className={`${checked ? (checked[1].toLowerCase() === 'x' ? 'is-complete' : 'is-pending') : ''}${isLgpdAttention(itemText) ? ' lgpd-attention' : ''}`} key={items.length}><span className="lgpd-list-marker">{checked ? (checked[1].toLowerCase() === 'x' ? '✓' : '·') : '•'}</span><span>{renderLgpdInline(itemText)}</span></li>);
      }
      nodes.push(<ul key={`list-${index}`}>{items}</ul>); continue;
    }
    const paragraph = [line.trim()]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s+|^\s*-\s+|^\s*\d+[.)]\s+|^\s*>\s?|^\s*\|/.test(lines[index])) paragraph.push(lines[index++].trim());
    const paragraphText = paragraph.join(' ');
    nodes.push(<p className={isLgpdAttention(paragraphText) ? 'lgpd-attention' : ''} key={`paragraph-${index}`}>{renderLgpdInline(paragraphText)}</p>);
  }
  return nodes;
}

function PublicPrivacyRequestPage() {
  const [form, setForm] = useState({ requesterName: '', requesterEmail: '', type: 'ACCESS', description: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { const response = await api.post('/public/privacy-requests', form); setResult(response.data); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  return <main className="public-privacy-page"><div className="ambient-mesh" aria-hidden="true" /><section className="public-privacy-shell"><Link className="lgpd-guide-brand" to="/login"><Brand /></Link><Eyebrow>CANAL PÚBLICO · LGPD</Eyebrow><h1>Solicitação de privacidade</h1><p className="public-privacy-intro">Use este formulário para registrar um pedido de acesso, correção, eliminação ou outro direito previsto na LGPD. O pedido será encaminhado para tratamento administrativo.</p>{result ? <BezelCard className="public-privacy-success"><span className="soft-icon"><Check /></span><h2>Solicitação registrada</h2><p>Guarde esta referência para acompanhamento:</p><strong>{result.reference}</strong><small>O canal público ainda não envia respostas por e-mail. O administrador deverá validar a solicitação antes do tratamento.</small><Link className="ghost-button" to="/lgpd">Conhecer o guia LGPD</Link></BezelCard> : <BezelCard className="public-privacy-form-card"><form className="form-stack" onSubmit={submit}><label>Nome<input value={form.requesterName} onChange={(event) => setForm({ ...form, requesterName: event.target.value })} maxLength="120" required /></label><label>E-mail<input type="email" value={form.requesterEmail} onChange={(event) => setForm({ ...form, requesterEmail: event.target.value })} maxLength="254" required /></label><label>Tipo de solicitação<SoftSelect value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={privacyRequestTypes.map(([value, label]) => ({ value, label }))} ariaLabel="Tipo de solicitação" required /></label><label>Descrição<textarea rows="6" maxLength="2000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o pedido sem enviar dados desnecessários." /></label><InlineError error={error} /><PrimaryButton type="submit" disabled={saving} icon={saving ? <span className="spinner" /> : <ArrowUpRight />}>{saving ? 'Enviando…' : 'Registrar solicitação'}</PrimaryButton></form><p className="public-privacy-disclaimer">Não envie senhas, documentos completos ou dados sensíveis desnecessários. O canal está em fase de MVP e a validação de identidade será feita pelo responsável administrativo.</p></BezelCard>}<Link className="public-privacy-back" to="/login"><ArrowLeft /> Voltar ao acesso</Link></section></main>;
}

function PublicPolicyPage({ kind }) {
  const filePath = kind === 'cookies' ? '.lgpd/policies/cookie-policy-v1-draft.md' : '.lgpd/policies/privacy-policy-v1-draft.md';
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/public/lgpd').then((result) => {
      const match = result.data.files.find((item) => item.path === filePath);
      if (!match) throw new Error('Documento de transparência não encontrado.');
      setFile(match);
      setError('');
    }).catch((err) => setError(err.message));
  }, [filePath]);
  const title = kind === 'cookies' ? 'Política de Cookies' : 'Política de Privacidade';
  const eyebrow = kind === 'cookies' ? 'TRANSPARÊNCIA · COOKIES' : 'TRANSPARÊNCIA · PRIVACIDADE';
  return <main className="public-policy-page"><div className="ambient-mesh" aria-hidden="true" /><header className="public-policy-hero"><Link className="lgpd-guide-brand" to="/login"><Brand /></Link><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p>Leia o documento técnico atual do MemoryDoc. Ele é atualizado a partir dos arquivos versionados da pasta <code>.lgpd/</code>.</p><nav className="public-policy-nav" aria-label="Documentos de transparência"><Link to="/privacidade" className={kind === 'privacy' ? 'active' : ''}>Privacidade</Link><Link to="/cookies" className={kind === 'cookies' ? 'active' : ''}>Cookies</Link><Link to="/lgpd">Guia LGPD</Link></nav></header><section className="public-policy-content">{error && <InlineError error={error} />}{!file ? <LoadingState text="Lendo política…" /> : <BezelCard className="public-policy-card"><div className="public-policy-meta"><Eyebrow>{file.path}</Eyebrow><span>Atualizado em {new Date(file.updatedAt).toLocaleString('pt-BR')}</span></div><div className="lgpd-markdown">{renderLgpdMarkdown(file.content)}</div></BezelCard>}<Link className="public-privacy-back" to="/login"><ArrowLeft /> Voltar ao acesso</Link></section></main>;
}

const COOKIE_PREFERENCES_KEY = 'memorydoc-cookie-preferences-v1';

function PreferenceSwitch({ checked, disabled = false, onChange, label, description }) {
  return <div className={`cookie-category ${disabled && !checked ? 'is-unavailable' : ''}`}><button type="button" className="cookie-category-control" role="switch" aria-checked={checked} aria-disabled={disabled} disabled={disabled} onClick={() => onChange(!checked)}><span className={`preference-switch ${checked ? 'is-on' : ''} ${disabled ? 'is-disabled' : ''}`} aria-hidden="true"><span /></span><span className="cookie-category-copy"><strong>{label}</strong><small>{description}</small></span></button><em>{disabled && !checked ? 'Indisponível' : checked ? 'Ativo' : 'Desativado'}</em></div>;
}

function CookiePreferences() {
  const [preferences, setPreferences] = useState(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COOKIE_PREFERENCES_KEY) || 'null');
      if (saved) { setPreferences(saved); setAnalytics(Boolean(saved.analytics)); setMarketing(Boolean(saved.marketing)); }
    } catch { setPreferences(null); }
  }, []);
  const save = (next) => {
    const value = { necessary: true, analytics: Boolean(next.analytics), marketing: Boolean(next.marketing), decidedAt: new Date().toISOString() };
    window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(value));
    setPreferences(value);
    setOpen(false);
  };
  const showBanner = preferences === null && !open;
  return <>
    {showBanner && <aside className="cookie-banner" aria-label="Preferências de cookies"><div><strong>Cookies necessários</strong><p>Usamos apenas o cookie técnico de sessão para autenticar usuários. Não ativamos analytics ou marketing neste MVP.</p></div><div className="cookie-banner-actions"><button type="button" className="ghost-button" onClick={() => setOpen(true)}>Configurar</button><button type="button" className="primary-button" onClick={() => save({ analytics: false, marketing: false })}>Continuar</button></div></aside>}
    {open && <><button type="button" className="cookie-preferences-overlay" aria-label="Fechar preferências" onClick={() => setOpen(false)} /><aside className="cookie-preferences" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title"><div className="cookie-preferences-head"><div><Eyebrow>PREFERÊNCIAS</Eyebrow><h2 id="cookie-preferences-title">Gerenciar cookies</h2></div><button type="button" className="icon-button" aria-label="Fechar preferências" onClick={() => setOpen(false)}><X /></button></div><p>Escolha as categorias opcionais. O cookie de sessão é necessário para o acesso e não pode ser desativado neste gerenciador.</p><PreferenceSwitch checked onChange={() => undefined} disabled label="Necessários" description="Autenticação e segurança da sessão. Sempre ativos." /><PreferenceSwitch checked={analytics} onChange={setAnalytics} disabled label="Analytics" description="Não disponível no MVP; nenhum cookie analítico é instalado." /><PreferenceSwitch checked={marketing} onChange={setMarketing} disabled label="Marketing" description="Não disponível no MVP; nenhum cookie de publicidade é instalado." /><div className="cookie-preferences-actions"><Link to="/cookies" className="ghost-button" onClick={() => setOpen(false)}>Ler política</Link><button type="button" className="primary-button" onClick={() => save({ analytics, marketing })}>Salvar preferências</button></div></aside></>}
  </>;
}

const lgpdCardImages = {
  '.lgpd/consent/spec.md': { src: '/lgpd-spec-card.png', alt: 'Documento aberto com bússola e marcações de conformidade' },
  '.lgpd/data-map.md': { src: '/lgpd-data-map-card.png', alt: 'Mapa com pontos conectados e lupa' },
  '.lgpd/dsar/workflow.md': { src: '/lgpd-workflow-card.png', alt: 'Caminho de atendimento com etapas e relógio' },
  '.lgpd/gaps.md': { src: '/lgpd-gaps-card.png', alt: 'Documento analisado com lupa e peças de quebra-cabeça' },
  '.lgpd/incidents/runbook.md': { src: '/lgpd-runbook-card.png', alt: 'Pasta de resposta a incidentes com alerta e checklist' },
  '.lgpd/legal-basis.md': { src: '/lgpd-legal-basis-card.png', alt: 'Balança e documento representando bases legais' },
  '.lgpd/policies/cookie-policy-v1-draft.md': { src: '/lgpd-cookie-policy-card.png', alt: 'Janela de preferências com cookies e controles' },
  '.lgpd/policies/privacy-policy-v1-draft.md': { src: '/lgpd-privacy-policy-card.png', alt: 'Documento protegido por escudo de privacidade' },
  '.lgpd/retention.md': { src: '/lgpd-retention-card.png', alt: 'Ampulheta e caixas de arquivo representando retenção' },
  '.lgpd/security-baseline.md': { src: '/lgpd-security-baseline-card.png', alt: 'Cadeado, chave e escudo representando segurança' },
  '.lgpd/STATUS.md': { src: '/lgpd-status-card.png', alt: 'Quadro de progresso com etapas e bandeira' },
  '.lgpd/vendors/README.md': { src: '/lgpd-readme-card.png', alt: 'Manual aberto com lâmpada e caminhos de documentação' },
};

function PublicLgpdGuide() {
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  useEffect(() => {
    const load = () => api.get('/public/lgpd').then((result) => { setGuide(result.data); setError(''); }).catch((err) => setError(err.message));
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);
  return <main className="lgpd-guide-page"><div className="ambient-mesh" aria-hidden="true" /><header className="lgpd-guide-hero wrap"><Link className="lgpd-guide-brand" to="/login"><Brand /></Link><Eyebrow>TRANSPARÊNCIA DO MVP</Eyebrow><h1>Guia LGPD do MemoryDoc</h1><p>Esta página é alimentada diretamente pelos arquivos versionados da pasta <code>.lgpd/</code>. Toda alteração nesses documentos aparece aqui na próxima atualização da página.</p><div className="lgpd-guide-actions"><Link className="primary-button" to="/login"><span>Ir para o acesso</span><span className="button-icon"><ArrowUpRight /></span></Link><Link className="lgpd-action-link lgpd-action-request" to="/privacidade/solicitar"><span className="lgpd-action-icon"><ClipboardList /></span><span>Solicitar atendimento</span></Link><Link className="lgpd-action-link lgpd-action-privacy" to="/privacidade"><span className="lgpd-action-icon"><ShieldCheck /></span><span>Política de Privacidade</span></Link><Link className="lgpd-action-link lgpd-action-cookies" to="/cookies"><span className="lgpd-action-icon"><CircleHelp /></span><span>Política de Cookies</span></Link><span className="lgpd-guide-version">{guide ? `Atualizado em ${new Date(guide.generatedAt).toLocaleString('pt-BR')}` : 'Carregando documentação…'}</span></div></header><section className="lgpd-guide-content wrap">{error && <InlineError error={error} />}{!guide ? <LoadingState text="Lendo documentação LGPD…" /> : guide.files.map((file) => { const image = lgpdCardImages[file.path]; return <BezelCard className={`lgpd-guide-card lgpd-document-card ${image ? 'has-visual' : ''}`} key={file.path}><button type="button" className="lgpd-document-trigger" onClick={() => setSelectedFile(file)}>{image && <span className="lgpd-document-visual"><img src={image.src} alt="" /></span>}<span className="lgpd-document-copy"><Eyebrow>{file.path}</Eyebrow><strong>{file.title}</strong><small>Atualizado em {new Date(file.updatedAt).toLocaleDateString('pt-BR')}</small></span><span className="lgpd-document-open"><ArrowUpRight /></span></button></BezelCard>; })}<BezelCard className="lgpd-guide-warning"><CircleHelp /><div><strong>Importante</strong><p>Este guia não é uma política de privacidade nem uma declaração de conformidade. Ele reproduz a documentação técnica atual do MVP; decisões institucionais e revisão jurídica continuam pendentes.</p></div></BezelCard></section>{selectedFile && <><button type="button" className="lgpd-drawer-overlay" aria-label="Fechar documento" onClick={() => setSelectedFile(null)} /><aside className="lgpd-drawer" aria-label={`Documento ${selectedFile.title}`}><div className="lgpd-drawer-head"><div><Eyebrow>{selectedFile.path}</Eyebrow><h2>{selectedFile.title}</h2><small>Atualizado em {new Date(selectedFile.updatedAt).toLocaleString('pt-BR')}</small></div><IconButton label="Fechar documento" onClick={() => setSelectedFile(null)}><X /></IconButton></div><div className="lgpd-markdown lgpd-drawer-content">{renderLgpdMarkdown(selectedFile.content)}</div></aside></>}</main>;
}

const navigationItems = [
  { path: "/inicio", label: "Início", icon: Home },
  { path: "/documentos", label: "Protocolos", icon: Files },
  { path: "/departamentos", label: "Departamentos", icon: Building2, admin: true },
  { path: "/tipos", label: "Tipos", icon: FolderClock, admin: true },
  { path: "/usuarios", label: "Usuários", icon: Users, admin: true },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, admin: true },
  { path: "/privacidade/solicitacoes", label: "Privacidade", icon: ClipboardList },
];

function Navigation({ session, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const items = navigationItems.filter(
    (item) => !item.admin || session.role === "admin",
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
              <Link to={`/usuarios/${encodeURIComponent(session.id)}/perfil`} onClick={closeMenus}>
                <UserRound /> Meu perfil
              </Link>
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
                Novo protocolo
                <ChevronRight />
              </Link>
            )}
          </div>
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        <div className="mobile-bottom-nav-scroll">
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path !== "/documentos"}
              onClick={closeMenus}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
          <UserRound />
          <span>Perfil</span>
        </button>
        </div>
      </nav>
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
  const activeFlow = ["ENVIADO"].reduce(
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
            Protocolos em ordem. <span>Rotinas mais leves.</span>
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
    const controller = new AbortController();
    setError("");
    api
      .get(
        `/documents${queryString({ q: debouncedQuery, typeId, status, year, page, pageSize: 10 })}`,
        { signal: controller.signal },
      )
      .then((data) => active && setResult(data))
      .catch((err) => active && err.name !== "AbortError" && setError(err.message));
    return () => {
      active = false;
      controller.abort();
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
        eyebrow="REGISTRO DE PROTOCOLOS"
        title="Protocolos"
        description="Consulte protocolos, acompanhe situações e encontre informações sem percorrer planilhas."
        action={
          canCreate ? (
            <PrimaryButton onClick={onNew} icon={<Plus />}>
              Novo protocolo
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
                <strong>{result.pagination.total}</strong> protocolo(s)
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
                        <th>Registro</th>
                        <th>Emissão</th>
                        <th>Origem → destino</th>
                        <th>Responsável</th>
                        <th>Status</th>
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
                          <td data-label="Registro">
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
                            <span className="person-cell">{document.responsible}</span>
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={document.status} />
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
    status: "ENVIADO",
  });
  const [link, setLink] = useState({ url: "" });
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
    if (link.url.trim() && !/^https:\/\//i.test(link.url.trim())) {
      setError("O link relacionado deve começar com https://.");
      return;
    }
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
      };
      let document = (await api.post("/documents", payload)).data;
      if (link.url.trim()) {
        try {
          await api.post(`/documents/${document.id}/links`, link);
          document = (await api.get(`/documents/${document.id}`)).data;
        } catch (linkError) {
          notify(
            `Protocolo ${document.protocol} salvo, mas o link falhou: ${linkError.message}`,
            true,
          );
        }
      }
      notify(`Protocolo ${document.protocol} registrado com sucesso.`);
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
        title="Registrar protocolo"
        description="Preencha os dados essenciais. O número do protocolo será emitido pelo servidor ao confirmar."
      />
      <main className="page-content wrap form-layout">
        <form className="document-form" onSubmit={submit}>
          <div className="inline-protocol reveal">
            <span className="soft-icon">
              <ClipboardList />
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
                <p>Tipo, data e percurso do protocolo.</p>
              </div>
            </div>
            <div className="fields-grid two-cols">
              <label>
                Tipo de protocolo <span>*</span>
                <SearchableSelect
                  ariaLabel="Tipo de protocolo"
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
              <div className="document-flow-group span-two">
                <div className="document-flow-heading">
                    <strong>Fluxo do protocolo</strong>
                    <span>Defina de onde o protocolo parte e para onde ele será encaminhado.</span>
                </div>
                <div className="document-flow-grid">
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
                    <label>
                      Destino <span>*</span>
                      <SearchableSelect
                        ariaLabel="Departamento de destino"
                        value={form.destinationDepartmentId}
                        onChange={(value) => update("destinationDepartmentId", value)}
                        options={activeDepartments.map((department) => ({
                          value: department.id,
                          label: `${department.code} · ${department.name}`,
                          keywords: [department.name],
                        }))}
                        required
                      />
                    </label>
                  ) : (
                    <label>
                      Destino externo <span>*</span>
                      <input
                        value={form.destinationText}
                        onChange={(event) => update("destinationText", event.target.value)}
                        maxLength="160"
                        required
                      />
                    </label>
                  )}
                  <label>
                    Status inicial <span>*</span>
                    <SoftSelect
                      ariaLabel="Status inicial"
                      value={form.status}
                      onChange={(value) => update("status", value)}
                      options={statusOptions.filter((item) => item.value !== "CANCELADO")}
                      required
                    />
                  </label>
                </div>
              </div>
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
              <div className="document-link-fields">
                <label>
                  <span className="document-link-label">
                    Link HTTPS do arquivo relacionado
                    <button
                      type="button"
                      className="form-info-trigger"
                      aria-label="Como os links dos arquivos são armazenados"
                    >
                      <CircleHelp aria-hidden="true" />
                      <span className="form-info-tooltip" role="tooltip">
                        O conteúdo permanece no serviço externo. O MemoryDoc armazena apenas o link HTTPS para consulta e não faz upload, cópia ou hospedagem do arquivo.
                      </span>
                    </button>
                  </span>
                  <input type="url" inputMode="url" autoComplete="url" value={link.url} onChange={(event) => setLink((current) => ({ ...current, url: event.target.value }))} maxLength="2000" placeholder="https://..." pattern="https://.*" aria-describedby="new-protocol-link-help" />
                  <small id="new-protocol-link-help" className="field-help">Opcional. O arquivo permanece no serviço externo; este registro guarda somente o endereço HTTPS.</small>
                </label>
              </div>
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
      </main>
    </>
  );
}

function DetailPanel({ document, session, onClose, onUpdate, notify }) {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ url: "" });
  useEffect(() => {
    if (!document) return;
    setHistoryLoading(true);
    api
      .get(`/documents/${document.id}/history`)
      .then((result) => setHistory(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setHistoryLoading(false));
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
  const addLink = async (event) => {
    event.preventDefault();
    if (!linkDraft.url.trim()) return;
    if (!/^https:\/\//i.test(linkDraft.url.trim())) {
      setError("O link relacionado deve começar com https://.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/documents/${document.id}/links`, linkDraft);
      const updated = (await api.get(`/documents/${document.id}`)).data;
      onUpdate(updated);
      setLinkDraft({ url: "" });
      notify("Link HTTPS adicionado ao protocolo.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const removeLink = async (link) => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`/links/${link.id}`);
      const [updated, latestHistory] = await Promise.all([
        api.get(`/documents/${document.id}`),
        api.get(`/documents/${document.id}/history`),
      ]);
      onUpdate(updated.data);
      setHistory(latestHistory.data);
      notify(`Link ${link.title} removido do protocolo.`);
    } catch (err) {
      setError(err.message);
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
              <div className="detail-hero" aria-labelledby="protocol-detail-title">
              <Eyebrow>{document.type.name}</Eyebrow>
              <h2 id="protocol-detail-title">{document.protocol}</h2>
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
                <h3>Situação do protocolo</h3>
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
              {session.role === "admin" && document.status !== "CANCELADO" && (
                <button
                  className="danger-text"
                  aria-label="Cancelar protocolo e preservar número"
                  disabled={busy}
                  onClick={() => setConfirmingCancel(true)}
                >
                  <span className="danger-text-icon" aria-hidden="true">
                    <X />
                  </span>
                  <span className="danger-text-copy">
                    <strong>Cancelar protocolo</strong>
                    <small>O número do protocolo será preservado</small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <div>
                  <h3>Arquivo relacionado</h3>
                  <p className="detail-section-subtitle">Acesso externo por link HTTPS</p>
                </div>
                <ExternalLink />
              </div>
              {document.links?.map((link) => (
                <div className="protocol-link-row" key={link.id}>
                  <a className="protocol-link-action" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir arquivo relacionado: ${link.provider}`}>
                    <span className="doc-file-icon"><ExternalLink /></span>
                    <span><strong>{link.provider}</strong><small>{link.url}</small></span>
                    <span className="protocol-link-open">Abrir <ArrowUpRight /></span>
                  </a>
                  {canEdit && (
                    <IconButton
                      label={`Remover link ${link.provider}`}
                      className="protocol-link-remove"
                      disabled={busy}
                      onClick={() => removeLink(link)}
                    >
                      <Trash2 />
                    </IconButton>
                  )}
                </div>
              ))}
              {!document.links?.length && (
                <div className="protocol-link-empty">
                  <ExternalLink />
                  <span><strong>Este protocolo não possui link relacionado</strong><small>O arquivo permanece no serviço externo. Nenhum upload ou hospedagem é feito pelo MemoryDoc.</small></span>
                </div>
              )}
              {canEdit && (
                <form className="document-link-fields" onSubmit={addLink}>
                  <label>{document.links?.length ? "Adicionar outro link HTTPS" : "Adicionar link HTTPS"}<input type="url" inputMode="url" autoComplete="url" required pattern="https://.*" value={linkDraft.url} onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))} maxLength="2000" placeholder="https://..." aria-describedby="detail-link-help" /></label>
                  <small id="detail-link-help" className="field-help">Use um endereço HTTPS para abrir o arquivo no serviço externo.</small>
                  <button type="submit" className="primary-button protocol-link-submit" disabled={busy}><ExternalLink /> Salvar link HTTPS</button>
                </form>
              )}
            </section>
            <section className="detail-section">
              <div className="detail-section-title">
                <h3>Histórico</h3>
                <FolderClock />
              </div>
              {historyLoading && <div className="detail-inline-state">Carregando histórico…</div>}
              {!historyLoading && !history.length && <div className="detail-inline-state">Nenhuma movimentação registrada ainda.</div>}
              {!historyLoading && history.length > 0 && <div className="timeline">
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
              </div>}
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

export function RemoveDepartmentModal({
  department,
  busy = false,
  error = "",
  onClose,
  onConfirm,
}) {
  return (
    <SimpleModal
      role="alertdialog"
      className="remove-department-modal"
      title="Excluir departamento?"
      description="O cadastro será removido permanentemente e não poderá ser recuperado."
      onClose={onClose}
    >
      <div className="remove-department-body">
        <div className="remove-department-card">
          <span aria-hidden="true">
            <Building2 />
          </span>
          <div>
            <small>{department.code}</small>
            <strong>{department.name}</strong>
          </div>
        </div>
        <div className="removal-audit-note">
          <CircleHelp aria-hidden="true" />
          <div>
            <strong>Exclusão definitiva</strong>
            <p>
              Esta ação só é permitida porque não existem documentos vinculados
              a este departamento.
            </p>
          </div>
        </div>
        <InlineError error={error} />
        <div className="modal-actions remove-department-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={busy}
            onClick={onClose}
          >
            Manter departamento
          </button>
          <button
            type="button"
            className="confirm-danger-button"
            disabled={busy}
            onClick={onConfirm}
          >
            <span>{busy ? "Excluindo…" : "Excluir definitivamente"}</span>
            <span aria-hidden="true">
              <Trash2 />
            </span>
          </button>
        </div>
      </div>
    </SimpleModal>
  );
}

const emptyDepartmentForm = { name: "", code: "" };
const departmentReferenceCount = (department) =>
  (department._count?.originDocuments || 0) +
  (department._count?.destinationDocuments || 0);

export function Departments({ departments, refresh, notify }) {
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [form, setForm] = useState(emptyDepartmentForm);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  const resetEditor = () => {
    setFormMode(null);
    setSelectedDepartment(null);
    setForm(emptyDepartmentForm);
    setError("");
  };

  const openCreate = () => {
    setSelectedDepartment(null);
    setForm(emptyDepartmentForm);
    setError("");
    setFormMode("create");
  };

  const openEdit = (department) => {
    setSelectedDepartment(department);
    setForm({ name: department.name, code: department.code });
    setError("");
    setFormMode("edit");
  };

  const closeEditor = () => {
    if (!saving) resetEditor();
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (formMode === "edit") {
        await api.patch(`/departments/${selectedDepartment.id}`, form);
      } else {
        await api.post("/departments", form);
      }
      await refresh();
      const editing = formMode === "edit";
      resetEditor();
      notify(
        editing ? "Departamento atualizado." : "Departamento adicionado.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (department) => {
    setSwitchingId(department.id);
    try {
      await api.patch(`/departments/${department.id}`, {
        active: !department.active,
      });
      await refresh();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setSwitchingId(null);
    }
  };

  const openDelete = (department) => {
    if (departmentReferenceCount(department) > 0) return;
    setDeleteError("");
    setDepartmentToDelete(department);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDepartmentToDelete(null);
    setDeleteError("");
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/departments/${departmentToDelete.id}`);
      await refresh();
      setDepartmentToDelete(null);
      notify("Departamento excluído.");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const visibleDepartments = departments.filter((department) => {
    const query = search.trim().toLowerCase();
    return !query || `${department.name} ${department.code}`.toLowerCase().includes(query);
  });

  return (
    <>
      <PageHeader
        eyebrow="ESTRUTURA ADMINISTRATIVA"
        title="Departamentos"
        description="Mantenha as unidades de origem e destino organizadas e consistentes."
        action={
          <PrimaryButton onClick={openCreate} icon={<Plus />}>
            Novo departamento
          </PrimaryButton>
        }
      />
      <main className="page-content wrap">
        <div className="admin-toolbar reveal">
          <label className="admin-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar departamento</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar departamento ou código" />
          </label>
        </div>
        <div className="summary-strip reveal">
          <span>
            <strong>{departments.length}</strong> departamentos cadastrados
          </span>
          <span>
            <i />
            {departments.filter((item) => item.active).length} ativos
          </span>
        </div>
        {visibleDepartments.length === 0 ? <div className="empty-state admin-empty reveal"><span><Building2 /></span><h3>{departments.length ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}</h3><p>{departments.length ? "Tente buscar por outro nome ou código." : "Adicione o primeiro departamento para organizar os protocolos."}</p></div> : <div className="cards-list reveal">
          {visibleDepartments.map((department) => {
            const references = departmentReferenceCount(department);
            const deleteLabel =
              references > 0
                ? `Não é possível excluir ${department.name}: ${references} vínculo${references === 1 ? "" : "s"} com documentos`
                : `Excluir ${department.name}`;
            return (
              <BezelCard className="department-card" key={department.id}>
                <div className="department-icon">
                  <Building2 />
                </div>
                <div className="department-copy">
                  <span className="micro-label">{department.code}</span>
                  <h3>{department.name}</h3>
                  <div className="department-meta">
                    <StatusBadge
                      status={department.active ? "Ativo" : "Inativo"}
                    />
                    <span>
                      {references === 0
                        ? "Sem vínculos"
                        : `${references} vínculo${references === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </div>
                <label
                  className="switch"
                  aria-label={`${department.active ? "Desativar" : "Ativar"} ${department.name}`}
                >
                  <input
                    type="checkbox"
                    checked={department.active}
                    disabled={switchingId === department.id}
                    onChange={() => toggle(department)}
                  />
                  <span />
                </label>
                <div className="department-actions">
                  <IconButton
                    type="button"
                    label={`Editar ${department.name}`}
                    onClick={() => openEdit(department)}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    type="button"
                    className="department-delete-button"
                    label={deleteLabel}
                    disabled={references > 0}
                    onClick={() => openDelete(department)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </BezelCard>
            );
          })}
        </div>}
      </main>
      {formMode && (
        <SimpleModal
          title={
            formMode === "edit"
              ? "Editar departamento"
              : "Novo departamento"
          }
          description={
            formMode === "edit"
              ? "As alterações serão usadas nos próximos registros; documentos emitidos preservam os dados históricos."
              : "A unidade ficará disponível nos campos de origem e destino."
          }
          onClose={closeEditor}
        >
          <form onSubmit={save} className="form-stack">
            <label>
              Nome completo
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                disabled={saving}
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
                disabled={saving}
                required
              />
            </label>
            <InlineError error={error} />
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button"
                disabled={saving}
                onClick={closeEditor}
              >
                Cancelar
              </button>
              <PrimaryButton type="submit" icon={<Check />} disabled={saving}>
                {saving
                  ? "Salvando…"
                  : formMode === "edit"
                    ? "Salvar alterações"
                    : "Adicionar"}
              </PrimaryButton>
            </div>
          </form>
        </SimpleModal>
      )}
      {departmentToDelete && (
        <RemoveDepartmentModal
          department={departmentToDelete}
          busy={deleting}
          error={deleteError}
          onClose={closeDelete}
          onConfirm={remove}
        />
      )}
    </>
  );
}

function Types({ types, refresh, notify }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    prefix: "",
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
      setForm({ name: "", prefix: "", digits: 3 });
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
  const visibleTypes = types.filter((type) => {
    const query = search.trim().toLowerCase();
    return !query || `${type.name} ${type.prefix}`.toLowerCase().includes(query);
  });
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
        <div className="admin-toolbar reveal">
          <label className="admin-search"><Search aria-hidden="true" /><span className="sr-only">Buscar tipo de protocolo</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tipo ou prefixo" /></label>
        </div>
        {visibleTypes.length === 0 ? <div className="empty-state admin-empty reveal"><span><FolderClock /></span><h3>{types.length ? "Nenhum tipo encontrado" : "Nenhum tipo cadastrado"}</h3><p>{types.length ? "Tente buscar por outro nome ou prefixo." : "Crie um tipo para começar a numerar protocolos."}</p></div> : <div className="type-grid reveal">
          {visibleTypes.map((type, index) => (
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
              </div>
            </BezelCard>
          ))}
        </div>}
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
            <div className="fields-grid two-cols">
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
  const [search, setSearch] = useState("");
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
  const visibleUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    return !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
  });
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
        <div className="admin-toolbar reveal"><label className="admin-search"><Search aria-hidden="true" /><span className="sr-only">Buscar usuário</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" /></label></div>
        {visibleUsers.length === 0 ? <div className="empty-state admin-empty reveal"><span><Users /></span><h3>{users.length ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}</h3><p>{users.length ? "Tente buscar por outro nome ou e-mail." : "Adicione um usuário para liberar o acesso ao sistema."}</p></div> : <BezelCard className="table-card">
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
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link className="person-cell user-profile-link" to={`/usuarios/${encodeURIComponent(user.id)}/perfil`}>
                        <Avatar name={user.name} small />
                        {user.name}
                      </Link>
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
        </BezelCard>}
        <div className="user-mobile-list">{visibleUsers.map((user) => <BezelCard className="user-mobile-card" key={`mobile-${user.id}`}><div className="user-mobile-heading"><Link className="person-cell user-profile-link" to={`/usuarios/${encodeURIComponent(user.id)}/perfil`}><Avatar name={user.name} small /><span><strong>{user.name}</strong><small className="user-mobile-email">{user.email}</small></span></Link><span className={`user-mobile-status ${user.active ? "is-active" : "is-inactive"}`}>{user.active ? "Ativo" : "Inativo"}</span></div><div className="user-mobile-controls"><label>Perfil<SoftSelect ariaLabel={`Perfil de ${user.name}`} value={user.role} onChange={(value) => update(user, { role: value })} options={Object.entries(roleLabels).map(([optionValue, label]) => ({ value: optionValue, label }))} /></label><label className="user-mobile-switch">Acesso<label className="switch"><input type="checkbox" checked={user.active} onChange={() => update(user, { active: !user.active })} /><span /></label></label></div></BezelCard>)}</div>
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
            <button className="ghost-button" onClick={() => download("pdf")}>
              <FileText />
              Exportar PDF
            </button>
            <button className="ghost-button" onClick={() => download("xlsx")}>
              <FileSpreadsheet />
              Exportar Excel
            </button>
          </div>
          <p className="report-mobile-note">Os arquivos exportados contêm somente registros de protocolos dentro do recorte selecionado.</p>
        </BezelCard>
      </main>
    </>
  );
}

function ActivityPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadActivity = () => {
    setLoading(true);
    setError("");
    api
      .get("/activity?pageSize=100")
      .then((data) => setResult(data))
      .catch((err) => setError(err.message || "Não foi possível carregar o histórico."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const displayDescription = (event) => {
    const raw = String(event.description || "Atividade registrada");
    if (event.action === "ATTACHMENT_ADD" || /^Anexo adicionado/i.test(raw)) {
      return raw.replace(/^Anexo adicionado/i, "Link relacionado registrado");
    }
    if (event.action === "ATTACHMENT_REMOVE" || /^Anexo removido/i.test(raw)) {
      return raw.replace(/^Anexo removido/i, "Link relacionado removido");
    }
    return raw.replace(/^Documento registrado/i, "Protocolo registrado");
  };

  const events = result?.data || [];
  const filteredEvents = events.filter((event) => {
    const description = displayDescription(event).toLowerCase();
    const protocol = String(event.document?.protocol || "").toLowerCase();
    const user = String(event.user?.name || "").toLowerCase();
    const matchesQuery = !query.trim() || `${description} ${protocol} ${user}`.includes(query.trim().toLowerCase());
    const matchesKind = kind === "all" || description.includes(kind);
    return matchesQuery && matchesKind;
  });

  return (
    <>
      <PageHeader
        eyebrow="RASTREABILIDADE"
        title="Histórico de atividades"
        description="Consulte visualizações, registros e movimentações dos protocolos."
      />
      <main className="page-content wrap">
        {error ? (
          <BezelCard className="activity-state-card activity-error-card">
            <div className="activity-state-icon" aria-hidden="true"><Activity /></div>
            <div><strong>Não foi possível carregar as atividades</strong><p>{error}</p></div>
            <button type="button" className="secondary-button activity-retry" onClick={loadActivity}>Tentar novamente</button>
          </BezelCard>
        ) : loading ? (
          <BezelCard className="activity-state-card"><LoadingState text="Carregando histórico de protocolos…" /></BezelCard>
        ) : (
          <BezelCard className="activity-card reveal">
            <div className="activity-toolbar" aria-label="Filtros de atividades">
              <label className="activity-search-field">Buscar atividade
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Protocolo, pessoa ou ação…" type="search" />
              </label>
              <label className="activity-filter-field">Tipo de atividade
                <select value={kind} onChange={(event) => setKind(event.target.value)}>
                  <option value="all">Todas as atividades</option>
                  <option value="visual">Visualizações</option>
                  <option value="registr">Registros</option>
                  <option value="moviment">Movimentações</option>
                  <option value="link">Links relacionados</option>
                </select>
              </label>
            </div>
            <div className="activity-summary" aria-live="polite"><strong>{filteredEvents.length}</strong> {filteredEvents.length === 1 ? "atividade encontrada" : "atividades encontradas"}</div>
            {filteredEvents.length === 0 ? (
              <div className="activity-empty-state"><div className="activity-state-icon" aria-hidden="true"><Activity /></div><strong>{events.length ? "Nenhuma atividade corresponde aos filtros" : "Ainda não há atividades"}</strong><p>{events.length ? "Tente limpar a busca ou escolher outro tipo de atividade." : "As consultas e movimentações dos protocolos aparecerão aqui."}</p>{events.length > 0 && <button type="button" className="secondary-button" onClick={() => { setQuery(""); setKind("all"); }}>Limpar filtros</button>}</div>
            ) : <div className="timeline activity-timeline">{filteredEvents.map((event) => <div className="timeline-item" key={event.id}><i aria-hidden="true" /><div><strong>{displayDescription(event)}</strong><span><b>{event.document?.protocol || "Protocolo sem número"}</b><em>{formatDateTime(event.createdAt)}</em><em>{event.user?.name || "Usuário"}</em></span></div></div>)}</div>}
          </BezelCard>
        )}
      </main>
    </>
  );
}

const privacyRequestTypes = [
  ['ACCESS', 'Acesso aos dados'], ['CORRECTION', 'Correção'], ['ANONYMIZATION', 'Anonimização'],
  ['DELETION', 'Eliminação'], ['PORTABILITY', 'Portabilidade'], ['OPPOSITION', 'Oposição'],
  ['CONSENT_REVOCATION', 'Revogação de consentimento'],
];
const privacyRequestStatuses = [['OPEN', 'Aberta'], ['IN_REVIEW', 'Em análise'], ['COMPLETED', 'Concluída'], ['REJECTED', 'Rejeitada']];
const privacyTypeLabel = (value) => privacyRequestTypes.find(([key]) => key === value)?.[1] || value;
const privacyStatusLabel = (value) => privacyRequestStatuses.find(([key]) => key === value)?.[1] || value;
const privacyLongDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : 'Não informado';
const privacyDeadline = (value) => {
  if (!value) return { label: 'Prazo não informado', tone: 'neutral' };
  const due = new Date(value); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days > 0) return { label: `${days} ${days === 1 ? 'dia restante' : 'dias restantes'}`, tone: 'active' };
  if (days === 0) return { label: 'Vence hoje', tone: 'today' };
  const overdue = Math.abs(days);
  return { label: `${overdue} ${overdue === 1 ? 'dia em atraso' : 'dias em atraso'}`, tone: 'overdue' };
};

function PrivacyMessagesPanel({ messages, body, onBodyChange, onSend, onInsertLink, busy, canSend }) {
  return <div className="privacy-messages-panel"><div className="privacy-message-panel-head"><div><strong>Mensagens internas</strong><p>Use esta conversa para responder ao titular e registrar orientações do atendimento.</p></div><MessageSquareText /></div><div className="privacy-message-thread">{messages.length === 0 ? <span className="privacy-message-empty">Nenhuma mensagem enviada nesta solicitação.</span> : messages.map((message) => <div className={`privacy-message-bubble ${message.isMine ? 'is-mine' : ''}`} key={message.id}><div><strong>{message.sender?.name || 'Usuário'}</strong><small>{new Date(message.createdAt).toLocaleString('pt-BR')}</small></div><p>{message.body}</p></div>)}</div>{canSend && <div className="privacy-message-compose"><textarea rows="3" maxLength="4000" value={body} onChange={(event) => onBodyChange(event.target.value)} placeholder="Escreva uma resposta para o titular…" /><div className="privacy-message-actions">{onInsertLink && <button className="ghost-button" type="button" disabled={busy} onClick={onInsertLink}>Inserir link seguro</button>}<PrimaryButton type="button" disabled={busy || !body.trim()} onClick={onSend} icon={<ArrowUpRight />}>{busy ? 'Enviando…' : 'Enviar mensagem'}</PrimaryButton></div></div>}</div>;
}

function PrivacyRequestTabs({ events, messages, messageBody, onMessageBodyChange, onSendMessage, onInsertLink, messageBusy, canSend }) {
  const [activeTab, setActiveTab] = useState('messages');
  return <div className="privacy-request-tabs"><div className="privacy-tabs-list" role="tablist" aria-label="Informações do atendimento"><button type="button" role="tab" aria-selected={activeTab === 'messages'} className={activeTab === 'messages' ? 'is-active' : ''} onClick={() => setActiveTab('messages')}><MessageSquareText /> Mensagens internas</button><button type="button" role="tab" aria-selected={activeTab === 'timeline'} className={activeTab === 'timeline' ? 'is-active' : ''} onClick={() => setActiveTab('timeline')}><Activity /> Trilha de atendimento<span>{events.length}</span></button></div>{activeTab === 'messages' ? <PrivacyMessagesPanel messages={messages} body={messageBody} onBodyChange={onMessageBodyChange} onSend={onSendMessage} onInsertLink={onInsertLink} busy={messageBusy} canSend={canSend} /> : <div className="privacy-timeline-panel"><div className="privacy-timeline-heading"><div><strong>Trilha de atendimento</strong><small>Eventos técnicos e responsáveis pela solicitação.</small></div><Activity /></div>{events.length === 0 ? <div className="privacy-message-empty">Nenhum evento registrado.</div> : <div className="privacy-timeline-list" tabIndex="0" aria-label="Eventos da trilha de atendimento">{events.map((event) => <div className="privacy-timeline-item" key={event.id}><span className="privacy-timeline-dot" /><div><strong>{event.action}</strong><small>{new Date(event.createdAt).toLocaleString('pt-BR')} {event.actor?.name ? `· ${event.actor.name}` : ''}</small>{event.note && <p>{event.note}</p>}</div></div>)}</div>}</div>}</div>;
}

function PrivacyRequestsPage({ session, notify }) {
  const [requests, setRequests] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState({ type: 'ACCESS', description: '' });
  const [responseNote, setResponseNote] = useState('');
  const [delivery, setDelivery] = useState(null);
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [messageBusy, setMessageBusy] = useState(false);
  const [subjectUserId, setSubjectUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/privacy-requests').then((result) => setRequests(result.data)).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (session.role === 'admin') api.get('/users').then((result) => setUsers(result.data)).catch(() => undefined); }, [session.role]);
  const selected = requests?.find((item) => item.id === selectedId) || null;
  const filtered = requests?.filter((item) => (statusFilter === 'all' || item.status === statusFilter) && (typeFilter === 'all' || item.type === typeFilter)) || [];
  useEffect(() => {
    if (!selectedId) { setMessages([]); return undefined; }
    setMessageBody('');
    let active = true;
    api.get(`/privacy-requests/${selectedId}/messages`).then((result) => { if (active) setMessages(result.data); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [selectedId]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await api.post('/privacy-requests', form);
      setRequests((current) => [result.data, ...(current || [])]); setForm({ type: 'ACCESS', description: '' }); setSelectedId(result.data.id); notify('Solicitação registrada.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const updateSelected = async (status) => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const result = await api.patch(`/privacy-requests/${selected.id}`, { status, responseNote });
      setRequests((current) => current.map((item) => item.id === result.data.id ? result.data : item)); setResponseNote(''); notify('Solicitação atualizada.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const generateDelivery = async (channel = 'LINK') => {
    if (!selected) return;
    setDeliveryBusy(true); setError(''); setDelivery(null);
    try {
      const result = await api.post(`/privacy-requests/${selected.id}/delivery`, { channel });
      setDelivery(result.data);
      notify(channel === 'EMAIL' ? 'Link preparado para envio por e-mail.' : 'Link seguro gerado.');
    } catch (err) { setError(err.message); } finally { setDeliveryBusy(false); }
  };
  const updatePublicIdentity = async () => {
    if (!selected || selected.source !== 'PUBLIC' || !subjectUserId) return;
    setSaving(true); setError('');
    try {
      const result = await api.patch(`/privacy-requests/${selected.id}`, { subjectUserId, identityVerified: true });
      setRequests((current) => current.map((item) => item.id === result.data.id ? result.data : item));
      notify('Titular associado e identidade registrada.');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const sendMessage = async () => {
    if (!selected || !messageBody.trim()) return;
    setMessageBusy(true); setError('');
    try {
      const result = await api.post(`/privacy-requests/${selected.id}/messages`, { body: messageBody });
      setMessages((current) => [...current, result.data]); setMessageBody(''); notify('Mensagem enviada.');
    } catch (err) { setError(err.message); } finally { setMessageBusy(false); }
  };
  const insertDeliveryLink = () => {
    if (!delivery) return;
    const link = `${window.location.origin}${delivery.downloadPath}`;
    setMessageBody((current) => `${current}${current ? '\n\n' : ''}Link seguro para download dos dados: ${link}`);
  };
  return <>
    <PageHeader eyebrow={session.role === 'admin' ? "GOVERNANÇA" : "MEUS DIREITOS"} title={session.role === 'admin' ? "Solicitações de privacidade" : "Meus pedidos de privacidade"} description={session.role === 'admin' ? "Registre, acompanhe e trate pedidos de titulares com acesso administrativo." : "Registre e acompanhe somente os seus pedidos relacionados aos direitos previstos na LGPD."} />
    <main className="page-content wrap privacy-requests-page">
      <InlineError error={error} />
      <div className="privacy-requests-grid">
        <BezelCard className="privacy-request-form-card">
          <div className="form-section-head"><span className="step-number">01</span><div><h2>Nova solicitação</h2><p>O pedido ficará vinculado ao usuário autenticado.</p></div></div>
          <form className="document-form" onSubmit={submit}>
            <label>Tipo de solicitação<SoftSelect value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={privacyRequestTypes.map(([value, label]) => ({ value, label }))} ariaLabel="Tipo de solicitação" required /></label>
            <label>Descrição <span className="field-help">(opcional)</span><textarea rows="5" maxLength="2000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o pedido sem incluir dados desnecessários." /></label>
            <div className="form-actions"><PrimaryButton type="submit" disabled={saving} icon={<ClipboardList />}>Registrar pedido</PrimaryButton></div>
          </form>
        </BezelCard>
        <BezelCard className="privacy-request-list-card">
          <div className="privacy-list-head"><div><Eyebrow>ACOMPANHAMENTO</Eyebrow><h2>Pedidos registrados</h2></div><span className="privacy-count">{filtered.length}</span></div>
          <div className="privacy-filters"><SoftSelect ariaLabel="Filtrar por status" value={statusFilter} onChange={setStatusFilter} options={[{ value: 'all', label: 'Todos os status' }, ...privacyRequestStatuses.map(([value, label]) => ({ value, label }))]} /><SoftSelect ariaLabel="Filtrar por tipo" value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'Todos os tipos' }, ...privacyRequestTypes.map(([value, label]) => ({ value, label }))]} /></div>
          {!requests ? <LoadingState /> : filtered.length === 0 ? <div className="empty-state privacy-empty"><span><ClipboardList /></span><h3>Nenhuma solicitação</h3><p>Os pedidos registrados aparecerão aqui.</p></div> : <div className="privacy-request-list">{filtered.map((item) => <button type="button" className={`privacy-request-row ${selectedId === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { setSelectedId(item.id); setResponseNote(item.responseNote || ''); }}><span><strong>{privacyTypeLabel(item.type)}</strong><small>{item.subjectUser?.name || item.requesterName || 'Titular autenticado'}{item.source === 'PUBLIC' ? ' · Canal público' : ''} · {new Date(item.createdAt).toLocaleDateString('pt-BR')}</small></span><span className={`dsar-status dsar-${item.status.toLowerCase()}`}>{privacyStatusLabel(item.status)}</span></button>)}</div>}
        </BezelCard>
      </div>
      {selected && <SimpleModal className="privacy-request-modal" title={privacyTypeLabel(selected.type)} description="Detalhes do pedido de privacidade" onClose={() => { setSelectedId(null); setDelivery(null); }}><div className="privacy-detail-head"><div><Eyebrow>{selected.source === 'PUBLIC' ? 'PEDIDO PELO CANAL PÚBLICO' : 'PEDIDO AUTENTICADO'}</Eyebrow><p>Confira os dados enviados no momento do registro.</p></div><span className={`dsar-status dsar-${selected.status.toLowerCase()}`}>{privacyStatusLabel(selected.status)}</span></div><div className="privacy-personal-grid"><div className="privacy-personal-field"><span className="privacy-field-icon"><UserRound /></span><span><small>Nome</small><strong>{selected.subjectUser?.name || selected.requesterName || 'Titular autenticado'}</strong></span></div><div className="privacy-personal-field"><span className="privacy-field-icon"><Mail /></span><span><small>E-mail</small><strong>{selected.requesterEmail || selected.subjectUser?.email || 'Não informado'}</strong></span></div><div className="privacy-personal-field"><span className="privacy-field-icon"><CalendarDays /></span><span><small>Data do pedido</small><strong>{privacyLongDate(selected.createdAt)}</strong><em><Clock3 /> {new Date(selected.createdAt).toLocaleTimeString('pt-BR')}</em></span></div>{(() => { const deadline = privacyDeadline(selected.dueAt); return <div className={`privacy-personal-field privacy-deadline-${deadline.tone}`}><span className="privacy-field-icon"><Timer /></span><span><small>Prazo registrado</small><strong>{privacyLongDate(selected.dueAt)}</strong><em>{deadline.label}</em></span></div>; })()}</div><div className="privacy-detail-copy"><div className="privacy-message-heading"><span className="privacy-field-icon"><MessageSquareText /></span><strong>Mensagem enviada</strong></div><p>{selected.description || 'Nenhuma mensagem foi informada.'}</p></div><PrivacyRequestTabs events={selected.events || []} messages={messages} messageBody={messageBody} onMessageBodyChange={setMessageBody} onSendMessage={sendMessage} onInsertLink={delivery ? insertDeliveryLink : undefined} messageBusy={messageBusy} canSend={Boolean(selected.subjectUserId || selected.subjectUser?.id || selected.source === 'AUTHENTICATED')} />{session.role === 'admin' && <div className="privacy-admin-actions"><label>Nota de tratamento<textarea rows="3" maxLength="4000" value={responseNote} onChange={(event) => setResponseNote(event.target.value)} placeholder="Registre a decisão sem incluir dados pessoais desnecessários." /></label>{selected.source === 'PUBLIC' && <div className="privacy-identity-panel"><strong>Validação para entrega</strong><p>Associe o pedido a um usuário somente após confirmar a identidade por canal adequado.</p><SearchableSelect ariaLabel="Usuário titular" value={subjectUserId || selected.subjectUserId || ''} onChange={setSubjectUserId} options={users.map((user) => ({ value: user.id, label: `${user.name} · ${user.email}`, keywords: [user.email] }))} placeholder="Selecionar titular" searchPlaceholder="Buscar usuário…" /><button className="ghost-button" type="button" disabled={saving || !subjectUserId} onClick={updatePublicIdentity}>Registrar validação</button></div>}{selected.type === 'PORTABILITY' && <div className="privacy-delivery-panel"><div><strong>Entrega de portabilidade</strong><p>Gera um JSON estruturado com validade de 48 horas e uso único. Senhas, tokens e conteúdo de links externos ficam excluídos.</p></div><div className="form-actions"><button className="ghost-button" type="button" disabled={deliveryBusy} onClick={() => generateDelivery('LINK')}>{deliveryBusy ? 'Gerando…' : 'Gerar link seguro'}</button><button className="ghost-button" type="button" disabled={deliveryBusy} onClick={() => generateDelivery('EMAIL')}>Preparar e-mail</button></div>{delivery && <div className="privacy-delivery-result"><input readOnly value={`${window.location.origin}${delivery.downloadPath}`} aria-label="Link de entrega" /><button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${delivery.downloadPath}`)}>Copiar link</button><a className="ghost-button" href={`mailto:${delivery.recipientEmail}?subject=Entrega de dados pessoais&body=Seu link seguro de download é: ${encodeURIComponent(`${window.location.origin}${delivery.downloadPath}`)}`}>Abrir e-mail</a><small>O MemoryDoc local não possui SMTP configurado; “Preparar e-mail” abre o cliente de e-mail para envio manual.</small></div>}</div>}<div className="form-actions"><button className="ghost-button" type="button" disabled={saving} onClick={() => updateSelected('IN_REVIEW')}>Marcar em análise</button><button className="ghost-button" type="button" disabled={saving} onClick={() => updateSelected('REJECTED')}>Rejeitar</button><PrimaryButton type="button" disabled={saving} onClick={() => updateSelected('COMPLETED')} icon={<Check />}>Concluir</PrimaryButton></div></div>}</SimpleModal>}
    </main>
  </>;
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
        <span>MEMORYDOC · REGISTRO DE PROTOCOLOS</span>
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
    let title = "MemoryDoc · Gestão documental";
    if (pathname === "/login") title = "Acesso · MemoryDoc";
    else if (pathname === "/lgpd") title = "Guia LGPD · MemoryDoc";
    else if (pathname === "/privacidade") title = "Política de Privacidade · MemoryDoc";
    else if (pathname === "/cookies") title = "Política de Cookies · MemoryDoc";
    else if (pathname === "/privacidade/solicitar") title = "Solicitação de privacidade · MemoryDoc";
    else if (pathname === "/inicio" || pathname === "/") title = "Início · MemoryDoc";
    else if (pathname === "/documentos") title = "Protocolos · MemoryDoc";
    else if (pathname === "/documentos/novo") title = "Novo registro · MemoryDoc";
    else if (pathname.startsWith("/documentos/"))
      title = "Detalhes do documento · MemoryDoc";
    else if (pathname === "/departamentos") title = "Departamentos · MemoryDoc";
    else if (pathname === "/tipos") title = "Tipos documentais · MemoryDoc";
    else if (pathname === "/usuarios") title = "Usuários · MemoryDoc";
    else if (pathname.startsWith("/usuarios/") && pathname.endsWith("/perfil")) title = "Perfil do usuário · MemoryDoc";
    else if (pathname === "/relatorios") title = "Relatórios · MemoryDoc";
    else if (pathname === "/privacidade/solicitacoes") title = "Privacidade · MemoryDoc";
    else if (pathname === "/atividades") title = "Atividades · MemoryDoc";
    else title = "Página não encontrada · MemoryDoc";
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
      document.title = `${documentRecord.protocol} · MemoryDoc`;
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
      user.role === "admin"
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
        <CookiePreferences />
        <Routes>
          <Route path="/lgpd" element={<PublicLgpdGuide />} />
          <Route path="/privacidade/solicitar" element={<PublicPrivacyRequestPage />} />
          <Route path="/privacidade" element={<PublicPolicyPage kind="privacy" />} />
          <Route path="/cookies" element={<PublicPolicyPage kind="cookies" />} />
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
    api.clearCache();
    setSession(null);
    navigate("/login", { replace: true });
  };
  const loginReturnPath = safeInternalPath(location.state?.from);

  return (
    <>
      <PageTitle />
      <CookiePreferences />
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
                  <Suspense fallback={<LoadingState text="Carregando painel…" />}>
                    <DashboardPage
                      types={types}
                      onNew={goNew}
                      onViewDocuments={() => navigate("/documentos")}
                      onSelect={openDocument}
                      reloadKey={reloadKey}
                      canCreate={canCreate}
                    />
                  </Suspense>
                }
              />
              <Route
                path="/documentos/novo"
                element={
                  <RequireRole session={session} roles={["admin", "OPERATOR"]}>
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
                  <RequireRole session={session} roles={["admin"]}>
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
                  <RequireRole session={session} roles={["admin"]}>
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
                  <RequireRole session={session} roles={["admin"]}>
                    <UsersPage
                      users={users}
                      refresh={refreshUsers}
                      notify={notify}
                    />
                  </RequireRole>
                }
              />
              <Route
                path="/usuarios/:userId/perfil"
                element={
                  <Suspense fallback={<LoadingState text="Carregando perfil…" />}>
                    <UserProfile session={session} />
                  </Suspense>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <RequireRole session={session} roles={["admin"]}>
                    <Reports types={types} notify={notify} />
                  </RequireRole>
                }
              />
              <Route
                path="/privacidade/solicitacoes"
                element={<RequireRole session={session} roles={["admin", "OPERATOR", "VIEWER"]}><PrivacyRequestsPage session={session} notify={(message) => setToast({ message, error: false })} /></RequireRole>}
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
