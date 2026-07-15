import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import {
  COL_LG,
  tableScrollWrapClass,
} from "../../../shared/components/TableActionUi";
import { useToast } from "../../../shared/components/ToastProvider";
import { CATEGORIA_CODIGO_VEHICULOS_LIVIANOS } from "../../categorias/types/categoria.types";
import { empresaService } from "../../empresas/services/empresa.service";
import type { EmpresaDto } from "../../empresas/types/empresa.types";
import { kmAsignadosEfectivos } from "../../movilizaciones/types/movilizacion.types";
import { unidadService } from "../../unidades/services/unidad.service";
import type { UnidadDto } from "../../unidades/types/unidad.types";
import { reportesService } from "../services/reportes.service";
import type {
  UsoPorEmpresaItemDto,
  UsoPorEmpresaLlenadoDto,
} from "../types/reportes.types";

type GroupBy = "none" | "empresa";

type TableRow =
  | {
      kind: "group";
      id: string;
      label: string;
      count: number;
      /** Total de costo movilización del grupo completo (todas las páginas). */
      totalCosto: number | null;
    }
  | {
      kind: "item";
      item: UsoPorEmpresaItemDto;
      rowKey: string;
      empresaGrupoId: number | null;
    };

const PAGE_SIZE = 50;
const FETCH_PAGE_SIZE = 200;

const UNIDAD_TODOS = {
  id: 0,
  nombre: "Todas las unidades",
  clase: "",
  activo: true,
} as UnidadDto;

const EMPRESA_TODAS: EmpresaDto = {
  id: 0,
  codigo: "",
  nombre: "Todas las empresas",
  activo: true,
};

const EXCEL_HEADERS = [
  "Fecha y hora",
  "Usuario",
  "Vehículo",
  "Km inicial",
  "Km final",
  "Recorrido",
  "Empresas",
  "Costo / km",
  "Costo movilización",
  "Es viaje",
  "Comentario",
] as const;

const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const haceNDiasISO = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const inicioDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T00:00:00`).toISOString();

const finDelDiaISO = (ymd: string): string =>
  new Date(`${ymd}T23:59:59.999`).toISOString();

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-HN", {
    dateStyle: "short",
    timeStyle: "short",
  });

const formatFechaExcel = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatMoney = (n: number | null | undefined, digits = 2): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-HN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatLlenadoTooltip = (
  label: string,
  d: UsoPorEmpresaLlenadoDto | null,
): string => {
  if (!d) return `${label}: sin registro`;
  return (
    `${label}: ${formatFecha(d.fecha)} · ` +
    `km ${d.kilometraje.toLocaleString("es-HN")} · ` +
    `${Number(d.cantidadGalones).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} gal × ` +
    `L ${formatMoney(Number(d.precioGalon))} = L ${formatMoney(d.costo)}`
  );
};

const costoMovilizacionFila = (
  item: UsoPorEmpresaItemDto,
  empresaGrupoId: number | null,
  groupBy: GroupBy,
): number | null => {
  if (item.costoPorKm === null) return null;
  if (groupBy === "empresa" && empresaGrupoId !== null) {
    const emp = item.empresas.find((e) => e.id === empresaGrupoId);
    const km = emp
      ? kmAsignadosEfectivos(emp.kmAsignados, item.recorrido)
      : item.recorrido;
    return Math.round(item.costoPorKm * km * 100) / 100;
  }
  return item.costoMovilizacionTotal;
};

const buildRows = (
  items: UsoPorEmpresaItemDto[],
  groupBy: GroupBy,
): TableRow[] => {
  if (groupBy === "none") {
    return items.map((item) => ({
      kind: "item" as const,
      item,
      rowKey: String(item.id),
      empresaGrupoId: null,
    }));
  }

  type Bucket = {
    key: string;
    label: string;
    items: UsoPorEmpresaItemDto[];
  };
  const buckets = new Map<string, Bucket>();

  for (const m of items) {
    if (m.empresas.length === 0) {
      const key = "sin-empresa";
      const existing = buckets.get(key);
      if (existing) existing.items.push(m);
      else
        buckets.set(key, {
          key,
          label: "Sin empresas asignadas",
          items: [m],
        });
    } else {
      for (const e of m.empresas) {
        const key = String(e.id);
        const existing = buckets.get(key);
        if (existing) existing.items.push(m);
        else
          buckets.set(key, {
            key,
            label: `${e.nombre} (${e.codigo})`,
            items: [m],
          });
      }
    }
  }

  const sorted = [...buckets.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );

  const rows: TableRow[] = [];
  for (const b of sorted) {
    let sum = 0;
    let tiene = false;
    for (const item of b.items) {
      const empId = b.key === "sin-empresa" ? null : Number(b.key);
      const c = costoMovilizacionFila(item, empId, "empresa");
      if (c !== null) {
        sum += c;
        tiene = true;
      }
    }
    rows.push({
      kind: "group",
      id: b.key,
      label: b.label,
      count: b.items.length,
      totalCosto: tiene ? Math.round(sum * 100) / 100 : null,
    });
    for (const item of b.items) {
      rows.push({
        kind: "item",
        item,
        rowKey: `${item.id}-emp-${b.key}`,
        empresaGrupoId: b.key === "sin-empresa" ? null : Number(b.key),
      });
    }
  }
  return rows;
};

/** Filas lógicas exportables (sin encabezados de grupo). */
const buildExportFilas = (
  items: UsoPorEmpresaItemDto[],
  groupBy: GroupBy,
) => {
  const rows = buildRows(items, groupBy).filter(
    (r): r is Extract<TableRow, { kind: "item" }> => r.kind === "item",
  );

  return rows.map((row) => {
    const m = row.item;
    const costoMov = costoMovilizacionFila(m, row.empresaGrupoId, groupBy);
    const empresasVisibles =
      groupBy === "empresa" && row.empresaGrupoId !== null
        ? m.empresas.filter((e) => e.id === row.empresaGrupoId)
        : m.empresas;

    return {
      "Fecha y hora": formatFechaExcel(m.fecha),
      Usuario: `${m.usuario.nombre} ${m.usuario.apellido}`.trim(),
      Vehículo: m.unidad.nombre,
      "Km inicial": m.kilometrajeInicial,
      "Km final": m.kilometrajeFinal,
      Recorrido: m.recorrido,
      Empresas: empresasVisibles
        .map((e) => {
          const km = kmAsignadosEfectivos(e.kmAsignados, m.recorrido);
          return `${e.nombre} (${km} km)`;
        })
        .join(", "),
      "Costo / km": m.costoPorKm ?? "",
      "Costo movilización": costoMov ?? "",
      "Es viaje": m.esViaje ? "Sí" : "No",
      Comentario: m.comentario,
    };
  });
};

export const UsoPorEmpresaTab = () => {
  const toast = useToast();

  const [desde, setDesde] = useState(() => haceNDiasISO(30));
  const [hasta, setHasta] = useState(() => hoyISO());
  const [unidadFiltro, setUnidadFiltro] = useState<UnidadDto | null>(
    UNIDAD_TODOS,
  );
  const [empresaFiltro, setEmpresaFiltro] = useState<EmpresaDto | null>(
    EMPRESA_TODAS,
  );
  const [groupBy, setGroupBy] = useState<GroupBy>("empresa");
  const [mostrarViajes, setMostrarViajes] = useState(true);
  const [page, setPage] = useState(1);

  const [unidades, setUnidades] = useState<UnidadDto[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [allItems, setAllItems] = useState<UsoPorEmpresaItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string>();

  const [costoHover, setCostoHover] = useState<{
    top: number;
    left: number;
    item: UsoPorEmpresaItemDto;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      unidadService.list({
        categoriaCodigo: CATEGORIA_CODIGO_VEHICULOS_LIVIANOS,
      }),
      empresaService.list(),
    ])
      .then(([vehs, emps]) => {
        if (cancelled) return;
        setUnidades(vehs);
        setEmpresas(emps.filter((e) => e.activo));
      })
      .catch(() => {
        if (cancelled) return;
        setUnidades([]);
        setEmpresas([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fechasInvalidas = Boolean(desde && hasta && desde > hasta);

  const cargar = useCallback(async () => {
    if (fechasInvalidas) return;
    setLoading(true);
    setError(undefined);
    try {
      const base = {
        desde: desde ? inicioDelDiaISO(desde) : undefined,
        hasta: hasta ? finDelDiaISO(hasta) : undefined,
        unidadId:
          unidadFiltro && unidadFiltro.id > 0 ? unidadFiltro.id : undefined,
        empresaId:
          empresaFiltro && empresaFiltro.id > 0 ? empresaFiltro.id : undefined,
        pageSize: FETCH_PAGE_SIZE,
      };

      const todos: UsoPorEmpresaItemDto[] = [];
      let pagina = 1;
      let totalRegistros = 0;
      do {
        const res = await reportesService.usoPorEmpresa({
          ...base,
          page: pagina,
        });
        todos.push(...res.items);
        totalRegistros = res.total;
        if (res.items.length === 0) break;
        pagina += 1;
      } while (todos.length < totalRegistros);

      setAllItems(todos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reporte");
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, unidadFiltro, empresaFiltro, fechasInvalidas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setPage(1);
  }, [desde, hasta, unidadFiltro, empresaFiltro, mostrarViajes, groupBy]);

  const visibleItems = useMemo(
    () =>
      mostrarViajes ? allItems : allItems.filter((m) => !m.esViaje),
    [allItems, mostrarViajes],
  );

  const tableRowsAll = useMemo(
    () => buildRows(visibleItems, groupBy),
    [visibleItems, groupBy],
  );

  const itemRowsAll = useMemo(
    () =>
      tableRowsAll.filter(
        (r): r is Extract<TableRow, { kind: "item" }> => r.kind === "item",
      ),
    [tableRowsAll],
  );

  /** Totales de costo por grupo (todas las filas del filtro, no solo la página). */
  const totalCostoPorGrupo = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const row of tableRowsAll) {
      if (row.kind === "group") {
        map.set(row.id, row.totalCosto);
      }
    }
    return map;
  }, [tableRowsAll]);

  // Paginación sobre filas de datos (sin contar encabezados de grupo en el
  // conteo de “registros”, pero sí mostrando su bloque al paginar items).
  const totalItems = itemRowsAll.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageItemRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return itemRowsAll.slice(start, start + PAGE_SIZE);
  }, [itemRowsAll, page]);

  const pageTableRows = useMemo(() => {
    if (groupBy === "none") {
      return pageItemRows;
    }
    // Reconstruir encabezados de grupo solo para los items de la página.
    const byGrupo = new Map<string, Extract<TableRow, { kind: "item" }>[]>();
    for (const row of pageItemRows) {
      const key =
        row.empresaGrupoId === null ? "sin-empresa" : String(row.empresaGrupoId);
      const list = byGrupo.get(key) ?? [];
      list.push(row);
      byGrupo.set(key, list);
    }
    const labelOf = (key: string, sample: Extract<TableRow, { kind: "item" }>) => {
      if (key === "sin-empresa") return "Sin empresas asignadas";
      const emp = sample.item.empresas.find((e) => e.id === Number(key));
      return emp ? `${emp.nombre} (${emp.codigo})` : key;
    };
    const rows: TableRow[] = [];
    const keys = [...byGrupo.keys()].sort((a, b) => {
      const la = labelOf(a, byGrupo.get(a)![0]!);
      const lb = labelOf(b, byGrupo.get(b)![0]!);
      return la.localeCompare(lb, "es");
    });
    for (const key of keys) {
      const list = byGrupo.get(key)!;
      rows.push({
        kind: "group",
        id: key,
        label: labelOf(key, list[0]!),
        count: list.length,
        totalCosto: totalCostoPorGrupo.get(key) ?? null,
      });
      rows.push(...list);
    }
    return rows;
  }, [pageItemRows, groupBy, totalCostoPorGrupo]);

  const unidadesOptions = useMemo(
    () => [UNIDAD_TODOS, ...unidades.filter((u) => u.activo)],
    [unidades],
  );

  const empresasOptions = useMemo(
    () => [EMPRESA_TODAS, ...empresas],
    [empresas],
  );

  const showCostoHover = (
    e: React.MouseEvent<HTMLElement>,
    item: UsoPorEmpresaItemDto,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const W = 340;
    let left = rect.left;
    if (left + W > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - W - 8);
    }
    setCostoHover({ top: rect.bottom + 6, left, item });
  };

  const exportarExcel = () => {
    if (exportando || loading) return;
    if (itemRowsAll.length === 0) {
      toast.info(
        "No hay registros para exportar con los filtros aplicados.",
        "Sin resultados",
      );
      return;
    }

    setExportando(true);
    try {
      const filas = buildExportFilas(visibleItems, groupBy);
      const ws = XLSX.utils.json_to_sheet(filas, {
        header: [...EXCEL_HEADERS],
      });

      // Costo / km y Costo movilización como número.
      const colCostoKm = EXCEL_HEADERS.indexOf("Costo / km");
      const colCostoMov = EXCEL_HEADERS.indexOf("Costo movilización");
      for (let i = 0; i < filas.length; i++) {
        for (const c of [colCostoKm, colCostoMov]) {
          const addr = XLSX.utils.encode_cell({ r: i + 1, c });
          const cell = ws[addr];
          if (cell && typeof cell.v === "number") {
            cell.t = "n";
            cell.z = c === colCostoKm ? "0.0000" : "0.00";
          }
        }
      }

      ws["!cols"] = [
        { wch: 18 },
        { wch: 28 },
        { wch: 24 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 36 },
        { wch: 12 },
        { wch: 16 },
        { wch: 10 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Uso por empresa");

      const sufijo =
        desde && hasta
          ? desde === hasta
            ? desde
            : `${desde}_a_${hasta}`
          : hoyISO();
      XLSX.writeFile(wb, `uso_por_empresa_${sufijo}.xlsx`);

      toast.success(
        `Se exportaron ${filas.length} fila${filas.length === 1 ? "" : "s"}.`,
        "Excel generado",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al exportar",
        "No se pudo generar el Excel",
      );
    } finally {
      setExportando(false);
    }
  };

  const colCount = 11;
  const desdeRegistro = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const hastaRegistro = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={exportarExcel}
          disabled={exportando || loading || itemRowsAll.length === 0}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
        >
          {exportando ? "Generando…" : "Descargar Excel"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Desde</label>
          <input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">Hasta</label>
          <input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">
            Vehículo
          </label>
          <SearchableSelect<UnidadDto>
            options={unidadesOptions}
            value={unidadFiltro}
            onChange={(v) => setUnidadFiltro(v ?? UNIDAD_TODOS)}
            getKey={(v) => v.id}
            getLabel={(v) => v.nombre}
            getSubLabel={(v) => (v.id === 0 ? "" : v.clase.toUpperCase())}
            getSearchText={(v) => `${v.nombre} ${v.clase}`}
            placeholder="Todas..."
            emptyText="Sin vehículos"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">
            Empresa
          </label>
          <SearchableSelect<EmpresaDto>
            options={empresasOptions}
            value={empresaFiltro}
            onChange={(v) => setEmpresaFiltro(v ?? EMPRESA_TODAS)}
            getKey={(e) => e.id}
            getLabel={(e) => e.nombre}
            getSubLabel={(e) => (e.id === 0 ? "" : e.codigo)}
            getSearchText={(e) => `${e.nombre} ${e.codigo}`}
            placeholder="Todas..."
            emptyText="Sin empresas"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600">
            Agrupar por
          </label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="none">Sin agrupar</option>
            <option value="empresa">Empresa</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarViajes}
            onChange={(e) => setMostrarViajes(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Mostrar viajes
        </label>
      </div>

      {fechasInvalidas && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          &quot;Desde&quot; no puede ser posterior a &quot;Hasta&quot;.
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Costo/km = (costo llenado superior ÷ km entre llenados) + costo
        mantenimiento/km. Sin agrupar: costo movilización = costo/km ×
        recorrido. Agrupado por empresa: costo/km × km asignados de esa
        empresa.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className={tableScrollWrapClass}>
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
                <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  Km ini
                </th>
                <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  Km fin
                </th>
                <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  Rec.
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                >
                  Empresas
                </th>
                <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  Costo / km
                </th>
                <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  Costo mov.
                </th>
                <th
                  className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                >
                  Viaje
                </th>
                <th
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 ${COL_LG}`}
                >
                  Comentario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : pageTableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Sin registros para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                pageTableRows.map((row) => {
                  if (row.kind === "group") {
                    return (
                      <tr
                        key={`group-${row.id}-p${page}`}
                        className="bg-indigo-50/80 border-y border-indigo-100"
                      >
                        <td
                          colSpan={colCount}
                          className="px-4 py-2 text-sm font-semibold text-indigo-900"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {row.label}{" "}
                              <span className="font-normal text-indigo-700">
                                ({row.count} en esta página)
                              </span>
                            </span>
                            <span className="font-mono font-bold text-emerald-700">
                              Total:{" "}
                              {row.totalCosto !== null
                                ? `L ${formatMoney(row.totalCosto, 2)}`
                                : "—"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const m = row.item;
                  const costoMov = costoMovilizacionFila(
                    m,
                    row.empresaGrupoId,
                    groupBy,
                  );
                  const empresasVisibles =
                    groupBy === "empresa" && row.empresaGrupoId !== null
                      ? m.empresas.filter((e) => e.id === row.empresaGrupoId)
                      : m.empresas;

                  return (
                    <tr
                      key={row.rowKey}
                      className={m.esViaje ? "bg-red-50/40" : undefined}
                    >
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
                        {formatFecha(m.fecha)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-slate-800 ${COL_LG}`}
                      >
                        {m.usuario.nombre} {m.usuario.apellido}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-slate-800">
                        <div>{m.unidad.nombre}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {m.unidad.clase}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm font-mono text-right text-slate-800">
                        {m.kilometrajeInicial.toLocaleString("es-HN")}
                      </td>
                      <td className="px-2 py-3 text-sm font-mono text-right text-slate-800">
                        {m.kilometrajeFinal.toLocaleString("es-HN")}
                      </td>
                      <td className="px-2 py-3 text-sm font-mono text-right text-indigo-700 font-semibold">
                        {m.recorrido.toLocaleString("es-HN")}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-slate-800 ${COL_LG}`}
                      >
                        <div className="flex flex-wrap gap-1">
                          {empresasVisibles.map((e) => {
                            const km = kmAsignadosEfectivos(
                              e.kmAsignados,
                              m.recorrido,
                            );
                            return (
                              <span
                                key={e.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                                title={`${e.codigo} · ${km.toLocaleString("es-HN")} km`}
                              >
                                {e.nombre}
                                <span className="font-mono text-indigo-500">
                                  {km.toLocaleString("es-HN")}
                                </span>
                              </span>
                            );
                          })}
                          {empresasVisibles.length === 0 && (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-2 py-3 text-sm font-mono text-right text-slate-800 whitespace-nowrap cursor-help"
                        onMouseEnter={(e) => showCostoHover(e, m)}
                        onMouseLeave={() => setCostoHover(null)}
                      >
                        {m.costoPorKm !== null ? (
                          <span className="text-emerald-700 font-semibold">
                            L {formatMoney(m.costoPorKm, 4)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm font-mono text-right text-slate-800 whitespace-nowrap">
                        {costoMov !== null ? (
                          <span className="font-semibold text-slate-800">
                            L {formatMoney(costoMov, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td
                        className={`px-2 py-3 text-sm text-center ${COL_LG}`}
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
                        className={`px-4 py-3 text-sm text-slate-700 max-w-[12rem] truncate ${COL_LG}`}
                        title={m.comentario}
                      >
                        {m.comentario}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Mostrando {desdeRegistro}–{hastaRegistro} de {totalItems}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
            >
              Anterior
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {costoHover &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: costoHover.top,
              left: costoHover.left,
              zIndex: 60,
              maxWidth: 340,
            }}
            className="rounded-lg border border-slate-200 bg-white shadow-lg px-3 py-2 text-xs text-slate-700 space-y-1.5 pointer-events-none"
          >
            <div className="font-semibold text-slate-800">
              Cálculo costo / km
            </div>
            <p>
              {formatLlenadoTooltip(
                "Llenado inferior",
                costoHover.item.llenadoInferior,
              )}
            </p>
            <p>
              {formatLlenadoTooltip(
                "Llenado superior",
                costoHover.item.llenadoSuperior,
              )}
            </p>
            {costoHover.item.kmEntreLlenados !== null &&
              costoHover.item.llenadoSuperior && (
                <p className="text-slate-600">
                  Km entre llenados:{" "}
                  <span className="font-mono">
                    {costoHover.item.kmEntreLlenados.toLocaleString("es-HN")}
                  </span>
                  {" · "}
                  Combustible/km:{" "}
                  <span className="font-mono">
                    L {formatMoney(costoHover.item.combustiblePorKm, 4)}
                  </span>
                  {" · "}
                  Mant./km:{" "}
                  <span className="font-mono">
                    L {formatMoney(costoHover.item.mantenimientoPorKm, 4)}
                  </span>
                </p>
              )}
            {costoHover.item.costoPorKm === null && (
              <p className="text-amber-700">
                No se pudo calcular: faltan llenados inferior/superior o el
                tramo de km es inválido.
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
