export const statusOptions = [
  { value: 'REGISTRADO', label: 'Registrado' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'RECEBIDO', label: 'Recebido' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const roleLabels = { admin: 'Admin', OPERATOR: 'Operadora', VIEWER: 'Consulta' };
export const statusLabel = (value) => statusOptions.find((status) => status.value === value)?.label || value;

export function formatProtocol(type, sequence, year) {
  if (!type) return 'Selecione um tipo';
  return `${type.prefix}-${String(sequence).padStart(type.digits, '0')}/${year}`;
}
