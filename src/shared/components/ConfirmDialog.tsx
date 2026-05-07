import { useEffect, type ReactNode } from 'react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles: Record<
  ConfirmVariant,
  { iconBg: string; iconColor: string; button: string; icon: ReactNode }
> = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    button:
      'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600 disabled:bg-red-400',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376C1.83 17.626 2.914 19.5 4.645 19.5h14.71c1.73 0 2.815-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    button:
      'bg-amber-600 hover:bg-amber-500 focus-visible:outline-amber-600 disabled:bg-amber-400',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    button:
      'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600 disabled:bg-indigo-400',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
        />
      </svg>
    ),
  },
};

/**
 * Diálogo de confirmación reutilizable. Por sí solo es un componente
 * presentacional; usa `useConfirm()` desde `ConfirmProvider` para
 * invocarlo de forma imperativa con `await confirm(...)`.
 */
export const ConfirmDialog = ({
  open,
  title = 'Confirmar acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'info',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
      if (e.key === 'Enter' && !loading) onConfirm();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  const v = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : onCancel}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="p-6 flex gap-4">
          <div
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${v.iconBg} ${v.iconColor}`}
          >
            {v.icon}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white outline-2 outline-offset-2 ${v.button}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
