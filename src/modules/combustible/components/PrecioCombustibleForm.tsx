import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import {
  parseDecimalInput,
  sanitizeDecimalInput,
} from '../../../shared/utils/numeric-input';
import type {
  CreatePrecioCombustibleDto,
  PrecioCombustibleDto,
  TipoCombustiblePrecio,
  UpdatePrecioCombustibleDto,
} from '../types/precio-combustible.types';
import { TIPO_COMBUSTIBLE_PRECIO_LABELS } from '../types/precio-combustible.types';

const COMENTARIO_MAX = 100;

interface PrecioCombustibleFormProps {
  open: boolean;
  initial?: PrecioCombustibleDto | null;
  onClose: () => void;
  onSubmit: (
    data: CreatePrecioCombustibleDto | UpdatePrecioCombustibleDto,
  ) => Promise<void>;
}

const todayDateInput = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const PrecioCombustibleForm = ({
  open,
  initial,
  onClose,
  onSubmit,
}: PrecioCombustibleFormProps) => {
  const editing = Boolean(initial);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [precioGalon, setPrecioGalon] = useState('');
  const [tipoCombustible, setTipoCombustible] =
    useState<TipoCombustiblePrecio>('DIESEL');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const hoy = todayDateInput();
    setFechaInicio(initial?.fechaInicio ?? hoy);
    setFechaFin(initial?.fechaFin ?? hoy);
    setPrecioGalon(initial?.precioGalon ?? '');
    setTipoCombustible(initial?.tipoCombustible ?? 'DIESEL');
    setComentario(initial?.comentario ?? '');
    setError(undefined);
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (fechaFin < fechaInicio) {
      setError('La fecha fin no puede ser anterior a la fecha inicio');
      return;
    }

    const precioNum = parseDecimalInput(precioGalon);
    if (precioNum === null || precioNum < 0) {
      setError('Ingresa un precio por galón válido');
      return;
    }

    const comentarioTrim = comentario.trim();
    if (comentarioTrim.length > COMENTARIO_MAX) {
      setError(`El comentario no puede exceder ${COMENTARIO_MAX} caracteres`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        fechaInicio,
        fechaFin,
        precioGalon: precioNum,
        tipoCombustible,
        comentario: comentarioTrim || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar precio' : 'Nuevo precio'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Fecha inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Fecha fin
            </label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Precio por galón (L)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={precioGalon}
              onChange={(e) =>
                setPrecioGalon(sanitizeDecimalInput(e.target.value))
              }
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Tipo de combustible
            </label>
            <select
              value={tipoCombustible}
              onChange={(e) =>
                setTipoCombustible(e.target.value as TipoCombustiblePrecio)
              }
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {(Object.keys(TIPO_COMBUSTIBLE_PRECIO_LABELS) as TipoCombustiblePrecio[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {TIPO_COMBUSTIBLE_PRECIO_LABELS[t]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Comentario</label>
          <textarea
            value={comentario}
            onChange={(e) =>
              setComentario(e.target.value.slice(0, COMENTARIO_MAX))
            }
            maxLength={COMENTARIO_MAX}
            rows={2}
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
            placeholder="Opcional"
          />
          <p className="text-xs text-slate-500 text-right tabular-nums">
            {comentario.length}/{COMENTARIO_MAX}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
          >
            {submitting ? 'Guardando…' : editing ? 'Actualizar' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
