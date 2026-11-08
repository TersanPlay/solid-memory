import { useEffect } from "react";
import { useLocation } from "react-router";
function PageTitle() {
  const location = useLocation();
  useEffect(() => {
    const pathname = location.pathname;
    let title = "MemoryDoc · Registro de protocolos";
    if (pathname === "/login") title = "Acesso · MemoryDoc";
    else if (pathname === "/inicio" || pathname === "/") title = "Início · MemoryDoc";
    else if (pathname === "/documentos") title = "Protocolos · MemoryDoc";
    else if (pathname === "/documentos/novo") title = "Novo registro · MemoryDoc";
    else if (pathname.startsWith("/documentos/"))
      title = "Detalhes do protocolo · MemoryDoc";
    else if (pathname === "/departamentos") title = "Departamentos · MemoryDoc";
    else if (pathname === "/tipos") title = "Tipos de protocolo · MemoryDoc";
    else if (pathname === "/usuarios") title = "Usuários · MemoryDoc";
    else if (pathname.startsWith("/usuarios/") && pathname.endsWith("/perfil")) title = "Perfil do usuário · MemoryDoc";
    else if (pathname === "/relatorios") title = "Relatórios · MemoryDoc";
    else if (pathname === "/atividades") title = "Atividades · MemoryDoc";
    else title = "Página não encontrada · MemoryDoc";
    document.title = title;
  }, [location.pathname]);
  return null;
}

