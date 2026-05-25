import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  /** Tiempo en ms antes de auto-cerrarse. 0 = no se cierra solo. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'title'>> {
  id: number;
  title?: string;
}

interface ToastApi {
  show: (opts: ToastOptions) => number;
  success: (message: string, title?: string) => number;
  error: (message: string, title?: string) => number;
  warning: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION = 4000;

const variantStyles: Record<
  ToastVariant,
  { ring: string; bg: string; iconBg: string; iconColor: string; icon: ReactNode }
> = {
  success: {
    ring: 'ring-emerald-200',
    bg: 'bg-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.71-9.71a1 1 0 00-1.42-1.42L9 10.17 7.71 8.88a1 1 0 10-1.42 1.41l2 2a1 1 0 001.42 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    ring: 'ring-red-200',
    bg: 'bg-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9V6a1 1 0 112 0v3a1 1 0 11-2 0zm0 4a1 1 0 112 0 1 1 0 01-2 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    ring: 'ring-amber-200',
    bg: 'bg-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 16H3.72a1.75 1.75 0 01-1.515-2.63L8.485 2.495zM10 7a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0110 7zm0 7.25a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    ring: 'ring-indigo-200',
    bg: 'bg-white',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

const ToastCard = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) => {
  const v = variantStyles[toast.variant];
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl ${v.bg} px-4 py-3 shadow-lg ring-1 ${v.ring} animate-[toast-in_180ms_ease-out]`}
    >
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${v.iconBg} ${v.iconColor}`}
      >
        {v.icon}
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
        )}
        <p className="text-sm text-slate-700 break-words whitespace-pre-line">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar"
        className="shrink-0 text-slate-400 hover:text-slate-700 rounded p-1 -m-1"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Provider global de notificaciones tipo "toast".
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Excel generado');
 *   toast.error('No se pudo eliminar el registro');
 *   toast.show({ variant: 'warning', title: 'Atención', message: '...' });
 *
 * Los toasts se apilan en la esquina superior derecha y se auto-cierran
 * después de `duration` ms (4000 por defecto). `duration: 0` los deja
 * pegados hasta cierre manual.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (opts: ToastOptions): number => {
      idRef.current += 1;
      const id = idRef.current;
      const item: ToastItem = {
        id,
        title: opts.title,
        message: opts.message,
        variant: opts.variant ?? 'info',
        duration: opts.duration ?? DEFAULT_DURATION,
      };
      setItems((prev) => [...prev, item]);
      if (item.duration > 0) {
        const t = setTimeout(() => dismiss(id), item.duration);
        timersRef.current.set(id, t);
      }
      return id;
    },
    [dismiss],
  );

  // Limpia todos los timers pendientes si el provider se desmonta.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api: ToastApi = {
    show,
    success: (message, title) => show({ message, title, variant: 'success' }),
    error: (message, title) =>
      show({ message, title, variant: 'error', duration: 6000 }),
    warning: (message, title) => show({ message, title, variant: 'warning' }),
    info: (message, title) => show({ message, title, variant: 'info' }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <>
          <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
          <div
            aria-live="polite"
            aria-atomic="false"
            className="pointer-events-none fixed top-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
          >
            {items.map((t) => (
              <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>
        </>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
};
