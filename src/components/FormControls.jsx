import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { Command } from 'cmdk';
import { CalendarDays, Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import 'react-day-picker/style.css';

const displayDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function parseDateValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : undefined;
}

export function serializeDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeOptions(options) {
  return options.map((option) => ({
    ...option,
    value: String(option.value),
    label: String(option.label),
    keywords: Array.isArray(option.keywords) ? option.keywords.map(String) : option.keywords ? [String(option.keywords)] : [],
  }));
}

export function SoftSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Selecione',
  disabled = false,
  required = false,
}) {
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  return <Select.Root value={value || undefined} onValueChange={onChange} disabled={disabled}>
    <Select.Trigger className="soft-select-trigger" aria-label={ariaLabel} aria-required={required || undefined}>
      <Select.Value placeholder={placeholder} />
      <Select.Icon><ChevronDown /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="soft-select-content" position="popper" sideOffset={7} collisionPadding={12}>
        <Select.ScrollUpButton className="soft-select-scroll"><ChevronUp /></Select.ScrollUpButton>
        <Select.Viewport className="soft-select-viewport">
          {normalizedOptions.map((option) => <Select.Item className="soft-select-item" value={option.value} key={option.value}>
            <Select.ItemText>{option.label}</Select.ItemText>
            <Select.ItemIndicator><Check /></Select.ItemIndicator>
          </Select.Item>)}
        </Select.Viewport>
        <Select.ScrollDownButton className="soft-select-scroll"><ChevronDown /></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Nenhuma opção encontrada.',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const selected = normalizedOptions.find((option) => option.value === value);
  const changeOpen = (nextOpen) => {
    if (!disabled) setOpen(nextOpen);
  };

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger asChild>
      <button
        type="button"
        className="soft-select-trigger searchable-select-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-required={required || undefined}
        disabled={disabled}
      >
        <span className={selected ? '' : 'control-placeholder'}>{selected?.label || placeholder}</span>
        <ChevronDown />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="searchable-select-content" sideOffset={7} collisionPadding={12} align="start">
        <Command loop label={`Buscar em ${ariaLabel}`}>
          <div className="command-search"><Search /><Command.Input aria-label={`Buscar em ${ariaLabel}`} placeholder={searchPlaceholder} autoFocus /></div>
          <Command.List>
            <Command.Empty>{emptyMessage}</Command.Empty>
            <Command.Group>
              {normalizedOptions.map((option) => <Command.Item
                key={option.value}
                value={`${option.label} ${option.value}`}
                keywords={option.keywords}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check aria-hidden="true" />}
              </Command.Item>)}
            </Command.Group>
          </Command.List>
        </Command>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder = 'Selecione uma data',
  required = false,
  clearable = false,
  minDate,
  maxDate,
  disabled = false,
}) {
  const selected = parseDateValue(value);
  const minimum = parseDateValue(minDate);
  const maximum = parseDateValue(maxDate);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected || new Date());
  const disabledDays = [minimum && { before: minimum }, maximum && { after: maximum }].filter(Boolean);

  const changeOpen = (nextOpen) => {
    if (nextOpen && selected) setMonth(selected);
    setOpen(nextOpen);
  };

  return <Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger asChild>
      <button
        type="button"
        className="date-picker-trigger"
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
      >
        <span className={selected ? '' : 'control-placeholder'}>{selected ? displayDateFormatter.format(selected) : placeholder}</span>
        <CalendarDays />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="date-picker-content" sideOffset={7} collisionPadding={12} align="start">
        <DayPicker
          mode="single"
          animate
          locale={ptBR}
          navLayout="around"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          disabled={disabledDays.length ? disabledDays : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(serializeDateValue(date));
            setOpen(false);
          }}
        />
        {clearable && value && <div className="date-picker-actions"><button type="button" onClick={() => { onChange(''); setOpen(false); }}>Limpar data</button></div>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
