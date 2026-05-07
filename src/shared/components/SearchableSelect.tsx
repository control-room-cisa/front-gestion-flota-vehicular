import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface SearchableSelectProps<T> {
  /** Lista de opciones disponibles. */
  options: T[];
  /** Valor seleccionado (instancia exacta o que comparta `getKey`). */
  value: T | null;
  /** Devuelve la nueva opción seleccionada (o null al limpiar). */
  onChange: (value: T | null) => void;
  /** Identificador único por opción. */
  getKey: (item: T) => string | number;
  /** Texto principal a mostrar para la opción. */
  getLabel: (item: T) => string;
  /** Texto secundario opcional bajo el label. */
  getSubLabel?: (item: T) => string | undefined;
  /** Texto contra el que se filtra (default: label + subLabel). */
  getSearchText?: (item: T) => string;
  /** Render personalizado por opción (sobreescribe label/sublabel). */
  renderOption?: (item: T, ctx: { active: boolean; selected: boolean }) => ReactNode;
  /** Marca opciones como deshabilitadas (no seleccionables). */
  isDisabled?: (item: T) => boolean;

  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  /** Permite limpiar la selección con un botón "x". */
  clearable?: boolean;
  /** Se muestra al final de cada opción (ej. badges). */
  className?: string;
  id?: string;
}

/**
 * Combobox con buscador. Implementación ligera con Tailwind, sin dependencias.
 * - Click en el input → abre el listado.
 * - Escribir → filtra por `getSearchText` (case-insensitive, sin acentos).
 * - Click fuera o Esc → cierra. Enter selecciona la opción resaltada.
 */
export function SearchableSelect<T>({
  options,
  value,
  onChange,
  getKey,
  getLabel,
  getSubLabel,
  getSearchText,
  renderOption,
  isDisabled,
  placeholder = 'Buscar...',
  emptyText = 'Sin resultados',
  disabled = false,
  required = false,
  clearable = false,
  className,
  id,
}: SearchableSelectProps<T>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const searchText = (item: T) => {
    if (getSearchText) return getSearchText(item);
    const sub = getSubLabel?.(item);
    return sub ? `${getLabel(item)} ${sub}` : getLabel(item);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query);
    return options.filter((item) => normalize(searchText(item)).includes(q));
  }, [options, query]);

  // Cierra al hacer click fuera del componente.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Cuando se abre, deja foco en el input y resetea el resaltado.
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const selectedKey = value !== null ? getKey(value) : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIdx];
      if (item && !isDisabled?.(item)) {
        onChange(item);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const baseInputClass =
    'w-full text-left px-3 py-2 rounded-lg border bg-white outline-none ' +
    (disabled
      ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
      : 'border-slate-200 hover:border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500');

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Input de display + apertura */}
      <button
        id={fieldId}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${baseInputClass} flex items-center justify-between gap-2`}
      >
        <span
          className={`flex-1 truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}
        >
          {value ? getLabel(value) : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && value !== null && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="text-slate-400 hover:text-slate-700 px-1 leading-none"
              aria-label="Limpiar"
            >
              ×
            </span>
          )}
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {/* Para que el form respete `required` cuando no hay selección. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value ? String(getKey(value)) : ''}
          onChange={() => undefined}
          className="sr-only absolute inset-0 opacity-0 pointer-events-none"
        />
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 text-sm divide-y divide-slate-50"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-slate-500">{emptyText}</li>
            ) : (
              filtered.map((item, idx) => {
                const key = getKey(item);
                const selected = selectedKey === key;
                const active = idx === activeIdx;
                const itemDisabled = isDisabled?.(item) ?? false;

                const liClass = [
                  'px-3 py-2 cursor-pointer flex items-start gap-2',
                  itemDisabled
                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                    : active
                      ? 'bg-indigo-50 text-indigo-700'
                      : selected
                        ? 'text-indigo-700'
                        : 'text-slate-700 hover:bg-slate-50',
                ].join(' ');

                return (
                  <li
                    key={key}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={itemDisabled}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => {
                      if (itemDisabled) return;
                      onChange(item);
                      setOpen(false);
                    }}
                    className={liClass}
                  >
                    {renderOption ? (
                      <span className="flex-1 min-w-0">
                        {renderOption(item, { active, selected })}
                      </span>
                    ) : (
                      <span className="flex-1 min-w-0">
                        <div className="font-medium truncate">{getLabel(item)}</div>
                        {getSubLabel?.(item) && (
                          <div className="text-xs text-slate-500 truncate">
                            {getSubLabel(item)}
                          </div>
                        )}
                      </span>
                    )}
                    {selected && (
                      <svg
                        className="h-4 w-4 text-indigo-600 mt-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4L8.5 12l6.8-6.7a1 1 0 011.4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
