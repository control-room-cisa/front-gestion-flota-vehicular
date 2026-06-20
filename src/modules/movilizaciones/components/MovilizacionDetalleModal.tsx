import type { ReactNode } from 'react';
import { Modal } from '../../../shared/components/Modal';
import type { MovilizacionDto } from '../types/movilizacion.types';

const formatFechaCompleta = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

interface DetalleRowProps {
  label: string;
  children: ReactNode;
}

const DetalleRow = ({ label, children }: DetalleRowProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1 sm:gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="text-sm text-slate-800">{children}</dd>
  </div>
);

export interface MovilizacionDetalleModalProps {
  open: boolean;
  movilizacion: MovilizacionDto | null;
  onClose: () => void;
  onEdit?: (m: MovilizacionDto) => void;
  onDelete?: (m: MovilizacionDto) => void;
}

export const MovilizacionDetalleModal = ({
  open,
  movilizacion,
  onClose,
  onEdit,
  onDelete,
}: MovilizacionDetalleModalProps) => {
  if (!movilizacion) return null;

  const recorrido =
    movilizacion.kilometrajeFinal - movilizacion.kilometrajeInicial;

  return (
    <Modal
      open={open}
      title="Detalle de movilización"
      subtitle="Registro completo"
      size="lg"
      onClose={onClose}
      footer={
        <>
          {movilizacion.canManage && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(movilizacion)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Editar
            </button>
          )}
          {movilizacion.canManage && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(movilizacion)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </>
      }
    >
      <dl className="divide-y divide-slate-100">
        <DetalleRow label="Fecha y hora">
          {formatFechaCompleta(movilizacion.fecha)}
        </DetalleRow>
        <DetalleRow label="Usuario">
          <span className="font-semibold">
            {movilizacion.usuario.nombre} {movilizacion.usuario.apellido}
          </span>
          <span className="block text-xs text-slate-500 font-mono mt-0.5">
            {movilizacion.usuario.codigo_empleado}
          </span>
        </DetalleRow>
        <DetalleRow label="Vehículo">
          <span className="font-semibold">{movilizacion.unidad.nombre}</span>
          <span className="block text-xs font-mono uppercase text-slate-500 mt-0.5">
            {movilizacion.unidad.clase}
          </span>
        </DetalleRow>
        <DetalleRow label="Km inicial">
          <span className="font-mono">
            {movilizacion.kilometrajeInicial.toLocaleString('es-GT')}
          </span>
        </DetalleRow>
        <DetalleRow label="Km final">
          <span className="font-mono">
            {movilizacion.kilometrajeFinal.toLocaleString('es-GT')}
          </span>
        </DetalleRow>
        <DetalleRow label="Recorrido">
          <span className="font-mono font-semibold text-indigo-700">
            {recorrido.toLocaleString('es-GT')} km
          </span>
        </DetalleRow>
        <DetalleRow label="Es viaje">
          {movilizacion.esViaje ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
              Sí
            </span>
          ) : (
            <span className="text-slate-500">No</span>
          )}
        </DetalleRow>
        <DetalleRow label="Empresas">
          {movilizacion.empresas.length === 0 ? (
            <span className="text-slate-500">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {movilizacion.empresas.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                  title={e.codigo}
                >
                  {e.nombre}
                </span>
              ))}
            </div>
          )}
        </DetalleRow>
        <DetalleRow label="Comentario">
          <p className="whitespace-pre-line break-words">{movilizacion.comentario}</p>
        </DetalleRow>
      </dl>
    </Modal>
  );
};
