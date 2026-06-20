import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useConfirm } from "../../../shared/components/ConfirmProvider";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { useToast } from "../../../shared/components/ToastProvider";
import { ApiError } from "../../../shared/http/api-client";
import {
  canExportMovilizaciones,
  isMovilizacionManager,
} from "../../../shared/types/roles.types";
import { empresaService } from "../../empresas/services/empresa.service";
import type { EmpresaDto } from "../../empresas/types/empresa.types";
import { usuariosService } from "../../usuarios/services/usuario.service";
import type { UsuarioListadoDto } from "../../usuarios/types/usuario.types";
import { unidadService } from "../../unidades/services/unidad.service";
import { CATEGORIA_CODIGO_VEHICULOS_LIVIANOS } from "../../categorias/types/categoria.types";
import type { UnidadDto } from "../../unidades/types/unidad.types";
import { MovilizacionDetalleModal } from "../components/MovilizacionDetalleModal";
import { MovilizacionForm } from "../components/MovilizacionForm";
import { movilizacionService } from "../services/movilizacion.service";
import type {
  CreateMovilizacionDto,
  MovilizacionDto,
  UpdateMovilizacionDto,
} from "../types/movilizacion.types";
import {
  buildGroupedTableRows,
  type MovilizacionGroupBy,
} from "../utils/movilizacion-table.utils";

type Modo =
  | { tipo: "oculto" }
  | { tipo: "crear" }
  | { tipo: "editar"; movilizacion: MovilizacionDto };

const PAGE_SIZE = 20;

/**
 * Sentinel para la opción "Todos los vehículos" dentro del filtro.
 * Usa `id = 0` (los ids reales del catálogo son siempre positivos),
 * de forma que se distingue trivialmente sin necesidad de un tipo
 * extendido. Cuando se selecciona, el filtro se considera vacío y
 * el backend recibe `unidadId = undefined`.
 */
const UNIDAD_FILTRO_TODOS = {
  id: 0,
  nombre: "Todas las unidades",
  clase: "",
  activo: true,
} as UnidadDto;

const esTodos = (v: UnidadDto | null): boolean => v?.id === 0;

const USUARIO_FILTRO_TODOS: UsuarioListadoDto = {
  id: 0,
  codigo_empleado: "",
  nombre: "Todos los usuarios",
  apellido: "",
  empresa: null,
};

const esTodosUsuario = (u: UsuarioListadoDto | null): boolean => u?.id === 0;

interface GapInfo {
  fromKm: number;
  toKm: number;
  unidad: { nombre: string; clase: string };
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

const WarningIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M8.485 2.495a1.75 1.75 0 013.03 0l6.28 10.875A1.75 1.75 0 0116.28 16H3.72a1.75 1.75 0 01-1.515-2.63L8.485 2.495zM10 7a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 0110 7zm0 7.25a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

/** Fecha y hora en dos líneas (como la celda de usuario). */
const formatFechaPartes = (iso: string): { fecha: string; hora: string } => {
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString("es-HN", { dateStyle: "short" }),
    hora: d.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

/** Columnas visibles solo desde `lg` (1024px) en adelante. Entre md y lg la tabla usa layout compacto. */
const COL_LG = "hidden lg:table-cell";

/** Sin `display`: evita que `inline-flex` pise `hidden` en breakpoints responsivos. */
const iconBtnClass =
  "items-center justify-center p-2 rounded-lg border transition-colors shrink-0 disabled:opacity-50";

const menuDotsBtnClass =
  "inline-flex items-center justify-center p-1 text-slate-500 hover:text-slate-800 rounded transition-colors";

/** Heroicons v2 mini (20×20, solid) — mismos trazos que el resto de la app. */
const EyeIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path
      fillRule="evenodd"
      d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.256 0 7.668 2.733 9.336 6.41a1.651 1.651 0 0 1 0 1.186A10.003 10.003 0 0 1 10 17c-4.257 0-7.669-2.733-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
      clipRule="evenodd"
    />
  </svg>
);

const PencilIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path d="m2.695 14.295 1.17-3.505a1 1 0 0 1 .26-.365l8.086-8.086a2.121 2.121 0 1 1 3 3l-8.086 8.086a1 1 0 0 1-.365.26l-3.505 1.17 1.17-1.17ZM12.22 4.22l1.56 1.56-1.06 1.06-1.56-1.56 1.06-1.06Z" />
  </svg>
);

const TrashIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M8.75 2A2.75 2.75 0 0 0 6 4.75v.5H3.75a.75.75 0 0 0 0 1.5h.386l.77 9.256a2.25 2.25 0 0 0 2.238 2.044h6.692a2.25 2.25 0 0 0 2.238-2.044l.77-9.256h.386a.75.75 0 0 0 0-1.5H14v-.5A2.75 2.75 0 0 0 11.25 2h-2.5Zm-1.5 1.5v-.5h5.5v.5H7.25Zm-.886 2.25h7.272l-.729 8.756a.75.75 0 0 1-.746.694H7.61a.75.75 0 0 1-.746-.694l-.729-8.756Z"
      clipRule="evenodd"
    />
  </svg>
);

const EllipsisVerticalIcon = ({
  className = "h-4 w-4",
}: {
  className?: string;
}) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path d="M10 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm0 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
  </svg>
);

const menuItemClass =
  "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50";

/** "YYYY/MM/DD HH:mm" en TZ local. Usado en la exportación a Excel. */
const formatFechaExcel = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "YYYY-MM-DD" del día de hoy en TZ local. */
const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
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
  const [unidades, setUnidades] = useState<UnidadDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListadoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [modo, setModo] = useState<Modo>({ tipo: "oculto" });
  const [detalle, setDetalle] = useState<MovilizacionDto | null>(null);
  const [exportando, setExportando] = useState(false);
  /** Menú ⋮ en pantallas &lt; sm (portal fijo para no recortar por overflow de la tabla). */
  const [menuAcciones, setMenuAcciones] = useState<{
    mov: MovilizacionDto;
    top: number;
    right: number;
  } | null>(null);

  // Filtros (defaults: hoy a hoy).
  const [desde, setDesde] = useState<string>(hoyISO());
  const [hasta, setHasta] = useState<string>(hoyISO());
  const [unidadFiltro, setunidadFiltro] = useState<UnidadDto | null>(null);
  const [usuarioFiltro, setUsuarioFiltro] = useState<UsuarioListadoDto | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState<MovilizacionGroupBy>("none");
  const [soloMisMovilizaciones, setSoloMisMovilizaciones] = useState(false);

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

  const toggleMenuAcciones = (
    e: React.MouseEvent<HTMLButtonElement>,
    mov: MovilizacionDto,
  ) => {
    e.stopPropagation();
    if (menuAcciones?.mov.id === mov.id) {
      setMenuAcciones(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuAcciones({
      mov,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  const cerrarMenuAcciones = () => setMenuAcciones(null);

  useEffect(() => {
    if (!menuAcciones) return;
    const onScroll = () => setMenuAcciones(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [menuAcciones]);

  // -------------------------------------------------------------------------
  // Catálogos: se cargan una vez al montar (no dependen de filtros).
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      empresaService.list(),
      unidadService.list({
        categoriaCodigo: CATEGORIA_CODIGO_VEHICULOS_LIVIANOS,
      }),
      isManager
        ? usuariosService.list()
        : Promise.resolve<UsuarioListadoDto[]>([]),
    ])
      .then(([emps, vehs, usrs]) => {
        if (cancelled) return;
        setEmpresas(emps);
        setUnidades(vehs);
        setUsuarios(usrs);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Error al cargar catálogos",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  const listQueryBase = useCallback(() => {
    const unidadIdFiltro =
      unidadFiltro && !esTodos(unidadFiltro) ? unidadFiltro.id : undefined;
    let userIdFiltro: number | undefined;
    if (isManager && usuarioFiltro && !esTodosUsuario(usuarioFiltro)) {
      userIdFiltro = usuarioFiltro.id;
    } else if (!isManager && soloMisMovilizaciones && usuario?.id) {
      userIdFiltro = usuario.id;
    }
    return {
      desde: desde ? inicioDelDiaISO(desde) : undefined,
      hasta: hasta ? finDelDiaISO(hasta) : undefined,
      unidadId: unidadIdFiltro,
      userId: userIdFiltro,
    };
  }, [
    desde,
    hasta,
    unidadFiltro,
    usuarioFiltro,
    isManager,
    soloMisMovilizaciones,
    usuario?.id,
  ]);

  // -------------------------------------------------------------------------
  // Listado: se recarga cuando cambian los filtros o la página. El filtro
  // se manda al backend; el frontend nunca filtra el dataset por su cuenta.
  // -------------------------------------------------------------------------
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const base = listQueryBase();
      if (isManager && groupBy !== "none") {
        const FETCH_SIZE = 100;
        const todos: MovilizacionDto[] = [];
        let pagina = 1;
        let totalReg = 0;
        do {
          const res = await movilizacionService.list({
            ...base,
            page: pagina,
            pageSize: FETCH_SIZE,
          });
          todos.push(...res.items);
          totalReg = res.total;
          if (res.items.length === 0) break;
          pagina += 1;
        } while (todos.length < totalReg);
        setMovilizaciones(todos);
        setTotal(totalReg);
      } else {
        const res = await movilizacionService.list({
          ...base,
          page,
          pageSize: PAGE_SIZE,
        });
        setMovilizaciones(res.items);
        setTotal(res.total);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar movilizaciones",
      );
    } finally {
      setLoading(false);
    }
  }, [listQueryBase, page, groupBy, isManager]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Cualquier cambio de filtro debe regresarnos a la página 1 para no quedar
  // en una página fuera de rango.
  useEffect(() => {
    setPage(1);
  }, [
    desde,
    hasta,
    unidadFiltro,
    usuarioFiltro,
    groupBy,
    soloMisMovilizaciones,
  ]);

  useEffect(() => {
    if (!isManager && groupBy !== "none") {
      setGroupBy("none");
    }
  }, [isManager, groupBy]);

  // ---------------------------------------------------------------------------
  // Exportación a Excel. Pagina contra el backend hasta agotar el dataset
  // (respetando los filtros aplicados) y genera un archivo .xlsx con las
  // columnas definidas por el negocio.
  // ---------------------------------------------------------------------------
  const exportarExcel = async () => {
    if (exportando) return;
    if (!puedeExportar) {
      toast.error(
        "No tienes permisos para descargar el reporte de movilizaciones.",
        "Acceso denegado",
      );
      return;
    }
    if (desde && hasta && desde > hasta) {
      toast.warning(
        '"Desde" no puede ser posterior a "Hasta".',
        "Filtros inválidos",
      );
      return;
    }
    setExportando(true);
    setError(undefined);
    try {
      const EXPORT_PAGE_SIZE = 100;
      const filtros = {
        ...listQueryBase(),
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
          "No hay movilizaciones para exportar con los filtros aplicados.",
          "Sin resultados",
        );
        return;
      }

      const filas = todos.map((m) => ({
        "Fecha y hora": formatFechaExcel(m.fecha),
        Vehículo: m.unidad.nombre,
        Usuario: `${m.usuario.nombre} ${m.usuario.apellido}`.trim(),
        Inicio: m.kilometrajeInicial,
        Fin: m.kilometrajeFinal,
        Recorrido: m.kilometrajeFinal - m.kilometrajeInicial,
        "Es viaje": m.esViaje ? "Sí" : "No",
        Empresas: m.empresas.map((e) => e.nombre).join(", "),
        Comentario: m.comentario,
      }));

      const ws = XLSX.utils.json_to_sheet(filas, {
        header: [
          "Fecha y hora",
          "Vehículo",
          "Usuario",
          "Inicio",
          "Fin",
          "Recorrido",
          "Es viaje",
          "Empresas",
          "Comentario",
        ],
      });

      // Anchos de columna aproximados para que el archivo se vea legible
      // al abrirlo sin tener que ajustar manualmente cada columna.
      ws["!cols"] = [
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
      XLSX.utils.book_append_sheet(wb, ws, "Movilizaciones");

      const sufijo =
        desde && hasta
          ? desde === hasta
            ? desde
            : `${desde}_a_${hasta}`
          : hoyISO();
      XLSX.writeFile(wb, `movilizaciones_${sufijo}.xlsx`);
      toast.success(
        `Se exportaron ${todos.length} movilizacion${todos.length === 1 ? "" : "es"}.`,
        "Excel generado",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al exportar movilizaciones";
      toast.error(msg, "No se pudo generar el Excel");
    } finally {
      setExportando(false);
    }
  };

  const handleSubmit = async (
    data: CreateMovilizacionDto | UpdateMovilizacionDto,
  ) => {
    if (modo.tipo === "crear") {
      await movilizacionService.create(data as CreateMovilizacionDto);
    } else if (modo.tipo === "editar") {
      await movilizacionService.update(modo.movilizacion.id, data);
    }
    setModo({ tipo: "oculto" });
    await cargar();
  };

  const eliminar = async (m: MovilizacionDto) => {
    const ok = await confirm({
      title: "Eliminar movilización",
      message: `¿Eliminar la movilización del ${formatFecha(m.fecha)}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await movilizacionService.remove(m.id);
      toast.success("Movilización eliminada.", "Listo");
      await cargar();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la movilización";
      toast.error(msg, "Error al eliminar");
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
  const unidadesFiltroOptions = useMemo(
    () => [UNIDAD_FILTRO_TODOS, ...unidades.filter((v) => v.activo)],
    [unidades],
  );

  const usuariosFiltroOptions = useMemo(() => {
    const sorted = [...usuarios].sort((a, b) =>
      `${a.nombre} ${a.apellido}`.localeCompare(
        `${b.nombre} ${b.apellido}`,
        "es",
      ),
    );
    return [USUARIO_FILTRO_TODOS, ...sorted];
  }, [usuarios]);

  const fechasInvalidas = desde && hasta && desde > hasta;
  const estaAgrupado = isManager && groupBy !== "none";

  const tableRows = useMemo(
    () => buildGroupedTableRows(movilizaciones, groupBy),
    [movilizaciones, groupBy],
  );

  const filasVisibles = useMemo(
    () => tableRows.filter((r) => r.kind === "mov").length,
    [tableRows],
  );

  // ---------------------------------------------------------------------------
  // Decoraciones por fila: traslapes + gaps (solo sin agrupar o por vehículo).
  // ---------------------------------------------------------------------------
  const decorations = useMemo<Map<number, RowDecoration>>(() => {
    if (groupBy === "usuario" || groupBy === "empresa") {
      return new Map();
    }
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
      const arr = groups.get(m.unidad.id) ?? [];
      arr.push(m);
      groups.set(m.unidad.id, arr);
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
            unidad: { nombre: cur.unidad.nombre, clase: cur.unidad.clase },
          };
        }
      }
    }

    return dec;
  }, [movilizaciones, groupBy]);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 min-w-0">
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
                {exportando ? "Generando…" : "Descargar Excel"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModo({ tipo: "crear" })}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500"
            >
              + Nueva movilización
            </button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div
          className={
            "bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end " +
            (isManager ? "lg:grid-cols-4" : "lg:grid-cols-3")
          }
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {isManager && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">
                Usuario
              </label>
              <SearchableSelect<UsuarioListadoDto>
                options={usuariosFiltroOptions}
                value={usuarioFiltro ?? USUARIO_FILTRO_TODOS}
                onChange={(u) =>
                  setUsuarioFiltro(u && !esTodosUsuario(u) ? u : null)
                }
                getKey={(u) => u.id}
                getLabel={(u) =>
                  esTodosUsuario(u)
                    ? u.nombre
                    : `${u.nombre} ${u.apellido}`.trim()
                }
                getSubLabel={(u) =>
                  esTodosUsuario(u) ? undefined : u.codigo_empleado
                }
                getSearchText={(u) =>
                  esTodosUsuario(u)
                    ? "todos los usuarios"
                    : `${u.nombre} ${u.apellido} ${u.codigo_empleado}`
                }
                renderOption={(u, { active, selected }) => {
                  if (esTodosUsuario(u)) {
                    return (
                      <span
                        className={
                          "flex items-center gap-2 font-semibold " +
                          (active || selected
                            ? "text-indigo-700"
                            : "text-slate-700")
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
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Todos los usuarios
                      </span>
                    );
                  }
                  return (
                    <>
                      <div className="font-medium truncate">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate">
                        {u.codigo_empleado}
                      </div>
                    </>
                  );
                }}
                placeholder="Todos los usuarios"
                emptyText="Sin usuarios"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">
              Vehículo
            </label>
            <SearchableSelect<UnidadDto>
              options={unidadesFiltroOptions}
              value={unidadFiltro ?? UNIDAD_FILTRO_TODOS}
              onChange={(v) => setunidadFiltro(v && !esTodos(v) ? v : null)}
              getKey={(v) => v.id}
              getLabel={(v) => v.nombre}
              getSubLabel={(v) =>
                esTodos(v) ? undefined : v.clase.toUpperCase()
              }
              getSearchText={(v) =>
                esTodos(v) ? "todos los unidades" : `${v.nombre} ${v.clase}`
              }
              renderOption={(v, { active, selected }) => {
                if (esTodos(v)) {
                  return (
                    <span
                      className={
                        "flex items-center gap-2 font-semibold " +
                        (active || selected
                          ? "text-indigo-700"
                          : "text-slate-700")
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
          {!isManager && (
            <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 min-h-[2.5rem]">
              <input
                id="solo-mis-movilizaciones"
                type="checkbox"
                checked={soloMisMovilizaciones}
                onChange={(e) => setSoloMisMovilizaciones(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="solo-mis-movilizaciones"
                className="text-sm text-slate-700 select-none cursor-pointer"
              >
                Ver solo mis movilizaciones
              </label>
            </div>
          )}
          {isManager && (
            <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1 pt-3 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-600">
                Agrupar por
              </label>
              <select
                value={groupBy}
                onChange={(e) =>
                  setGroupBy(e.target.value as MovilizacionGroupBy)
                }
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none max-w-md"
              >
                <option value="none">Sin agrupar</option>
                <option value="usuario">Usuario</option>
                <option value="unidad">Vehículo</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>
          )}
          {fechasInvalidas && (
            <p
              className={
                "sm:col-span-2 text-xs text-amber-700 " +
                (isManager ? "lg:col-span-4" : "lg:col-span-3")
              }
            >
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
          <div className="overflow-x-auto lg:overflow-visible overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Fecha
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                  >
                    Usuario
                  </th>
                  <th className="px-3 lg:px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Vehículo
                  </th>
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
                    className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap ${COL_LG}`}
                    title="Indica si es un viaje"
                  >
                    Viaje
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                  >
                    Empresas
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                  >
                    Comentario
                  </th>
                  <th
                    scope="col"
                    aria-label="Acciones"
                    className="w-9 max-w-9 px-0.5 py-3 text-right sm:w-auto sm:max-w-none sm:px-2 lg:px-4"
                  >
                    <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Acciones
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : movilizaciones.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Sin registros para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => {
                    if (row.kind === "group") {
                      return (
                        <tr
                          key={`group-${row.id}`}
                          className="bg-indigo-50/80 border-y border-indigo-100"
                        >
                          <td
                            colSpan={10}
                            className="px-4 py-2.5 text-sm font-semibold text-indigo-900"
                          >
                            {row.label}
                            <span className="ml-2 font-normal text-indigo-600">
                              ({row.count}{" "}
                              {row.count === 1 ? "registro" : "registros"})
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    const m = row.mov;
                    const recorrido = m.kilometrajeFinal - m.kilometrajeInicial;
                    const deco = decorations.get(m.id);
                    const overlapInicial = deco?.overlapInicial ?? false;
                    const overlapFinal = deco?.overlapFinal ?? false;
                    const gap = deco?.gapAfter;
                    const overlapTooltip =
                      "Este kilometraje se traslapa con otra movilización del mismo vehículo";

                    const kmCellClass = (alert: boolean) =>
                      "px-2 py-3 text-sm text-right font-mono whitespace-nowrap " +
                      (alert ? "text-red-700" : "text-slate-800");

                    const { fecha: fechaTxt, hora: horaTxt } =
                      formatFechaPartes(m.fecha);

                    return (
                      <Fragment key={row.rowKey}>
                        <tr>
                          <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                            <div className="font-semibold whitespace-nowrap">
                              {fechaTxt}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap">
                              {horaTxt}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-slate-800 ${COL_LG}`}
                          >
                            <div className="font-semibold">
                              {m.usuario.nombre} {m.usuario.apellido}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {m.usuario.codigo_empleado}
                            </div>
                          </td>
                          <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                            <div className="font-semibold">
                              {m.unidad.nombre}
                            </div>
                            <div className="text-xs font-mono uppercase text-slate-500">
                              {m.unidad.clase}
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
                              <span>
                                {m.kilometrajeInicial.toLocaleString("es-HN")}
                              </span>
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
                              <span>
                                {m.kilometrajeFinal.toLocaleString("es-HN")}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-3 text-sm font-mono text-right text-indigo-700 font-semibold whitespace-nowrap">
                            {recorrido.toLocaleString("es-HN")}
                          </td>
                          <td
                            className={`px-2 py-3 text-sm text-center whitespace-nowrap ${COL_LG}`}
                          >
                            {m.esViaje ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                                Sí
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-slate-800 ${COL_LG}`}
                          >
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
                            className={`px-4 py-3 text-sm text-slate-700 max-w-[16rem] cursor-help ${COL_LG}`}
                            onMouseEnter={(e) =>
                              showCommentTooltip(e, m.comentario)
                            }
                            onMouseLeave={hideCommentTooltip}
                          >
                            <span className="block truncate">
                              {m.comentario}
                            </span>
                          </td>
                          <td className="w-9 max-w-9 px-0.5 py-3 text-right whitespace-nowrap sm:w-auto sm:max-w-none sm:px-2 lg:px-4">
                            <div className="inline-flex items-center justify-end">
                              {/* &lt; sm: solo ⋮ */}
                              <div className="flex sm:hidden">
                                <button
                                  type="button"
                                  title="Más acciones"
                                  aria-label="Más acciones"
                                  aria-haspopup="menu"
                                  aria-expanded={menuAcciones?.mov.id === m.id}
                                  onClick={(e) => toggleMenuAcciones(e, m)}
                                  className={menuDotsBtnClass}
                                >
                                  <EllipsisVerticalIcon />
                                </button>
                              </div>
                              {/* sm–lg: iconos (sin ⋮) */}
                              <div className="hidden sm:flex lg:hidden items-center gap-1">
                                <button
                                  type="button"
                                  title="Ver detalle"
                                  aria-label="Ver detalle"
                                  onClick={() => setDetalle(m)}
                                  className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                                >
                                  <EyeIcon />
                                </button>
                                {m.canManage && (
                                  <>
                                    <button
                                      type="button"
                                      title="Editar"
                                      aria-label="Editar"
                                      onClick={() =>
                                        setModo({
                                          tipo: "editar",
                                          movilizacion: m,
                                        })
                                      }
                                      className={`${iconBtnClass} inline-flex border-slate-200 text-slate-600 hover:bg-slate-50`}
                                    >
                                      <PencilIcon />
                                    </button>
                                    <button
                                      type="button"
                                      title="Eliminar"
                                      aria-label="Eliminar"
                                      onClick={() => eliminar(m)}
                                      className={`${iconBtnClass} inline-flex border-red-200 text-red-600 hover:bg-red-50`}
                                    >
                                      <TrashIcon />
                                    </button>
                                  </>
                                )}
                              </div>
                              {/* lg+: botones texto (sin ⋮ ni iconos) */}
                              <div className="hidden lg:flex items-center gap-2">
                                {m.canManage ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setModo({
                                          tipo: "editar",
                                          movilizacion: m,
                                        })
                                      }
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
                                  <span className="text-xs text-slate-400">
                                    —
                                  </span>
                                )}
                              </div>
                            </div>
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
                                  registrado kilometrajes entre{" "}
                                  <span className="font-mono font-semibold">
                                    {gap.fromKm.toLocaleString("es-HN")}
                                  </span>{" "}
                                  y{" "}
                                  <span className="font-mono font-semibold">
                                    {gap.toKm.toLocaleString("es-HN")}
                                  </span>{" "}
                                  para <strong>{gap.unidad.nombre}</strong>{" "}
                                  <span className="font-mono uppercase opacity-70">
                                    ({gap.unidad.clase})
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
          </div>

          {/* Footer paginador / resumen agrupado */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-600">
            <span>
              {total === 0
                ? "Sin resultados"
                : estaAgrupado
                  ? `${total} ${total === 1 ? "movilización" : "movilizaciones"} · ${filasVisibles} ${filasVisibles === 1 ? "fila" : "filas"} en vista`
                  : `Mostrando ${desdeRegistro}–${hastaRegistro} de ${total}`}
            </span>
            {!estaAgrupado && (
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
                  Página <strong>{page}</strong> de{" "}
                  <strong>{totalPages}</strong>
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
            )}
          </div>
        </div>
      </main>

      <MovilizacionForm
        open={modo.tipo !== "oculto"}
        initial={modo.tipo === "editar" ? modo.movilizacion : null}
        empresas={empresas}
        unidades={unidades}
        usuarios={usuarios}
        onClose={() => setModo({ tipo: "oculto" })}
        onSubmit={handleSubmit}
      />

      <MovilizacionDetalleModal
        open={detalle !== null}
        movilizacion={detalle}
        onClose={() => setDetalle(null)}
        onEdit={(m) => {
          setDetalle(null);
          setModo({ tipo: "editar", movilizacion: m });
        }}
        onDelete={async (m) => {
          setDetalle(null);
          await eliminar(m);
        }}
      />

      {commentTooltip &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
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

      {menuAcciones &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Cerrar menú"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={cerrarMenuAcciones}
            />
            <div
              role="menu"
              aria-label="Acciones de movilización"
              style={{
                position: "fixed",
                top: menuAcciones.top,
                right: menuAcciones.right,
              }}
              className="z-50 min-w-[10.5rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClass} text-slate-700`}
                onClick={() => {
                  setDetalle(menuAcciones.mov);
                  cerrarMenuAcciones();
                }}
              >
                <EyeIcon className="h-4 w-4 shrink-0 text-slate-500" />
                Ver detalle
              </button>
              {menuAcciones.mov.canManage && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${menuItemClass} text-slate-700`}
                    onClick={() => {
                      setModo({
                        tipo: "editar",
                        movilizacion: menuAcciones.mov,
                      });
                      cerrarMenuAcciones();
                    }}
                  >
                    <PencilIcon className="h-4 w-4 shrink-0 text-slate-500" />
                    Editar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                    onClick={() => {
                      cerrarMenuAcciones();
                      eliminar(menuAcciones.mov);
                    }}
                  >
                    <TrashIcon className="h-4 w-4 shrink-0" />
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </>
  );
};
