import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimpleModal } from './App.jsx';

describe('SimpleModal', () => {
  it('renderiza sobre as camadas da página e mantém as ações clicáveis', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <div className="app-content">
        <SimpleModal title="Novo departamento" description="Cadastro" onClose={onClose}>
          <form onSubmit={onSubmit}>
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit">Adicionar</button>
          </form>
        </SimpleModal>
      </div>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.parentElement).toBe(document.body);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
