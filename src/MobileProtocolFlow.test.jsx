import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import App from "./App.jsx";

const session = {
  id: "user-admin",
  name: "Pessoa Administradora",
  email: "admin@example.invalid",
  role: "admin",
  active: true,
};

const types = [
  { id: "type-1", name: "Memorando", prefix: "MEMO", active: true },
];

const departments = [
  { id: "department-1", code: "ADM", name: "Administrativo", active: true },
  { id: "department-2", code: "TI", name: "Tecnologia", active: true },
];

const protocol = {
  id: "protocol-1",
  protocol: "MEMO-001/2026",
  type: types[0],
  date: "2026-07-22",
  subject: "Consulta de protocolo",
  origin: "ADM",
  destination: "TI",
  responsible: session.name,
  status: "ENVIADO",
  links: [
    {
      id: "link-1",
      url: "https://arquivos.example.invalid/protocolo-1",
      provider: "Arquivo externo",
      title: "Arquivo relacionado",
    },
  ],
  attachments: [],
  createdAt: "2026-07-22T12:00:00.000Z",
  createdBy: { id: session.id, name: session.name },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authenticatedFetch() {
  return vi.fn(async (input) => {
    const url = String(input);
    if (url === "/api/auth/me") return json({ data: session });
    if (url === "/api/document-types") return json({ data: types });
    if (url === "/api/departments") return json({ data: departments });
    if (url === "/api/users") return json({ data: [session] });
    if (url.startsWith("/api/protocols/next")) {
      return json({ data: { protocol: "MEMO-002/2026" } });
    }
    if (url.startsWith("/api/documents?")) {
      return json({
        data: [protocol],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });
    }
    if (url === `/api/documents/${protocol.id}`) return json({ data: protocol });
    if (url === `/api/documents/${protocol.id}/history`) return json({ data: [] });
    if (url.startsWith("/api/dashboard")) {
      return json({ data: { total: 1, monthTotal: 1, yearTotal: 1, byStatus: {}, recent: [] } });
    }
    throw new Error(`Requisição inesperada no teste: ${url}`);
  });
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("fluxo mobile de protocolos", () => {
  it("exibe somente o campo de link HTTPS no registro, sem upload ativo", async () => {
    vi.stubGlobal("fetch", authenticatedFetch());
    renderAt("/documentos/novo");

    expect(await screen.findByRole("heading", { name: "Registrar protocolo" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://...")).toHaveAttribute(
      "pattern",
      "https://.*",
    );
    expect(screen.queryByLabelText(/adicionar documento anexo/i)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText(/não faz upload, cópia ou hospedagem/i)).toBeInTheDocument();
  });

  it("mantém a nomenclatura de protocolo na consulta e no detalhe", async () => {
    vi.stubGlobal("fetch", authenticatedFetch());
    renderAt(`/documentos/${protocol.id}`);

    expect(await screen.findByRole("heading", { name: protocol.protocol })).toBeInTheDocument();
    expect(screen.getByText("Arquivo externo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir arquivo relacionado/i })).toHaveAttribute(
      "href",
      protocol.links[0].url,
    );
    expect(screen.queryByText(/aprovar|rejeitar/i)).not.toBeInTheDocument();
  });
});
