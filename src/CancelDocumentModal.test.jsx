import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CancelDocumentModal } from './App.jsx';

describe('CancelDocumentModal', () => {
  it('permite voltar ou confirmar sem usar uma janela nativa', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(<CancelDocumentModal protocol="MEMO-014/2026" onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('MEMO-014/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manter documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
