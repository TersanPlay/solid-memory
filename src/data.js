export const statusOptions = [
  { value: 'REGISTRADO', label: 'Registrado' },
  { value: 'EM_ELABORACAO', label: 'Em elaboração' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'RECEBIDO', label: 'Recebido' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const roleLabels = { ADMIN: 'Administradora', OPERATOR: 'Operadora', VIEWER: 'Consulta' };
export const statusLabel = (value) => statusOptions.find((status) => status.value === value)?.label || value;

export function formatProtocol(type, sequence, year) {
  if (!type) return 'Selecione um tipo';
  return `${type.prefix}-${String(sequence).padStart(type.digits, '0')}${type.separator}${year}`;
}
