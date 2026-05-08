import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppHeader } from '../../../shared/components/AppHeader';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { vehiculoService } from '../../vehiculos/services/vehiculo.service';
import type { VehiculoDto } from '../../vehiculos/types/vehiculo.types';
import { reportesService } from '../services/reportes.service';
import type {
  KilometrosDiariosDto,
  RendimientoCombustibleDto,
} from '../types/reportes.types';

const formatFechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

/** Convierte "YYYY-MM-DD" a "dd/MM" para etiquetas compactas. */
const formatYmdCorto = (ymd: string): string => {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
};

/**
 * Construye el data array para Recharts a partir de la respuesta de
 * rendimiento. Numeramos los dispensados (#1, #2, ...) para usarlos
 * como categoría del eje X y mantenemos toda la info en el tooltip.
 */
interface RendimientoRow {
  idx: string;
  fecha: string;
  kilometraje: number;
  galones: number;
  kmRecorridos: number | null;
  rendimiento: number | null;
}

const buildRendimientoData = (
  res: RendimientoCombustibleDto | null,
): RendimientoRow[] => {
  if (!res) return [];
  return res.puntos.map((p, i) => ({
    idx: `#${i + 1}`,
    fecha: formatFechaCorta(p.fecha),
    kilometraje: p.kilometraje,
    galones: Number(p.cantidadGalones),
    kmRecorridos: p.kmRecorridos,
    rendimiento: p.rendimiento,
  }));
};

interface KmRow {
  fechaCorta: string;
  fecha: string;
  km: number;
}

const buildKmDiariosData = (
  res: KilometrosDiariosDto | null,
): KmRow[] => {
  if (!res) return [];
  return res.puntos.map((p) => ({
    fechaCorta: formatYmdCorto(p.fecha),
    fecha: p.fecha,
    km: p.km,
  }));
};

const RendimientoTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RendimientoRow }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-md px-3 py-2 text-xs space-y-0.5">
      <div className="font-semibold text-slate-800">
        Dispensado {r.idx} · {r.fecha}
      </div>
      <div className="text-slate-600">
        Rendimiento:{' '}
        <span className="font-mono font-semibold text-indigo-700">
          {r.rendimiento !== null
            ? `${r.rendimiento.toLocaleString('es-GT')} km/gal`
            : '—'}
        </span>
      </div>
      <div className="text-slate-600">
        Km recorridos:{' '}
        <span className="font-mono">
          {r.kmRecorridos !== null ? r.kmRecorridos.toLocaleString('es-GT') : '—'}
        </span>
      </div>
      <div className="text-slate-600">
        Galones:{' '}
        <span className="font-mono">
          {r.galones.toLocaleString('es-GT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <div className="text-slate-500">
        Lectura: <span className="font-mono">{r.kilometraje.toLocaleString('es-GT')}</span> km
      </div>
    </div>
  );
};

const KmTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: KmRow }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-md px-3 py-2 text-xs space-y-0.5">
      <div className="font-semibold text-slate-800">{r.fecha}</div>
      <div className="text-slate-600">
        Km recorridos:{' '}
        <span className="font-mono font-semibold text-emerald-700">
          {r.km.toLocaleString('es-GT')}
        </span>
      </div>
    </div>
  );
};

export const ReportesPage = () => {
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [vehiculo, setVehiculo] = useState<VehiculoDto | null>(null);
  const [rendimiento, setRendimiento] =
    useState<RendimientoCombustibleDto | null>(null);
  const [kmDiarios, setKmDiarios] = useState<KilometrosDiariosDto | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [errorVehiculos, setErrorVehiculos] = useState<string>();

  // Catálogo de vehículos (una vez al montar).
  useEffect(() => {
    let cancelled = false;
    vehiculoService
      .list()
      .then((vehs) => {
        if (cancelled) return;
        setVehiculos(vehs);
        // Auto-selección del primero activo para que la página no aparezca vacía.
        const primero = vehs.find((v) => v.activo) ?? vehs[0] ?? null;
        setVehiculo(primero);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorVehiculos(
          err instanceof Error ? err.message : 'Error al cargar vehículos',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const vehiculosOptions = useMemo(
    () => vehiculos.filter((v) => v.activo || v.id === vehiculo?.id),
    [vehiculos, vehiculo],
  );

  // Cargamos ambos reportes cuando el vehículo cambia.
  useEffect(() => {
    if (!vehiculo) {
      setRendimiento(null);
      setKmDiarios(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    Promise.all([
      reportesService.rendimientoCombustible(vehiculo.id),
      reportesService.kilometrosDiarios({ vehiculoId: vehiculo.id }),
    ])
      .then(([rend, km]) => {
        if (cancelled) return;
        setRendimiento(rend);
        setKmDiarios(km);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar reportes');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehiculo]);

  const rendData = useMemo(
    () => buildRendimientoData(rendimiento),
    [rendimiento],
  );
  const kmData = useMemo(() => buildKmDiariosData(kmDiarios), [kmDiarios]);

  // Métricas resumen para mostrar arriba de las gráficas.
  const rendValido = rendData.filter((r) => r.rendimiento !== null);
  const promedioRendimiento =
    rendValido.length > 0
      ? rendValido.reduce((s, r) => s + (r.rendimiento ?? 0), 0) /
        rendValido.length
      : null;

  const totalKmMes = kmData.reduce((s, r) => s + r.km, 0);
  const promedioKmDia = kmData.length > 0 ? totalKmMes / kmData.length : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="Reportes" subtitle="Rendimiento y operación" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">
              Vehículo
            </label>
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
              placeholder="Seleccionar vehículo..."
              emptyText="Sin vehículos"
              required
            />
          </div>
          <div className="text-xs text-slate-500 self-end">
            Los reportes se calculan para el vehículo seleccionado.
          </div>
        </div>

        {errorVehiculos && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {errorVehiculos}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Rendimiento promedio
            </div>
            <div className="mt-1 text-2xl font-bold text-indigo-700 font-mono">
              {promedioRendimiento !== null
                ? `${promedioRendimiento.toLocaleString('es-GT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} km/gal`
                : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {rendValido.length} dispensado{rendValido.length === 1 ? '' : 's'}{' '}
              evaluados
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Km totales (últimos 30 días)
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono">
              {totalKmMes.toLocaleString('es-GT')}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {kmData.length} día{kmData.length === 1 ? '' : 's'} en el rango
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Promedio diario
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-800 font-mono">
              {promedioKmDia.toLocaleString('es-GT', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              km
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Últimos 30 días</div>
          </div>
        </div>

        {/* Gráfica 1: rendimiento por dispensado */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Rendimiento de combustible
              </h2>
              <p className="text-xs text-slate-500">
                km/galón estimado entre dispensados consecutivos.
              </p>
            </div>
            {!loading && rendValido.length === 0 && rendData.length > 0 && (
              <span className="text-xs text-amber-700">
                Se requiere al menos 2 dispensados para calcular rendimiento.
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
              Cargando...
            </div>
          ) : rendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
              Sin dispensados registrados para este vehículo.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rendData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="idx"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: 'Dispensado',
                      position: 'insideBottom',
                      offset: -2,
                      fontSize: 11,
                      fill: '#64748b',
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: 'km/gal',
                      angle: -90,
                      position: 'insideLeft',
                      fontSize: 11,
                      fill: '#64748b',
                    }}
                  />
                  <Tooltip content={<RendimientoTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={() => 'Rendimiento (km/gal)'}
                  />
                  <Line
                    type="monotone"
                    dataKey="rendimiento"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#4f46e5' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Gráfica 2: km diarios último mes */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Kilómetros diarios — últimos 30 días
              </h2>
              <p className="text-xs text-slate-500">
                Suma de km recorridos por movilizaciones, agrupados por día.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
              Cargando...
            </div>
          ) : kmData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
              Sin datos para mostrar.
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kmData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="fechaCorta"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: 'km',
                      angle: -90,
                      position: 'insideLeft',
                      fontSize: 11,
                      fill: '#64748b',
                    }}
                  />
                  <Tooltip content={<KmTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={() => 'Km recorridos por día'}
                  />
                  <Bar
                    dataKey="km"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
