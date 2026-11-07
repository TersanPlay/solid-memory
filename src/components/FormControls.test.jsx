import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { DatePicker, parseDateValue, SearchableSelect, serializeDateValue, SoftSelect } from './FormControls.jsx';

const options = [
  { value: 'admin', label: 'Admin' },
  { value: 'VIEWER', label: 'Consulta' },
];

afterEach(cleanup);

function ControlledDatePicker(props) {
  const [value, setValue] = useState(props.value || '');
  return <DatePicker {...props} value={value} onChange={setValue} />;
}

describe('controles modernos de formulário', () => {
  it('abre o seletor simples, permite selecionar e devolve o foco ao fechar', async () => {
    const onChange = vi.fn();
    render(<SoftSelect ariaLabel="Perfil" value="admin" onChange={onChange} options={options} />);
    const trigger = screen.getByRole('combobox', { name: 'Perfil' });

    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('option', { name: 'Consulta' }));

    expect(onChange).toHaveBeenCalledWith('VIEWER');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('pesquisa catálogos, seleciona uma opção e informa busca vazia', async () => {
    const onChange = vi.fn();
    render(<SearchableSelect
      ariaLabel="Departamento"
      value=""
      onChange={onChange}
      options={[
        { value: 'arquivo', label: 'DEP-ARQUIVO · Arquivo' },
        { value: 'ti', label: 'DEP-TI · Tecnologia', keywords: ['informática'] },
      ]}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Departamento' }));
    const search = await screen.findByRole('combobox', { name: 'Buscar em Departamento' });
    fireEvent.change(search, { target: { value: 'informática' } });
    expect(screen.getByText('DEP-TI · Tecnologia')).toBeInTheDocument();
    expect(screen.queryByText('DEP-ARQUIVO · Arquivo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('DEP-TI · Tecnologia'));
    expect(onChange).toHaveBeenCalledWith('ti');

    fireEvent.click(screen.getByRole('button', { name: 'Departamento' }));
    fireEvent.change(await screen.findByRole('combobox', { name: 'Buscar em Departamento' }), { target: { value: 'inexistente' } });
    expect(screen.getByText('Nenhuma opção encontrada.')).toBeInTheDocument();
  });

  it('mantém datas locais em YYYY-MM-DD sem deslocamento de fuso', () => {
    const parsed = parseDateValue('2026-07-22');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getHours()).toBe(12);
    expect(serializeDateValue(parsed)).toBe('2026-07-22');
    expect(parseDateValue('2026-02-30')).toBeUndefined();
  });

  it('abre o calendário em pt-BR e permite limpar uma data opcional', async () => {
    render(<ControlledDatePicker ariaLabel="Período inicial" value="2026-07-22" clearable />);
    const trigger = screen.getByRole('button', { name: 'Período inicial' });
    expect(trigger).toHaveTextContent('22/07/2026');

    fireEvent.click(trigger);
    expect(await screen.findByText(/julho.*2026/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar data' }));
    expect(trigger).toHaveTextContent('Selecione uma data');
  });

  it('desabilita dias fora dos limites do período', async () => {
    render(<ControlledDatePicker ariaLabel="Período final" value="2026-07-15" minDate="2026-07-10" maxDate="2026-07-20" />);
    fireEvent.click(screen.getByRole('button', { name: 'Período final' }));

    const before = (await screen.findByText('9', { selector: 'button.rdp-day_button' }));
    const after = screen.getByText('21', { selector: 'button.rdp-day_button' });
    expect(before).toBeDisabled();
    expect(after).toBeDisabled();
  });
});
