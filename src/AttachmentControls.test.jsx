import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AttachmentPicker,
  canEditDocument,
  RemoveAttachmentModal,
} from "./App.jsx";

afterEach(cleanup);

function PickerHarness({ initialFile = null, disabled = false }) {
  const [file, setFile] = useState(initialFile);
  return (
    <AttachmentPicker file={file} onChange={setFile} disabled={disabled} />
  );
}

describe("controles de anexos", () => {
  it("remove a seleção local e permite escolher novamente o mesmo arquivo", () => {
    const file = new File(["conteúdo"], "memorando.pdf", {
      type: "application/pdf",
    });
    const { container } = render(<PickerHarness />);
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("memorando.pdf")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Remover anexo selecionado" }),
    );
    expect(screen.queryByText("memorando.pdf")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("memorando.pdf")).toBeInTheDocument();
  });

  it("bloqueia troca e remoção durante o salvamento", () => {
    const file = new File(["conteúdo"], "bloqueado.pdf", {
      type: "application/pdf",
    });
    const { container } = render(<PickerHarness initialFile={file} disabled />);

    expect(container.querySelector('input[type="file"]')).toBeDisabled();
    expect(
      within(container).getByRole("button", {
        name: "Remover anexo selecionado",
      }),
    ).toBeDisabled();
  });

  it("confirma ou abandona a remoção persistida em um alertdialog próprio", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RemoveAttachmentModal
        attachment={{ originalName: "laudo.pdf", size: 4096 }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("laudo.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manter anexo" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Remover definitivamente" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("exibe mutações somente para perfis autorizados em documentos ativos", () => {
    const active = { status: "REGISTRADO", createdById: "operator-1" };
    expect(canEditDocument({ id: "admin-1", role: "ADMIN" }, active)).toBe(
      true,
    );
    expect(
      canEditDocument({ id: "operator-1", role: "OPERATOR" }, active),
    ).toBe(true);
    expect(
      canEditDocument({ id: "operator-2", role: "OPERATOR" }, active),
    ).toBe(false);
    expect(canEditDocument({ id: "viewer-1", role: "VIEWER" }, active)).toBe(
      false,
    );
    expect(
      canEditDocument(
        { id: "admin-1", role: "ADMIN" },
        { ...active, status: "CANCELADO" },
      ),
    ).toBe(false);
  });
});
