import { NavLink } from "react-router";
import { Activity, ArrowLeft, ArrowUpRight, BarChart3, Bell, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, Eye, FileArchive, FileBarChart, FilePlus2, Files, FileText, Filter, FolderClock, Home, LockKeyhole, LogOut, Menu, MoreHorizontal, Paperclip, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../shared/IconButton";
import { Avatar } from "../shared/Avatar";

const navigationItems = [
  { path: "/inicio", label: "Início", icon: Home },
  { path: "/documentos", label: "Protocolos", icon: Files },
  { path: "/departamentos", label: "Departamentos", icon: Building2, admin: true },
  { path: "/tipos", label: "Tipos", icon: FolderClock, admin: true },
  { path: "/usuarios", label: "Usuários", icon: Users, admin: true },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, admin: true },
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
        <NavLink to="/inicio" end onClick={closeMenus}>
          <Home />
          <span>Início</span>
        </NavLink>
        <NavLink to="/documentos" onClick={closeMenus}>
          <Files />
          <span>Protocolos</span>
        </NavLink>
        <NavLink to="/atividades" onClick={closeMenus}>
          <Activity />
          <span>Atividades</span>
        </NavLink>
        <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
          <UserRound />
          <span>Perfil</span>
        </button>
      </nav>
    </>
  );
}
