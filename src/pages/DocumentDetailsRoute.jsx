import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { api } from "../api.js";
import { queryString } from "../api.js";
import { BezelCard } from "../components/shared/BezelCard";
import { Eyebrow } from "../components/shared/Eyebrow";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { IconButton } from "../components/shared/IconButton";
import { SearchableSelect, SoftSelect } from "../components/FormControls.jsx";
import { AttachmentPicker } from "../components/shared/AttachmentPicker";
import { SimpleModal } from "../components/modals/SimpleModal";
import { CancelDocumentModal } from "../components/modals/CancelDocumentModal";
import { RemoveAttachmentModal } from "../components/modals/RemoveAttachmentModal";
import { Sparkles, X, ChevronRight, Paperclip, Upload, Download, Trash2, FileText, ChevronDown, Activity, FolderClock } from "lucide-react";
import { formatDate, formatDateTime, formatFileSize, canEditDocument } from "../utils/format";
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
                path="/relatorios"
                element={
                  <RequireRole session={session} roles={["admin"]}>
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

