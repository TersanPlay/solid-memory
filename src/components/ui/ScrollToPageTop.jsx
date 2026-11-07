import { useEffect } from "react";
import { useLocation } from "react-router";
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

