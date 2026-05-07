import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { ApiError } from '../../../shared/http/api-client';
import { vehiculoService } from '../../vehiculos/services/vehiculo.service';
import type { VehiculoDto } from '../../vehiculos/types/vehiculo.types';
import { DispensadoForm } from '../components/DispensadoForm';
import { dispensadoService } from '../services/dispensado.service';
import type {
  CreateDispensadoDto,
  DispensadoDto,
  UpdateDispensadoDto,
} from '../types/dispensado.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; dispensado: DispensadoDto };

const PAGE_SIZE = 20;

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const formatDecimal = (raw: string): string => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const calcularTotal = (cantidad: string, precio: string): number => {
  const c = Number(cantidad);
  const p = Number(precio);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return 0;
  return c * p;
};

/** "YYYY-MM-DD" del día actual en TZ local. */
const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "YYYY-MM-DD" hace `dias` días en TZ local. */
const hacePocosDiasISO = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const inicioDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toISOString();

const finDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T23:59:59.999`).toISOString();

export const DispensadosPage = () => {
  const confirm = useConfirm();

  const [dispensados, setDispensados] = useState<DispensadoDto[]>([]);
  const [total, setTotal] = useState(0);
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });

  // Filtros (defaults: última semana — hoy menos 6 días, ambos inclusive).
  const [desde, setDesde] = useState<string>(hacePocosDiasISO(6));
  const [hasta, setHasta] = useState<string>(hoyISO());
  const [vehiculoFiltro, setVehiculoFiltro] = useState<VehiculoDto | null>(null);
  const [page, setPage] = useState(1);

  // Tooltip flotante para observaciones.
  const [obsTooltip, setObsTooltip] = useState<{
    top: number;
    left: number;
    text: string;
  } | null>(null);

  const showObsTooltip = (
    e: React.MouseEvent<HTMLTableCellElement>,
    text: string,
  ) => {
    if (!text) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const TT_MAX_W = 360;
    let left = rect.left;
    if (left + TT_MAX_W > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - TT_MAX_W - 8);
    }
    setObsTooltip({ top: rect.bottom + 6, left, text });
  };

  const hideObsTooltip = () => setObsTooltip(null);

  // Catálogo de vehículos (una vez).
  useEffect(() => {
    let cancelled = false;
    vehiculoService
      .list()
      .then((vehs) => {
        if (!cancelled) setVehiculos(vehs);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Error al cargar vehículos',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listado: se recarga cuando cambian los filtros o la página.
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await dispensadoService.list({
        desde: desde ? inicioDelDiaISO(desde) : undefined,
        hasta: hasta ? finDelDiaISO(hasta) : undefined,
        vehiculoId: vehiculoFiltro?.id,
        page,
        pageSize: PAGE_SIZE,
      });
      setDispensados(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar dispensados',
      );
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, vehiculoFiltro, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cualquier cambio de filtro nos manda a la página 1.
  useEffect(() => {
    setPage(1);
  }, [desde, hasta, vehiculoFiltro]);

  const handleSubmit = async (
    data: CreateDispensadoDto | UpdateDispensadoDto,
  ) => {
    if (modo.tipo === 'crear') {
      await dispensadoService.create(data as CreateDispensadoDto);
    } else if (modo.tipo === 'editar') {
      await dispensadoService.update(modo.dispensado.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const eliminar = async (d: DispensadoDto) => {
    const ok = await confirm({
      title: 'Eliminar dispensado',
      message: `¿Eliminar el dispensado del ${formatFecha(d.fecha)}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await dispensadoService.remove(d.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar el dispensado';
      window.alert(msg);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desdeRegistro = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaRegistro = Math.min(page * PAGE_SIZE, total);

  const vehiculosFiltroOptions = useMemo(
    () => vehiculos.filter((v) => v.activo),
    [vehiculos],
  );

  const fechasInvalidas = desde && hasta && desde > hasta;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        title="Dispensados"
        subtitle="Carga de combustible"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Registro histórico de cargas de combustible.
          </p>
          <button
            type="button"
            onClick={() => setModo({ tipo: 'crear' })}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
          >
            + Nuevo dispensado
          </button>
        </div>

        {/* Barra de filtros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Desde</label>
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Hasta</label>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">
              Vehículo
            </label>
            <SearchableSelect<VehiculoDto>
              options={vehiculosFiltroOptions}
              value={vehiculoFiltro}
              onChange={setVehiculoFiltro}
              getKey={(v) => v.id}
              getLabel={(v) => v.nombre}
              getSubLabel={(v) => v.clase.toUpperCase()}
              getSearchText={(v) => `${v.nombre} ${v.clase}`}
              placeholder="Todos los vehículos"
              emptyText="Sin vehículos"
              clearable
            />
          </div>
          {fechasInvalidas && (
            <p className="md:col-span-4 text-xs text-amber-700">
              "Desde" no puede ser posterior a "Hasta".
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vehículo</th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Kilometraje"
                >
                  Km
                </th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Cantidad de galones"
                >
                  Gal.
                </th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Precio por galón"
                >
                  L/gal
                </th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Total"
                >
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Observaciones</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : dispensados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Sin registros para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                dispensados.map((d) => {
                  const totalQ = calcularTotal(d.cantidadGalones, d.precioGalon);
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
                        {formatFecha(d.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-semibold">
                          {d.usuario.nombre} {d.usuario.apellido}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {d.usuario.codigo_empleado}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-semibold">{d.vehiculo.nombre}</div>
                        <div className="text-xs font-mono uppercase text-slate-500">
                          {d.vehiculo.clase}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm text-right font-mono text-slate-800 whitespace-nowrap">
                        {d.kilometraje.toLocaleString('es-GT')}
                      </td>
                      <td className="px-2 py-3 text-sm text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatDecimal(d.cantidadGalones)}
                      </td>
                      <td className="px-2 py-3 text-sm text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatDecimal(d.precioGalon)}
                      </td>
                      <td className="px-2 py-3 text-sm text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        L {totalQ.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className={
                          'px-4 py-3 text-sm text-slate-700 max-w-[14rem] ' +
                          (d.observaciones ? 'cursor-help' : '')
                        }
                        onMouseEnter={(e) =>
                          d.observaciones && showObsTooltip(e, d.observaciones)
                        }
                        onMouseLeave={hideObsTooltip}
                      >
                        {d.observaciones ? (
                          <span className="block truncate">{d.observaciones}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {d.canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setModo({ tipo: 'editar', dispensado: d })}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(d)}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Footer paginador */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-600">
            <span>
              {total === 0
                ? 'Sin resultados'
                : `Mostrando ${desdeRegistro}–${hastaRegistro} de ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </main>

      <DispensadoForm
        open={modo.tipo !== 'oculto'}
        initial={modo.tipo === 'editar' ? modo.dispensado : null}
        vehiculos={vehiculos}
        onClose={() => setModo({ tipo: 'oculto' })}
        onSubmit={handleSubmit}
      />

      {obsTooltip &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: obsTooltip.top,
              left: obsTooltip.left,
              maxWidth: 360,
            }}
            className="z-50 px-3 py-2 text-xs leading-relaxed text-white bg-slate-900 rounded-lg shadow-xl whitespace-pre-line break-words pointer-events-none"
          >
            {obsTooltip.text}
          </div>,
          document.body,
        )}
    </div>
  );
};
