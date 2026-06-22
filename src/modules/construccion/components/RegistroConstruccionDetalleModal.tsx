import type { ReactNode } from 'react';
import { Modal } from '../../../shared/components/Modal';
import type { RegistroConstruccionDto } from '../types/registro-construccion.types';

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const DetalleRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1 sm:gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="text-sm text-slate-800">{children}</dd>
  </div>
);

export interface RegistroConstruccionDetalleModalProps {
  open: boolean;
  registro: RegistroConstruccionDto | null;
  onClose: () => void;
  onEdit?: (r: RegistroConstruccionDto) => void;
  onDelete?: (r: RegistroConstruccionDto) => void;
}

export const RegistroConstruccionDetalleModal = ({
  open,
  registro,
  onClose,
  onEdit,
  onDelete,
}: RegistroConstruccionDetalleModalProps) => {
  if (!registro) return null;

  const kmRecorrido =
    registro.kilometrajeInicial != null && registro.kilometrajeFinal != null
      ? registro.kilometrajeFinal - registro.kilometrajeInicial
      : null;
  const horasUso =
    registro.horaInicial != null && registro.horaFinal != null
      ? registro.horaFinal - registro.horaInicial
      : null;

  const muestraKm =
    registro.kilometrajeInicial != null || registro.kilometrajeFinal != null;
  const muestraHoras =
    registro.horaInicial != null || registro.horaFinal != null;

  return (
    <Modal
      open={open}
      title="Detalle de registro"
      subtitle="Uso maquinaria"
      size="lg"
      onClose={onClose}
      footer={
        <>
          {registro.canManage && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(registro)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Editar
            </button>
          )}
          {registro.canManage && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(registro)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </>
      }
    >
      <dl className="divide-y divide-slate-100">
        <DetalleRow label="Fecha">{formatFecha(registro.fecha)}</DetalleRow>
        <DetalleRow label="Unidad">
          {registro.unidad.clase.toUpperCase()} — {registro.unidad.nombre}
        </DetalleRow>
        <DetalleRow label="Operador">
          {registro.operador.nombre} {registro.operador.apellido} (
          {registro.operador.codigo_empleado})
        </DetalleRow>
        {muestraKm && (
          <>
            <DetalleRow label="Km inicial">
              {registro.kilometrajeInicial?.toLocaleString('es-GT') ?? '—'}
            </DetalleRow>
            <DetalleRow label="Km final">
              {registro.kilometrajeFinal?.toLocaleString('es-GT') ?? '—'}
            </DetalleRow>
            <DetalleRow label="Km recorridos">
              {kmRecorrido !== null ? kmRecorrido.toLocaleString('es-GT') : '—'}
            </DetalleRow>
          </>
        )}
        {muestraHoras && (
          <>
            <DetalleRow label="H. inicial">
              {registro.horaInicial?.toLocaleString('es-GT') ?? '—'}
            </DetalleRow>
            <DetalleRow label="H. final">
              {registro.horaFinal?.toLocaleString('es-GT') ?? '—'}
            </DetalleRow>
            <DetalleRow label="Horas uso">
              {horasUso !== null ? horasUso.toLocaleString('es-GT') : '—'}
            </DetalleRow>
          </>
        )}
        <DetalleRow label="Empresas">
          {registro.empresas.map((e) => e.nombre).join(', ') || '—'}
        </DetalleRow>
        <DetalleRow label="Comentario">{registro.comentario}</DetalleRow>
      </dl>
    </Modal>
  );
};
