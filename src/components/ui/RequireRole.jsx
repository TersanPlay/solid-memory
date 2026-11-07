import { RouteMessage } from "./RouteMessage";
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

