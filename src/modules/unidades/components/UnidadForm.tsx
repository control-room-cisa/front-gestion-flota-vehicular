import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { parseDecimalInput, sanitizeDecimalInput } from '../../../shared/utils/numeric-input';
import { categoriaService } from '../../categorias/services/categoria.service';
import {
  CATEGORIA_CODIGO_VEHICULOS_LIVIANOS,
  type CategoriaDto,
} from '../../categorias/types/categoria.types';
import type {
  CreateUnidadDto,
  TipoCombustible,
  TipoMedicion,
  UnidadDto,
  UpdateUnidadDto,
} from '../types/unidad.types';
import { TIPO_COMBUSTIBLE_LABELS, TIPO_MEDICION_LABELS } from '../types/unidad.types';

interface UnidadFormProps {
  open: boolean;
  initial?: UnidadDto | null;
  /** Categoría preseleccionada al crear (p. ej. la del filtro de la tabla). */
  defaultCategoriaId?: number;
  onClose: () => void;
  onSubmit: (data: CreateUnidadDto | UpdateUnidadDto) => Promise<void>;
}

const toInput = (value: string | null | undefined): string =>
  value == null ? '' : value;

export const UnidadForm = ({
  open,
  initial,
  defaultCategoriaId,
  onClose,
  onSubmit,
}: UnidadFormProps) => {
  const editing = Boolean(initial);
  const [nombre, setNombre] = useState('');
  const [clase, setClase] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [tipoMedicion, setTipoMedicion] = useState<TipoMedicion>('KILOMETRAJE');
  const [tipoCombustible, setTipoCombustible] = useState<TipoCombustible>('DIESEL');
  const [horometro, setHorometro] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [cantidadHoras, setCantidadHoras] = useState('');
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoriaService
      .list(true)
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    setNombre(initial?.nombre ?? '');
    setClase(initial?.clase ?? '');
    setCategoriaId(initial?.categoriaId ?? defaultCategoriaId ?? '');
    setTipoMedicion(initial?.tipoMedicion ?? 'KILOMETRAJE');
    setTipoCombustible(initial?.tipoCombustible ?? 'DIESEL');
    setHorometro(toInput(initial?.horometro));
    setInicio(toInput(initial?.inicio));
    setFin(toInput(initial?.fin));
    setCantidadHoras(toInput(initial?.cantidadHoras));
    setError(undefined);
  }, [open, initial, defaultCategoriaId]);

  const categoriasOptions = useMemo(
    () => categorias.filter((c) => c.activo || c.id === initial?.categoriaId),
    [categorias, initial?.categoriaId],
  );

  const esVehiculosLivianos = useMemo(() => {
    if (categoriaId === '') return false;
    const cat = categorias.find((c) => c.id === categoriaId);
    return cat?.codigo === CATEGORIA_CODIGO_VEHICULOS_LIVIANOS;
  }, [categoriaId, categorias]);

  useEffect(() => {
    if (!open || !esVehiculosLivianos) return;
    setTipoMedicion('KILOMETRAJE');
    setHorometro('');
    setInicio('');
    setFin('');
    setCantidadHoras('');
  }, [open, esVehiculosLivianos]);

  const onCategoriaChange = (nextId: number | '') => {
    setCategoriaId(nextId);
    if (nextId === '') return;
    const cat = categorias.find((c) => c.id === nextId);
    if (cat?.codigo === CATEGORIA_CODIGO_VEHICULOS_LIVIANOS) {
      setTipoMedicion('KILOMETRAJE');
      setHorometro('');
      setInicio('');
      setFin('');
      setCantidadHoras('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (categoriaId === '') {
      setError('Selecciona una categoría');
      return;
    }

    const payload: CreateUnidadDto = {
      nombre: nombre.trim(),
      clase: clase.trim(),
      categoriaId,
      tipoMedicion,
      tipoCombustible,
    };

    if (tipoMedicion === 'HOROMETRO') {
      payload.horometro = parseDecimalInput(horometro);
      payload.inicio = parseDecimalInput(inicio);
      payload.fin = parseDecimalInput(fin);
    } else if (tipoMedicion === 'HORAS_USO') {
      payload.inicio = parseDecimalInput(inicio);
      payload.fin = parseDecimalInput(fin);
      payload.cantidadHoras = parseDecimalInput(cantidadHoras);
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const decimalInputClass =
    'px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      size="xl"
      title={editing ? `Editar ${initial?.clase}` : 'Nueva unidad'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Código de clase</label>
            <input
              type="text"
              value={clase}
              onChange={(e) => setClase(e.target.value.toUpperCase())}
              maxLength={10}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 font-mono uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="VH-001"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={50}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Ej. Toyota Hilux 2024"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) =>
                onCategoriaChange(e.target.value ? Number(e.target.value) : '')
              }
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Seleccionar...</option>
              {categoriasOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {!c.activo ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Tipo de medición</label>
            <select
              value={tipoMedicion}
              onChange={(e) => setTipoMedicion(e.target.value as TipoMedicion)}
              disabled={esVehiculosLivianos}
              className={
                'px-3 py-2 rounded-lg border border-slate-200 outline-none ' +
                (esVehiculosLivianos
                  ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500')
              }
            >
              {(Object.keys(TIPO_MEDICION_LABELS) as TipoMedicion[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_MEDICION_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Combustible</label>
            <select
              value={tipoCombustible}
              onChange={(e) => setTipoCombustible(e.target.value as TipoCombustible)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {(Object.keys(TIPO_COMBUSTIBLE_LABELS) as TipoCombustible[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_COMBUSTIBLE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tipoMedicion === 'HOROMETRO' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Horómetro</label>
              <input
                type="text"
                inputMode="decimal"
                value={horometro}
                onChange={(e) => setHorometro(sanitizeDecimalInput(e.target.value))}
                required
                className={decimalInputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Inicio</label>
              <input
                type="text"
                inputMode="decimal"
                value={inicio}
                onChange={(e) => setInicio(sanitizeDecimalInput(e.target.value))}
                required
                className={decimalInputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Fin</label>
              <input
                type="text"
                inputMode="decimal"
                value={fin}
                onChange={(e) => setFin(sanitizeDecimalInput(e.target.value))}
                required
                className={decimalInputClass}
              />
            </div>
          </div>
        )}

        {tipoMedicion === 'HORAS_USO' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Inicio</label>
              <input
                type="text"
                inputMode="decimal"
                value={inicio}
                onChange={(e) => setInicio(sanitizeDecimalInput(e.target.value))}
                required
                className={decimalInputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Fin</label>
              <input
                type="text"
                inputMode="decimal"
                value={fin}
                onChange={(e) => setFin(sanitizeDecimalInput(e.target.value))}
                required
                className={decimalInputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-slate-700">Cantidad horas</label>
              <input
                type="text"
                inputMode="decimal"
                value={cantidadHoras}
                onChange={(e) =>
                  setCantidadHoras(sanitizeDecimalInput(e.target.value))
                }
                required
                className={decimalInputClass}
              />
            </div>
          </div>
        )}

        {tipoMedicion === 'KILOMETRAJE' && (
          <p className="text-sm text-slate-500">
            Las unidades por kilometraje registran sus lecturas en movilizaciones.
          </p>
        )}

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
            {submitting ? 'Guardando…' : editing ? 'Actualizar' : 'Crear unidad'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
