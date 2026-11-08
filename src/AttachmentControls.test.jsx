import { describe, expect, it } from "vitest";
import { canEditDocument } from "./utils/format";

describe("controles de protocolo", () => {
  it("exibe mutações somente para perfis autorizados em protocolos ativos", () => {
    const active = { status: "ENVIADO", createdById: "operator-1" };
    expect(canEditDocument({ id: "admin-1", role: "admin" }, active)).toBe(true);
    expect(canEditDocument({ id: "operator-1", role: "OPERATOR" }, active)).toBe(true);
    expect(canEditDocument({ id: "operator-2", role: "OPERATOR" }, active)).toBe(false);
    expect(canEditDocument({ id: "viewer-1", role: "VIEWER" }, active)).toBe(false);
    expect(canEditDocument({ id: "admin-1", role: "admin" }, { ...active, status: "CANCELADO" })).toBe(false);
  });
});
