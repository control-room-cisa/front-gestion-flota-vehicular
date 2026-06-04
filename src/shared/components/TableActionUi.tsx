/** Columnas visibles solo desde `lg` (1024px). */
export const COL_LG = 'hidden lg:table-cell';

export const actionsCellClass =
  'w-9 max-w-9 px-0.5 py-3 text-right whitespace-nowrap sm:w-auto sm:max-w-none sm:px-2 lg:px-4';

/** Sin `display`: evita que `inline-flex` pise `hidden` en breakpoints responsivos. */
export const iconBtnClass =
  'items-center justify-center p-2 rounded-lg border transition-colors shrink-0 disabled:opacity-50';

export const menuDotsBtnClass =
  'inline-flex items-center justify-center p-1 text-slate-500 hover:text-slate-800 rounded transition-colors';

export const menuItemClass =
  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50';

export const PencilIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="m2.695 14.295 1.17-3.505a1 1 0 0 1 .26-.365l8.086-8.086a2.121 2.121 0 1 1 3 3l-8.086 8.086a1 1 0 0 1-.365.26l-3.505 1.17 1.17-1.17ZM12.22 4.22l1.56 1.56-1.06 1.06-1.56-1.56 1.06-1.06Z" />
  </svg>
);

export const TrashIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M8.75 2A2.75 2.75 0 0 0 6 4.75v.5H3.75a.75.75 0 0 0 0 1.5h.386l.77 9.256a2.25 2.25 0 0 0 2.238 2.044h6.692a2.25 2.25 0 0 0 2.238-2.044l.77-9.256h.386a.75.75 0 0 0 0-1.5H14v-.5A2.75 2.75 0 0 0 11.25 2h-2.5Zm-1.5 1.5v-.5h5.5v.5H7.25Zm-.886 2.25h7.272l-.729 8.756a.75.75 0 0 1-.746.694H7.61a.75.75 0 0 1-.746-.694l-.729-8.756Z"
      clipRule="evenodd"
    />
  </svg>
);

export const EllipsisVerticalIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M10 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
  </svg>
);

/** Inactivar / desactivar */
export const NoSymbolIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
      clipRule="evenodd"
    />
  </svg>
);

/** Reactivar */
export const ArrowPathIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466 5.5 5.5 0 0 1-5.5-5.5 5.5 5.5 0 0 1 10.435-2.16.75.75 0 0 0-1.228-.814 7 7 0 1 0 2.18 9.75.75.75 0 0 0 1.226.81 5.5 5.5 0 0 0 5.836-5.136Z"
      clipRule="evenodd"
    />
  </svg>
);

export const TableActionsHeader = () => (
  <th
    scope="col"
    aria-label="Acciones"
    className="w-9 max-w-9 px-0.5 py-3 text-right sm:w-auto sm:max-w-none sm:px-2 lg:px-4"
  >
    <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-slate-600">
      Acciones
    </span>
  </th>
);

export const tableScrollWrapClass =
  'overflow-x-auto lg:overflow-visible overscroll-x-contain [-webkit-overflow-scrolling:touch]';
