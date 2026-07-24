import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Departments, RemoveDepartmentModal } from "./App.jsx";

const availableDepartment = {
  id: "department-free",
  name: "Unidade sem vínculos",
  code: "DEP-LIVRE",
  active: true,
  _count: { originDocuments: 0, destinationDocuments: 0 },
};

const usedDepartment = {
  id: "department-used",
  name: "Unidade vinculada",
  code: "DEP-USADA",
  active: true,
  _count: { originDocuments: 2, destinationDocuments: 1 },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("administração de departamentos", () => {
  it("edita um departamento com formulário preenchido e atualiza a lista", async () => {
    const refresh = vi.fn().mockResolvedValue();
    const notify = vi.fn();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        json({
          data: {
            ...availableDepartment,
            name: "Unidade Atualizada",
            code: "DEP-ATUALIZADA",
          },
        }),
      );
    render(
      <Departments
        departments={[availableDepartment, usedDepartment]}
        refresh={refresh}
        notify={notify}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Editar Unidade sem vínculos" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toHaveValue(
      "Unidade sem vínculos",
    );
    expect(screen.getByLabelText("Identificador")).toHaveValue("DEP-LIVRE");

    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Unidade Atualizada" },
    });
    fireEvent.change(screen.getByLabelText("Identificador"), {
      target: { value: "dep atualizada" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar alterações" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/departments/department-free",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Unidade Atualizada",
            code: "DEP-ATUALIZADA",
          }),
        }),
      ),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Departamento atualizado.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("usa confirmação própria e exclui um departamento sem vínculos", async () => {
    const refresh = vi.fn().mockResolvedValue();
    const notify = vi.fn();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const nativeConfirm = vi.spyOn(window, "confirm");
    render(
      <Departments
        departments={[availableDepartment]}
        refresh={refresh}
        notify={notify}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Excluir Unidade sem vínculos" }),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Manter departamento" }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Excluir Unidade sem vínculos" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Excluir definitivamente" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/departments/department-free",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Departamento excluído.");
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("bloqueia departamentos usados e preserva o modal quando a API rejeita", async () => {
    const refresh = vi.fn().mockResolvedValue();
    const notify = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(
        {
          error: {
            code: "DEPARTMENT_IN_USE",
            message: "O departamento possui documentos vinculados.",
          },
        },
        409,
      ),
    );
    render(
      <Departments
        departments={[availableDepartment, usedDepartment]}
        refresh={refresh}
        notify={notify}
      />,
    );

    expect(screen.getByText("3 vínculos")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Não é possível excluir Unidade vinculada/,
      }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Excluir Unidade sem vínculos" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Excluir definitivamente" }),
    );

    expect(
      await screen.findByText("O departamento possui documentos vinculados."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("expõe a confirmação como alertdialog acessível", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <RemoveDepartmentModal
        department={availableDepartment}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("DEP-LIVRE")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Manter departamento" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Excluir definitivamente" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
