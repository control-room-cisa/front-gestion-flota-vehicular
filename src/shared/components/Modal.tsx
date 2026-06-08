import { useEffect, type ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

interface ModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  /** Si es true, el clic en backdrop / Esc no cierran el modal. */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Acciones del pie (derecha). El cierre queda siempre a la izquierda. */
  footer?: ReactNode;
  /** Etiqueta del botón de cierre. Por defecto: "Cerrar". */
  closeLabel?: string;
}

/**
 * Modal genérico de Tailwind. Render imperativo controlado por `open`.
 * Usa `<div>` + portal-like positioning con `fixed inset-0`. No requiere
 * dependencias externas.
 */
export const Modal = ({
  open,
  title,
  subtitle,
  size = 'md',
  busy = false,
  onClose,
  children,
  footer,
  closeLabel = 'Cerrar',
}: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div
        className={`relative w-full ${sizeClass[size]} max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden`}
      >
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-slate-100">
            {subtitle && (
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            )}
          </div>
        )}

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-60"
            >
              {closeLabel}
            </button>
            <div className="flex justify-end gap-2 flex-wrap">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
};
