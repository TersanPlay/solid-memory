import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const admin = {
  id: "user-admin",
  name: "Dev Administrador",
  email: "dev@example.invalid",
  role: "ADMIN",
  active: true,
};

const viewer = {
  ...admin,
  id: "user-viewer",
  name: "Pessoa Consulta",
  role: "VIEWER",
};

const documentFixture = {
  id: "document-1",
  protocol: "MEMO-001/2026",
  type: { id: "type-1", name: "Memorando", prefix: "MEMO" },
  date: "2026-07-22",
  subject: "Assunto de teste",
  origin: "DEP-ARQUIVO",
  destination: "DEP-TI",
  responsible: "Dev Administrador",
  responsibleUserId: admin.id,
  createdById: admin.id,
  createdBy: { id: admin.id, name: admin.name },
  status: "REGISTRADO",
  notes: "",
  attachments: [],
  createdAt: "2026-07-22T12:00:00.000Z",
  updatedAt: "2026-07-22T12:00:00.000Z",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authenticatedFetch(user = admin) {
  return vi.fn(async (input) => {
    const url = String(input);
    if (url === "/api/auth/me") return json({ data: user });
    if (url === "/api/auth/logout") return new Response(null, { status: 204 });
    if (url === "/api/document-types") return json({ data: [] });
    if (url === "/api/departments") return json({ data: [] });
    if (url === "/api/users") return json({ data: [user] });
    if (url.startsWith("/api/dashboard"))
      return json({
        data: {
          total: 0,
          monthTotal: 0,
          yearTotal: 0,
          byStatus: {},
          recent: [],
        },
      });
    if (url.startsWith("/api/documents?"))
      return json({
        data: [documentFixture],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });
    if (url === `/api/documents/${documentFixture.id}`)
      return json({ data: documentFixture });
    if (url === `/api/documents/${documentFixture.id}/history`)
      return json({ data: [] });
    if (url.startsWith("/api/activity"))
      return json({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      });
    throw new Error(`Requisição inesperada no teste: ${url}`);
  });
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="sr-only" aria-hidden="true">
      <output data-testid="location">
        {location.pathname}
        {location.search}
      </output>
      <button data-testid="history-back" onClick={() => navigate(-1)}>
        Voltar no histórico de teste
      </button>
    </div>
  );
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = "MemoryDoc · Gestão documental";
});

describe("roteamento e autenticação do frontend", () => {
  it("redireciona uma URL protegida para o login sem uma sessão válida", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Autenticação necessária.",
            },
          },
          401,
        ),
      ),
    );

    renderAt("/documentos");

    expect(
      await screen.findByRole("heading", { name: "Boas-vindas de volta" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    expect(screen.getByLabelText("E-mail institucional")).toHaveValue("");
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("retorna à URL solicitada depois do login", async () => {
    let loggedIn = false;
    const fetchMock = authenticatedFetch(admin);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, options = {}) => {
        const url = String(input);
        if (url === "/api/auth/me" && !loggedIn)
          return json(
            { error: { code: "UNAUTHORIZED", message: "Sessão ausente." } },
            401,
          );
        if (url === "/api/auth/login" && options.method === "POST") {
          loggedIn = true;
          return json({ data: { user: admin } });
        }
        return fetchMock(input, options);
      }),
    );

    renderAt("/usuarios");
    await screen.findByRole("heading", { name: "Boas-vindas de volta" });
    fireEvent.change(screen.getByLabelText("E-mail institucional"), {
      target: { value: admin.email },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "SenhaSeguraTeste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar no MemoryDoc" }));

    expect(
      await screen.findByRole("heading", { name: "Usuários" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/usuarios");
    expect(document.title).toBe("Usuários · MemoryDoc");
  });

  it("atualiza a URL e o estado ativo pelos links de navegação", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(admin));
    renderAt("/inicio");

    await screen.findByRole("heading", {
      name: /Documentos em ordem/i,
    });
    const documentsLinks = screen.getAllByRole("link", { name: "Documentos" });
    fireEvent.click(documentsLinks[0]);

    expect(
      await screen.findByRole("heading", { name: "Documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/documentos");
    expect(documentsLinks[0]).toHaveClass("active");
    expect(document.title).toBe("Documentos · MemoryDoc");
  });

  it("mantém a URL e informa acesso negado para um perfil sem permissão", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(viewer));
    renderAt("/usuarios");

    expect(
      (await screen.findAllByRole("heading", {
        name: "Acesso não autorizado",
      }))[0],
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/usuarios");
  });

  it("abre detalhes por URL, usa o protocolo no título e fecha no acervo", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(admin));
    renderAt(`/documentos/${documentFixture.id}`);

    expect(
      await screen.findByRole("heading", { name: documentFixture.protocol }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe(`${documentFixture.protocol} · MemoryDoc`),
    );
    expect(
      screen.getAllByRole("link", { name: "Documentos" })[0],
    ).toHaveClass("active");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/documentos"),
    );
  });

  it("usa o histórico para fechar o drawer e preserva o estado da lista", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(admin));
    renderAt("/documentos");

    const search = await screen.findByPlaceholderText(
      "Buscar por protocolo, assunto, origem…",
    );
    fireEvent.change(search, { target: { value: "Assunto" } });
    fireEvent.click(await screen.findByText(documentFixture.protocol));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        `/documentos/${documentFixture.id}`,
      ),
    );

    fireEvent.click(screen.getByTestId("history-back"));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/documentos"),
    );
    expect(screen.getByPlaceholderText(/Buscar por protocolo/)).toHaveValue(
      "Assunto",
    );
  });

  it("substitui a rota por login no logout e bloqueia o retorno autenticado", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(admin));
    renderAt("/inicio");

    await screen.findByRole("heading", { name: /Documentos em ordem/i });
    fireEvent.click(screen.getByRole("button", { name: /Dev/ }));
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Boas-vindas de volta" });
    expect(screen.getByTestId("location")).toHaveTextContent("/login");

    fireEvent.click(screen.getByTestId("history-back"));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/login"),
    );
  });

  it("mantém uma URL desconhecida e exibe uma página 404 interna", async () => {
    vi.stubGlobal("fetch", authenticatedFetch(admin));
    renderAt("/pagina-inexistente");

    expect(
      (await screen.findAllByRole("heading", {
        name: "Página não encontrada",
      }))[0],
    ).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/pagina-inexistente",
    );
    expect(document.title).toBe("Página não encontrada · MemoryDoc");
  });
});
