import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/auth/AuthContext';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { ApiError } from '../../../shared/http/api-client';
import { isMovilizacionManager } from '../../../shared/types/roles.types';
import { empresaService } from '../../empresas/services/empresa.service';
import type { EmpresaDto } from '../../empresas/types/empresa.types';
import { usuariosService } from '../../usuarios/services/usuario.service';
import type { UsuarioListadoDto } from '../../usuarios/types/usuario.types';
import { vehiculoService } from '../../vehiculos/services/vehiculo.service';
import type { VehiculoDto } from '../../vehiculos/types/vehiculo.types';
import { MovilizacionForm } from '../components/MovilizacionForm';
import { movilizacionService } from '../services/movilizacion.service';
import type {
  CreateMovilizacionDto,
  MovilizacionDto,
  UpdateMovilizacionDto,
} from '../types/movilizacion.types';

type Modo =
  | { tipo: 'oculto' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; movilizacion: MovilizacionDto };

const PAGE_SIZE = 20;

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

/** "YYYY-MM-DD" del día de hoy en TZ local. */
const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Inicio (00:00:00.000) del día YYYY-MM-DD en TZ local, como ISO. */
const inicioDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toISOString();

/** Fin (23:59:59.999) del día YYYY-MM-DD en TZ local, como ISO. */
const finDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T23:59:59.999`).toISOString();

export const MovilizacionesPage = () => {
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const isManager = isMovilizacionManager(usuario?.roles);

  const [movilizaciones, setMovilizaciones] = useState<MovilizacionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListadoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });

  // Filtros (defaults: hoy a hoy).
  const [desde, setDesde] = useState<string>(hoyISO());
  const [hasta, setHasta] = useState<string>(hoyISO());
  const [vehiculoFiltro, setVehiculoFiltro] = useState<VehiculoDto | null>(null);
  const [page, setPage] = useState(1);

  // -------------------------------------------------------------------------
  // Catálogos: se cargan una vez al montar (no dependen de filtros).
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      empresaService.list(),
      vehiculoService.list(),
      isManager
        ? usuariosService.list()
        : Promise.resolve<UsuarioListadoDto[]>([]),
    ])
      .then(([emps, vehs, usrs]) => {
        if (cancelled) return;
        setEmpresas(emps);
        setVehiculos(vehs);
        setUsuarios(usrs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar catálogos');
      });
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  // -------------------------------------------------------------------------
  // Listado: se recarga cuando cambian los filtros o la página. El filtro
  // se manda al backend; el frontend nunca filtra el dataset por su cuenta.
  // -------------------------------------------------------------------------
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await movilizacionService.list({
        desde: desde ? inicioDelDiaISO(desde) : undefined,
        hasta: hasta ? finDelDiaISO(hasta) : undefined,
        vehiculoId: vehiculoFiltro?.id,
        page,
        pageSize: PAGE_SIZE,
      });
      setMovilizaciones(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar movilizaciones',
      );
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, vehiculoFiltro, page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cualquier cambio de filtro debe regresarnos a la página 1 para no quedar
  // en una página fuera de rango.
  useEffect(() => {
    setPage(1);
  }, [desde, hasta, vehiculoFiltro]);

  const handleSubmit = async (
    data: CreateMovilizacionDto | UpdateMovilizacionDto,
  ) => {
    if (modo.tipo === 'crear') {
      await movilizacionService.create(data as CreateMovilizacionDto);
    } else if (modo.tipo === 'editar') {
      await movilizacionService.update(modo.movilizacion.id, data);
    }
    setModo({ tipo: 'oculto' });
    await cargar();
  };

  const eliminar = async (m: MovilizacionDto) => {
    const ok = await confirm({
      title: 'Eliminar movilización',
      message: `¿Eliminar la movilización del ${formatFecha(m.fecha)}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await movilizacionService.remove(m.id);
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar la movilización';
      window.alert(msg);
    }
  };

  // -------------------------------------------------------------------------
  // Paginado.
  // -------------------------------------------------------------------------
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
      <AppHeader title="Movilizaciones" subtitle="Ingreso de kilometrajes" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Registro histórico de kilometrajes movilizados.
          </p>
          <button
            type="button"
            onClick={() => setModo({ tipo: 'crear' })}
            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
          >
            + Nueva movilización
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

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Vehículo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Km inicial</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Km final</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Recorrido</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Empresas</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : movilizaciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Sin registros para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                movilizaciones.map((m) => {
                  const recorrido = m.kilometrajeFinal - m.kilometrajeInicial;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
                        {formatFecha(m.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-semibold">
                          {m.usuario.nombre} {m.usuario.apellido}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {m.usuario.codigo_empleado}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="font-semibold">{m.vehiculo.nombre}</div>
                        <div className="text-xs font-mono uppercase text-slate-500">
                          {m.vehiculo.clase}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 text-right font-mono">
                        {m.kilometrajeInicial.toLocaleString('es-GT')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800 text-right font-mono">
                        {m.kilometrajeFinal.toLocaleString('es-GT')}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-indigo-700 font-semibold">
                        {recorrido.toLocaleString('es-GT')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        <div className="flex flex-wrap gap-1">
                          {m.empresas.map((e) => (
                            <span
                              key={e.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700"
                              title={e.nombre}
                            >
                              {e.codigo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {m.canManage ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setModo({ tipo: 'editar', movilizacion: m })}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminar(m)}
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

      <MovilizacionForm
        open={modo.tipo !== 'oculto'}
        initial={modo.tipo === 'editar' ? modo.movilizacion : null}
        empresas={empresas}
        vehiculos={vehiculos}
        usuarios={usuarios}
        onClose={() => setModo({ tipo: 'oculto' })}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
