import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { ConfirmDialog, type ConfirmVariant } from './ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingState {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/**
 * Provider del modal de confirmación.
 *
 * Expone `useConfirm()` que devuelve una función imperativa
 * `confirm(options)` => `Promise<boolean>`.
 *
 * Ejemplo:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Eliminar empresa',
 *     message: '¿Seguro que deseas eliminar ACME?',
 *     variant: 'danger',
 *     confirmText: 'Eliminar',
 *   });
 *   if (ok) await empresaService.remove(id);
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<PendingState | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        setPending({ opts, resolve });
      }),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.opts.title}
        message={pending?.opts.message ?? ''}
        confirmText={pending?.opts.confirmText}
        cancelText={pending?.opts.cancelText}
        variant={pending?.opts.variant}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  }
  return ctx;
};
