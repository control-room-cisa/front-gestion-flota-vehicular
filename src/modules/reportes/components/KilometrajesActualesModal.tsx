import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Modal } from "../../../shared/components/Modal";
import { tableScrollWrapClass } from "../../../shared/components/TableActionUi";
import { useToast } from "../../../shared/components/ToastProvider";
import { reportesService } from "../services/reportes.service";
import type { KilometrajeActualUnidadDto } from "../types/reportes.types";

const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** "YYYY/MM/DD HH:mm" en TZ local. Usado en la exportación a Excel. */
const formatFechaExcel = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const hoyISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface KilometrajesActualesModalProps {
  open: boolean;
  onClose: () => void;
}

export const KilometrajesActualesModal = ({
  open,
  onClose,
}: KilometrajesActualesModalProps) => {
  const toast = useToast();
  const [unidades, setUnidades] = useState<KilometrajeActualUnidadDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    reportesService
      .kilometrajesActuales()
      .then((res) => {
        if (cancelled) return;
        setUnidades(res.unidades);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar kilometrajes actuales",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const exportarExcel = () => {
    if (exportando || loading) return;
    if (unidades.length === 0) {
      toast.info("No hay vehículos para exportar.", "Sin resultados");
      return;
    }

    setExportando(true);
    try {
      const filas = unidades.map((v) => ({
        Class: v.clase.toUpperCase(),
        Nombre: v.nombre,
        Kilometraje: v.kilometraje ?? "",
        Fecha: v.fecha ? formatFechaExcel(v.fecha) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(filas, {
        header: ["Class", "Nombre", "Kilometraje", "Fecha"],
      });
      ws["!cols"] = [{ wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 18 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kilometrajes actuales");
      XLSX.writeFile(wb, `kilometrajes_actuales_${hoyISO()}.xlsx`);

      toast.success(
        `Se exportaron ${unidades.length} vehículo${unidades.length === 1 ? "" : "s"}.`,
        "Excel generado",
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al exportar kilometrajes actuales";
      toast.error(msg, "No se pudo generar el Excel");
    } finally {
      setExportando(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Kilometrajes actuales"
      subtitle="Última lectura por vehículo"
      size="xl"
      busy={loading || exportando}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={exportarExcel}
          disabled={loading || exportando || unidades.length === 0}
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
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className={tableScrollWrapClass}>
          <table className="w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Nombre
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Kilometraje
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500 text-sm"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-500 text-sm"
                  >
                    Sin vehículos registrados
                  </td>
                </tr>
              ) : (
                unidades.map((v) => (
                  <tr
                    key={v.unidadId}
                    className={v.activo ? "" : "bg-slate-50/60"}
                  >
                    <td className="px-4 py-3 font-mono text-sm text-slate-800">
                      {v.clase.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {v.nombre}
                      {!v.activo && (
                        <span className="ml-2 text-xs text-slate-500">
                          (inactivo)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-slate-800">
                      {v.kilometraje !== null
                        ? v.kilometraje.toLocaleString("es-HN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {v.fecha ? formatFecha(v.fecha) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
