import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { movilizacionService } from '../../movilizaciones/services/movilizacion.service';
import type { UltimaMovilizacionVehiculoDto } from '../../movilizaciones/types/movilizacion.types';
import type { VehiculoDto } from '../../vehiculos/types/vehiculo.types';
import type {
  CreateDispensadoDto,
  DispensadoDto,
  UpdateDispensadoDto,
} from '../types/dispensado.types';

export interface DispensadoFormProps {
  open: boolean;
  initial?: DispensadoDto | null;
  vehiculos: VehiculoDto[];
  onClose: () => void;
  onSubmit: (data: CreateDispensadoDto | UpdateDispensadoDto) => Promise<void>;
}

const toLocalInput = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

const fromLocalInput = (local: string): string => new Date(local).toISOString();

/** Convierte el input string del usuario a número decimal (acepta coma o punto). */
const parseDecimal = (raw: string): number | null => {
  const norm = raw.trim().replace(',', '.');
  if (norm === '') return null;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
};

/** Formatea un monto en lempiras (HNL) con 2 decimales. */
const formatLempiras = (n: number): string =>
  n.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export const DispensadoForm = ({
  open,
  initial,
  vehiculos,
  onClose,
  onSubmit,
}: DispensadoFormProps) => {
  const editing = Boolean(initial);

  const [fecha, setFecha] = useState('');
  const [vehiculo, setVehiculo] = useState<VehiculoDto | null>(null);
  const [kilometraje, setKilometraje] = useState('');
  const [cantidadGalones, setCantidadGalones] = useState('');
  const [precioGalon, setPrecioGalon] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Última movilización registrada para el vehículo seleccionado, usada para
  // la alerta informativa de continuidad de kilometraje.
  const [ultimaMov, setUltimaMov] = useState<UltimaMovilizacionVehiculoDto | null>(
    null,
  );
  const [ultimaCargando, setUltimaCargando] = useState(false);

  // Catálogo de vehículos: solo activos. En edición conservamos el seleccionado
  // aunque haya quedado inactivo, para no perder el dato.
  const vehiculosOptions = useMemo<VehiculoDto[]>(() => {
    const activos = vehiculos.filter((v) => v.activo);
    if (initial && !activos.some((v) => v.id === initial.vehiculo.id)) {
      return [...activos, { ...initial.vehiculo, activo: false }];
    }
    return activos;
  }, [vehiculos, initial]);

  useEffect(() => {
    if (!open) return;

    setFecha(toLocalInput(initial?.fecha));
    setKilometraje(initial ? String(initial.kilometraje) : '');
    setCantidadGalones(initial ? initial.cantidadGalones : '');
    setPrecioGalon(initial ? initial.precioGalon : '');
    setObservaciones(initial?.observaciones ?? '');
    setError(undefined);
    setUltimaMov(null);

    if (initial) {
      setVehiculo(
        vehiculosOptions.find((v) => v.id === initial.vehiculo.id) ?? null,
      );
    } else {
      setVehiculo(null);
    }
  }, [open, initial, vehiculosOptions]);

  // Al cambiar el vehículo (SOLO en alta): traemos la última movilización
  // del vehículo para alimentar la alerta de continuidad de creación.
  // En edición no se usa: tras registrar el dispensado pueden haberse hecho
  // muchas movilizaciones más, así que comparar contra "la última" no aplica.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setUltimaMov(null);
      return;
    }
    if (!vehiculo) {
      setUltimaMov(null);
      return;
    }
    let cancelled = false;
    setUltimaCargando(true);
    movilizacionService
      .lastByVehiculo(vehiculo.id)
      .then((res) => {
        if (!cancelled) setUltimaMov(res);
      })
      .catch(() => {
        if (!cancelled) setUltimaMov(null);
      })
      .finally(() => {
        if (!cancelled) setUltimaCargando(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editing, vehiculo]);

  const cantidadNum = parseDecimal(cantidadGalones);
  const precioNum = parseDecimal(precioGalon);
  const total =
    cantidadNum !== null && precioNum !== null && cantidadNum > 0
      ? cantidadNum * precioNum
      : null;

  // ---------------------------------------------------------------------------
  // Alertas de continuidad de kilometraje (no bloquean el submit).
  //  - Alta:    compara contra el `kilometrajeFinal` de la ÚLTIMA movilización
  //             del vehículo (o sea, asume que el dispensado se va a registrar
  //             "ahora" y debería continuar la última lectura).
  //  - Edición: compara contra las movilizaciones que rodean al dispensado
  //             (prev/next por fecha) — misma lógica que evalúa la tabla.
  // ---------------------------------------------------------------------------
  const kmNum = kilometraje === '' ? null : Number(kilometraje);

  const continuidadCreacionAlerta =
    !editing &&
    ultimaMov !== null &&
    kmNum !== null &&
    Number.isFinite(kmNum) &&
    kmNum !== ultimaMov.kilometrajeFinal;

  // En edición usamos la continuidad calculada por el backend. La re-evaluamos
  // contra el valor LIVE del input para que, si el usuario corrige el
  // kilometraje a uno consistente, la alerta desaparezca de inmediato.
  const continuidadEdicion = editing ? initial?.continuidad ?? null : null;
  const continuidadEdicionAlerta =
    continuidadEdicion !== null &&
    kmNum !== null &&
    Number.isFinite(kmNum) &&
    ((continuidadEdicion.prevKmFinal !== null &&
      continuidadEdicion.prevKmFinal !== kmNum) ||
      (continuidadEdicion.nextKmInicial !== null &&
        continuidadEdicion.nextKmInicial !== kmNum));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!vehiculo) {
      setError('Selecciona un vehículo');
      return;
    }

    const km = Number(kilometraje);
    if (!Number.isInteger(km) || km < 0) {
      setError('El kilometraje debe ser un número entero positivo');
      return;
    }

    if (cantidadNum === null || cantidadNum <= 0) {
      setError('La cantidad de galones debe ser mayor a 0');
      return;
    }
    if (precioNum === null || precioNum < 0) {
      setError('El precio por galón es inválido');
      return;
    }

    const obsTrim = observaciones.trim();
    if (obsTrim.length > 500) {
      setError('Las observaciones no pueden exceder 500 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateDispensadoDto | UpdateDispensadoDto = {
        fecha: fromLocalInput(fecha),
        kilometraje: km,
        cantidadGalones: cantidadNum,
        precioGalon: precioNum,
        vehiculoId: vehiculo.id,
        observaciones: obsTrim.length > 0 ? obsTrim : null,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const totalInputClass =
    'px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed font-mono';

  return (
    <Modal
      open={open}
      title={editing ? 'Editar dispensado' : 'Nuevo dispensado'}
      subtitle="Carga de combustible"
      size="lg"
      busy={submitting}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="dispensado-form"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70"
          >
            {submitting ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="dispensado-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Vehículo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Vehículo</label>
          <SearchableSelect<VehiculoDto>
            options={vehiculosOptions}
            value={vehiculo}
            onChange={setVehiculo}
            getKey={(v) => v.id}
            getLabel={(v) => v.nombre}
            getSubLabel={(v) =>
              v.activo
                ? v.clase.toUpperCase()
                : `${v.clase.toUpperCase()} · inactivo`
            }
            getSearchText={(v) => `${v.nombre} ${v.clase}`}
            isDisabled={(v) => !v.activo}
            placeholder="Buscar por clase o nombre..."
            emptyText="Sin vehículos"
            required
          />
        </div>

        {/* Kilometraje + fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Kilometraje
            </label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Fecha y hora
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Alerta informativa de continuidad — no bloquea el submit. */}
        {/*
          Alta: comparamos contra el kilometraje final de la última
          movilización registrada del vehículo.
        */}
        {!editing &&
          vehiculo &&
          !ultimaCargando &&
          continuidadCreacionAlerta &&
          ultimaMov && (
            <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm">
              <strong className="font-semibold">Aviso:</strong> el kilometraje
              final de la última movilización es{' '}
              <span className="font-mono font-semibold">
                {ultimaMov.kilometrajeFinal.toLocaleString('es-GT')}
              </span>{' '}
              ({formatFecha(ultimaMov.fecha)}) y debe ser igual al actual.
              Asegúrese de ingresar el kilometraje correcto o reporte el caso
              con logística.
            </div>
          )}

        {/*
          Edición: misma alerta que muestra la tabla. Compara contra las
          movilizaciones que rodean al dispensado (prev por fecha < disp,
          next por fecha > disp). Si alguno no coincide, mostramos detalle.
        */}
        {editing && continuidadEdicion && continuidadEdicionAlerta && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm space-y-1">
            <div>
              <strong className="font-semibold">Aviso:</strong> el kilometraje
              no coincide con las movilizaciones que rodean este dispensado.
              Asegúrese de ingresar el kilometraje correcto o reporte el caso
              con logística.
            </div>
            {continuidadEdicion.prevKmFinal !== null &&
              continuidadEdicion.prevKmFinal !== kmNum && (
                <div className="pl-3">
                  • Movilización anterior — km final{' '}
                  <span className="font-mono font-semibold">
                    {continuidadEdicion.prevKmFinal.toLocaleString('es-GT')}
                  </span>
                  {continuidadEdicion.prevFecha
                    ? ` (${formatFecha(continuidadEdicion.prevFecha)})`
                    : ''}
                </div>
              )}
            {continuidadEdicion.nextKmInicial !== null &&
              continuidadEdicion.nextKmInicial !== kmNum && (
                <div className="pl-3">
                  • Movilización siguiente — km inicial{' '}
                  <span className="font-mono font-semibold">
                    {continuidadEdicion.nextKmInicial.toLocaleString('es-GT')}
                  </span>
                  {continuidadEdicion.nextFecha
                    ? ` (${formatFecha(continuidadEdicion.nextFecha)})`
                    : ''}
                </div>
              )}
          </div>
        )}

        {/* Combustible */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Cantidad (galones)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={cantidadGalones}
              onChange={(e) => setCantidadGalones(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Precio por galón
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={precioGalon}
              onChange={(e) => setPrecioGalon(e.target.value)}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Total</label>
            <input
              type="text"
              value={total !== null ? `L ${formatLempiras(total)}` : ''}
              readOnly
              tabIndex={-1}
              placeholder="—"
              className={totalInputClass}
            />
          </div>
        </div>

        {/* Observaciones (opcional) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">
            Observaciones <span className="text-xs font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            maxLength={500}
            rows={3}
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder="Estación, comentarios, etc."
          />
          <span className="text-xs text-slate-500 self-end">
            {observaciones.length}/500
          </span>
        </div>
      </form>
    </Modal>
  );
};
