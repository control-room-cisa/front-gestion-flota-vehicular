import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../shared/auth/AuthContext';
import { AppHeader } from '../../../shared/components/AppHeader';
import { useConfirm } from '../../../shared/components/ConfirmProvider';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import { useToast } from '../../../shared/components/ToastProvider';
import { ApiError } from '../../../shared/http/api-client';
import {
  canExportMovilizaciones,
  isMovilizacionManager,
} from '../../../shared/types/roles.types';
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

/**
 * Sentinel para la opción "Todos los vehículos" dentro del filtro.
 * Usa `id = 0` (los ids reales del catálogo son siempre positivos),
 * de forma que se distingue trivialmente sin necesidad de un tipo
 * extendido. Cuando se selecciona, el filtro se considera vacío y
 * el backend recibe `vehiculoId = undefined`.
 */
const VEHICULO_FILTRO_TODOS: VehiculoDto = {
  id: 0,
  nombre: 'Todos los vehículos',
  clase: '',
  activo: true,
};

const esTodos = (v: VehiculoDto | null): boolean => v?.id === 0;

interface GapInfo {
  fromKm: number;
  toKm: number;
  vehiculo: { nombre: string; clase: string };
}

interface RowDecoration {
  /** El `kilometrajeInicial` cae dentro del rango de otra movilización
   *  del mismo vehículo. */
  overlapInicial: boolean;
  /** El `kilometrajeFinal` cae dentro del rango de otra movilización
   *  del mismo vehículo. */
  overlapFinal: boolean;
  /** Si está presente, se inserta un fila-fantasma de "gap" justo después
   *  del registro al que pertenece esta decoración. */
  gapAfter?: GapInfo;
}

const WarningIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M8.485 2.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 16H3.72a1.75 1.75 0 01-1.515-2.63L8.485 2.495zM10 7a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0110 7zm0 7.25a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

/** "YYYY/MM/DD HH:mm" en TZ local. Usado en la exportación a Excel. */
const formatFechaExcel = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
  const toast = useToast();
  const { usuario } = useAuth();
  const isManager = isMovilizacionManager(usuario?.roles);
  const puedeExportar = canExportMovilizaciones(usuario?.roles);

  const [movilizaciones, setMovilizaciones] = useState<MovilizacionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListadoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: 'oculto' });
  const [exportando, setExportando] = useState(false);

  // Filtros (defaults: hoy a hoy).
  const [desde, setDesde] = useState<string>(hoyISO());
  const [hasta, setHasta] = useState<string>(hoyISO());
  const [vehiculoFiltro, setVehiculoFiltro] = useState<VehiculoDto | null>(null);
  const [page, setPage] = useState(1);

  // Tooltip flotante para comentarios. Lo renderizamos vía portal en
  // `document.body` para no quedar atrapados por `overflow-hidden` del
  // contenedor de la tabla. Se activa al instante al entrar a la celda.
  const [commentTooltip, setCommentTooltip] = useState<{
    top: number;
    left: number;
    text: string;
  } | null>(null);

  const showCommentTooltip = (
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
    setCommentTooltip({ top: rect.bottom + 6, left, text });
  };

  const hideCommentTooltip = () => setCommentTooltip(null);

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
      const vehiculoIdFiltro =
        vehiculoFiltro && !esTodos(vehiculoFiltro) ? vehiculoFiltro.id : undefined;
      const res = await movilizacionService.list({
        desde: desde ? inicioDelDiaISO(desde) : undefined,
        hasta: hasta ? finDelDiaISO(hasta) : undefined,
        vehiculoId: vehiculoIdFiltro,
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

  // ---------------------------------------------------------------------------
  // Exportación a Excel. Pagina contra el backend hasta agotar el dataset
  // (respetando los filtros aplicados) y genera un archivo .xlsx con las
  // columnas definidas por el negocio.
  // ---------------------------------------------------------------------------
  const exportarExcel = async () => {
    if (exportando) return;
    if (!puedeExportar) {
      toast.error(
        'No tienes permisos para descargar el reporte de movilizaciones.',
        'Acceso denegado',
      );
      return;
    }
    if (desde && hasta && desde > hasta) {
      toast.warning(
        '"Desde" no puede ser posterior a "Hasta".',
        'Filtros inválidos',
      );
      return;
    }
    setExportando(true);
    setError(undefined);
    try {
      const EXPORT_PAGE_SIZE = 100;
      const vehiculoIdFiltro =
        vehiculoFiltro && !esTodos(vehiculoFiltro)
          ? vehiculoFiltro.id
          : undefined;
      const filtros = {
        desde: desde ? inicioDelDiaISO(desde) : undefined,
        hasta: hasta ? finDelDiaISO(hasta) : undefined,
        vehiculoId: vehiculoIdFiltro,
        pageSize: EXPORT_PAGE_SIZE,
      };

      const todos: MovilizacionDto[] = [];
      let paginaActual = 1;
      let totalRegistros = 0;
      do {
        const res = await movilizacionService.list({
          ...filtros,
          page: paginaActual,
        });
        todos.push(...res.items);
        totalRegistros = res.total;
        if (res.items.length === 0) break;
        paginaActual += 1;
      } while (todos.length < totalRegistros);

      if (todos.length === 0) {
        toast.info(
          'No hay movilizaciones para exportar con los filtros aplicados.',
          'Sin resultados',
        );
        return;
      }

      const filas = todos.map((m) => ({
        'Fecha y hora': formatFechaExcel(m.fecha),
        Vehículo: m.vehiculo.nombre,
        Usuario: `${m.usuario.nombre} ${m.usuario.apellido}`.trim(),
        Inicio: m.kilometrajeInicial,
        Fin: m.kilometrajeFinal,
        Recorrido: m.kilometrajeFinal - m.kilometrajeInicial,
        'Es viaje': m.esViaje ? 'Sí' : 'No',
        Empresas: m.empresas.map((e) => e.nombre).join(', '),
        Comentario: m.comentario,
      }));

      const ws = XLSX.utils.json_to_sheet(filas, {
        header: [
          'Fecha y hora',
          'Vehículo',
          'Usuario',
          'Inicio',
          'Fin',
          'Recorrido',
          'Es viaje',
          'Empresas',
          'Comentario',
        ],
      });

      // Anchos de columna aproximados para que el archivo se vea legible
      // al abrirlo sin tener que ajustar manualmente cada columna.
      ws['!cols'] = [
        { wch: 18 }, // Fecha y hora
        { wch: 24 }, // Vehículo
        { wch: 28 }, // Usuario
        { wch: 10 }, // Inicio
        { wch: 10 }, // Fin
        { wch: 12 }, // Recorrido
        { wch: 10 }, // Es viaje
        { wch: 40 }, // Empresas
        { wch: 50 }, // Comentario
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Movilizaciones');

      const sufijo =
        desde && hasta
          ? desde === hasta
            ? desde
            : `${desde}_a_${hasta}`
          : hoyISO();
      XLSX.writeFile(wb, `movilizaciones_${sufijo}.xlsx`);
      toast.success(
        `Se exportaron ${todos.length} movilizacion${todos.length === 1 ? '' : 'es'}.`,
        'Excel generado',
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error al exportar movilizaciones';
      toast.error(msg, 'No se pudo generar el Excel');
    } finally {
      setExportando(false);
    }
  };

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
      toast.success('Movilización eliminada.', 'Listo');
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar la movilización';
      toast.error(msg, 'Error al eliminar');
    }
  };

  // -------------------------------------------------------------------------
  // Paginado.
  // -------------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const desdeRegistro = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaRegistro = Math.min(page * PAGE_SIZE, total);

  // Opciones del filtro: el sentinel "Todos los vehículos" siempre va
  // al inicio para que se pueda elegir explícitamente desde el listado,
  // incluso después de haber seleccionado un vehículo individual.
  const vehiculosFiltroOptions = useMemo(
    () => [VEHICULO_FILTRO_TODOS, ...vehiculos.filter((v) => v.activo)],
    [vehiculos],
  );

  const fechasInvalidas = desde && hasta && desde > hasta;

  // ---------------------------------------------------------------------------
  // Decoraciones por fila: traslapes + gaps. Se calcula sobre el dataset
  // visible (página actual). Las gaps se anclan al registro de mayor `kmInicial`
  // de cada par para que, en orden `fecha desc`, queden visualmente entre las
  // dos filas relacionadas (cur arriba, prev abajo).
  // ---------------------------------------------------------------------------
  const decorations = useMemo<Map<number, RowDecoration>>(() => {
    const dec = new Map<number, RowDecoration>();
    const ensure = (id: number): RowDecoration => {
      let d = dec.get(id);
      if (!d) {
        d = { overlapInicial: false, overlapFinal: false };
        dec.set(id, d);
      }
      return d;
    };

    // Agrupa por vehículo: traslapes y gaps sólo aplican dentro del mismo.
    const groups = new Map<number, MovilizacionDto[]>();
    for (const m of movilizaciones) {
      const arr = groups.get(m.vehiculo.id) ?? [];
      arr.push(m);
      groups.set(m.vehiculo.id, arr);
    }

    // Recorrido único por vehículo en orden fecha ascendente. Para cada par
    // consecutivo (N = anterior, N+1 = siguiente):
    //   - N.kmFinal > (N+1).kmInicial  → traslape: marca esos dos valores.
    //   - N.kmFinal < (N+1).kmInicial  → hueco: fila fantasma anclada a N+1
    //                                    (en fecha desc N+1 aparece arriba,
    //                                    así la fila queda entre los dos).
    //   - Iguales                       → continuidad perfecta, sin alerta.
    for (const group of groups.values()) {
      const sorted = [...group].sort(
        (a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id,
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];

        if (prev.kilometrajeFinal > cur.kilometrajeInicial) {
          ensure(prev.id).overlapFinal = true;
          ensure(cur.id).overlapInicial = true;
        } else if (prev.kilometrajeFinal < cur.kilometrajeInicial) {
          ensure(cur.id).gapAfter = {
            fromKm: prev.kilometrajeFinal,
            toKm: cur.kilometrajeInicial,
            vehiculo: { nombre: cur.vehiculo.nombre, clase: cur.vehiculo.clase },
          };
        }
      }
    }

    return dec;
  }, [movilizaciones]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="Movilizaciones" subtitle="Ingreso de kilometrajes" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Registro histórico de kilometrajes movilizados.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {puedeExportar && (
              <button
                type="button"
                onClick={exportarExcel}
                disabled={exportando || loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3zM3.75 15a.75.75 0 01.75.75v.75c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-.75a.75.75 0 011.5 0v.75A1.75 1.75 0 0115.25 18H4.75A1.75 1.75 0 013 16.5v-.75A.75.75 0 013.75 15z"
                    clipRule="evenodd"
                  />
                </svg>
                {exportando ? 'Generando…' : 'Descargar Excel'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModo({ tipo: 'crear' })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nueva movilización
            </button>
          </div>
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
              value={vehiculoFiltro ?? VEHICULO_FILTRO_TODOS}
              onChange={(v) =>
                setVehiculoFiltro(v && !esTodos(v) ? v : null)
              }
              getKey={(v) => v.id}
              getLabel={(v) => v.nombre}
              getSubLabel={(v) =>
                esTodos(v) ? undefined : v.clase.toUpperCase()
              }
              getSearchText={(v) =>
                esTodos(v) ? 'todos los vehiculos' : `${v.nombre} ${v.clase}`
              }
              renderOption={(v, { active, selected }) => {
                if (esTodos(v)) {
                  return (
                    <span
                      className={
                        'flex items-center gap-2 font-semibold ' +
                        (active || selected
                          ? 'text-indigo-700'
                          : 'text-slate-700')
                      }
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4 text-indigo-500"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 5a2 2 0 012-2h10a2 2 0 012 2v2H3V5zm0 4h14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm3 3a1 1 0 100 2h2a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Todos los vehículos
                    </span>
                  );
                }
                return (
                  <>
                    <div className="font-medium truncate">{v.nombre}</div>
                    <div className="text-xs text-slate-500 truncate uppercase">
                      {v.clase}
                    </div>
                  </>
                );
              }}
              placeholder="Todos los vehículos"
              emptyText="Sin vehículos"
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
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Kilometraje inicial"
                >
                  Km ini
                </th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Kilometraje final"
                >
                  Km fin
                </th>
                <th
                  className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Kilómetros recorridos"
                >
                  Rec.
                </th>
                <th
                  className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                  title="Indica si es un viaje"
                >
                  Viaje
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Empresas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Comentario</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : movilizaciones.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Sin registros para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                movilizaciones.map((m) => {
                  const recorrido = m.kilometrajeFinal - m.kilometrajeInicial;
                  const deco = decorations.get(m.id);
                  const overlapInicial = deco?.overlapInicial ?? false;
                  const overlapFinal = deco?.overlapFinal ?? false;
                  const gap = deco?.gapAfter;
                  const overlapTooltip =
                    'Este kilometraje se traslapa con otra movilización del mismo vehículo';

                  const kmCellClass = (alert: boolean) =>
                    'px-2 py-3 text-sm text-right font-mono whitespace-nowrap ' +
                    (alert ? 'text-red-700' : 'text-slate-800');

                  return (
                    <Fragment key={m.id}>
                      <tr>
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
                        <td className={kmCellClass(overlapInicial)}>
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {overlapInicial && (
                              <span
                                className="text-red-600"
                                title={overlapTooltip}
                                aria-label={overlapTooltip}
                              >
                                <WarningIcon />
                              </span>
                            )}
                            <span>{m.kilometrajeInicial.toLocaleString('es-GT')}</span>
                          </span>
                        </td>
                        <td className={kmCellClass(overlapFinal)}>
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {overlapFinal && (
                              <span
                                className="text-red-600"
                                title={overlapTooltip}
                                aria-label={overlapTooltip}
                              >
                                <WarningIcon />
                              </span>
                            )}
                            <span>{m.kilometrajeFinal.toLocaleString('es-GT')}</span>
                          </span>
                        </td>
                        <td className="px-2 py-3 text-sm font-mono text-right text-indigo-700 font-semibold whitespace-nowrap">
                          {recorrido.toLocaleString('es-GT')}
                        </td>
                        <td className="px-2 py-3 text-sm text-center whitespace-nowrap">
                          {m.esViaje ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                              Sí
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-800">
                          <div className="flex flex-wrap gap-1">
                            {m.empresas.map((e) => (
                              <span
                                key={e.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                                title={e.codigo}
                              >
                                {e.nombre}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-700 max-w-[16rem] cursor-help"
                          onMouseEnter={(e) => showCommentTooltip(e, m.comentario)}
                          onMouseLeave={hideCommentTooltip}
                        >
                          <span className="block truncate">{m.comentario}</span>
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
                      {gap && (
                        <tr className="bg-red-50">
                          <td
                            colSpan={10}
                            className="px-4 py-2.5 text-sm text-red-700 border-l-4 border-l-red-400"
                          >
                            <div className="flex items-center justify-center gap-2 text-center">
                              <WarningIcon className="h-4 w-4 shrink-0" />
                              <span>
                                <strong>Sin registros</strong> — no se han
                                registrado kilometrajes entre{' '}
                                <span className="font-mono font-semibold">
                                  {gap.fromKm.toLocaleString('es-GT')}
                                </span>{' '}
                                y{' '}
                                <span className="font-mono font-semibold">
                                  {gap.toKm.toLocaleString('es-GT')}
                                </span>{' '}
                                para <strong>{gap.vehiculo.nombre}</strong>{' '}
                                <span className="font-mono uppercase opacity-70">
                                  ({gap.vehiculo.clase})
                                </span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

      {commentTooltip &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: commentTooltip.top,
              left: commentTooltip.left,
              maxWidth: 360,
            }}
            className="z-50 px-3 py-2 text-xs leading-relaxed text-white bg-slate-900 rounded-lg shadow-xl whitespace-pre-line break-words pointer-events-none"
          >
            {commentTooltip.text}
          </div>,
          document.body,
        )}
    </div>
  );
};
