import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../../shared/components/Modal";
import {
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../../../shared/utils/numeric-input";
import {
  formatGalonesDisplay,
  volumenGalonesDesdeAlturaTanque,
} from "../utils/tanque-cilindrico";
import type {
  CreateNivelTanqueDieselDto,
  NivelTanqueDieselDto,
  UpdateNivelTanqueDieselDto,
} from "../types/nivel-tanque-diesel.types";

interface NivelTanqueDieselFormProps {
  open: boolean;
  initial?: NivelTanqueDieselDto | null;
  onClose: () => void;
  onSubmit: (
    data: CreateNivelTanqueDieselDto | UpdateNivelTanqueDieselDto,
  ) => Promise<void>;
}

const toLocalInput = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

const fromLocalInput = (local: string): string => new Date(local).toISOString();

const COMENTARIO_MAX = 200;

const readonlyInputClass =
  "px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed font-mono outline-none";

export const NivelTanqueDieselForm = ({
  open,
  initial,
  onClose,
  onSubmit,
}: NivelTanqueDieselFormProps) => {
  const editing = Boolean(initial);
  const [fecha, setFecha] = useState("");
  const [altura, setAltura] = useState("");
  const [comentario, setComentario] = useState("");
  const [relleno, setRelleno] = useState(false);
  const [galonesRellenados, setGalonesRellenados] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFecha(toLocalInput(initial?.fecha));
    setAltura(initial?.alturaPulgadas ?? "");
    setComentario(initial?.comentario ?? "");
    setRelleno(initial?.rellenoCombustible ?? false);
    setGalonesRellenados(initial?.galonesRellenados ?? "");
    setError(undefined);
  }, [open, initial]);

  const volumenCalculado = useMemo(() => {
    const alturaNum = parseDecimalInput(altura);
    if (alturaNum === null) return null;
    return volumenGalonesDesdeAlturaTanque(alturaNum);
  }, [altura]);

  const volumenTexto =
    volumenCalculado !== null
      ? formatGalonesDisplay(volumenCalculado)
      : altura.trim()
        ? "—"
        : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const alturaNum = parseDecimalInput(altura);
    if (alturaNum === null || alturaNum < 0) {
      setError("Ingresa una altura válida en pulgadas");
      return;
    }
    if (volumenCalculado === null) {
      setError("No se pudo calcular el volumen con los datos ingresados");
      return;
    }

    const comentarioTrim = comentario.trim();
    if (comentarioTrim.length > COMENTARIO_MAX) {
      setError(`El comentario no puede exceder ${COMENTARIO_MAX} caracteres`);
      return;
    }

    let galonesNum: number | null = null;
    if (relleno) {
      galonesNum = parseDecimalInput(galonesRellenados);
      if (galonesNum === null || galonesNum <= 0) {
        setError("Ingresa los galones rellenados (mayor a 0)");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        fecha: fromLocalInput(fecha),
        alturaPulgadas: alturaNum,
        volumenGalones: volumenCalculado,
        comentario: comentarioTrim || null,
        rellenoCombustible: relleno,
        galonesRellenados: galonesNum,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar nivel" : "Nuevo nivel"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">Fecha</label>
          <input
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Altura (pulgadas)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={altura}
              onChange={(e) => setAltura(sanitizeDecimalInput(e.target.value))}
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <span className="text-xs text-slate-500">
              Medida desde la base del tanque.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Volumen (galones)
            </label>
            <input
              type="text"
              value={volumenTexto}
              readOnly
              tabIndex={-1}
              required
              className={readonlyInputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700">
            Comentario
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value.slice(0, COMENTARIO_MAX))}
            maxLength={COMENTARIO_MAX}
            rows={3}
            className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
            placeholder="Opcional"
          />
          <p className="text-xs text-slate-500 text-right tabular-nums">
            {comentario.length}/{COMENTARIO_MAX}
          </p>
        </div>

        <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
          <input
            id="relleno-combustible"
            type="checkbox"
            checked={relleno}
            onChange={(e) => {
              const checked = e.target.checked;
              setRelleno(checked);
              if (!checked) setGalonesRellenados("");
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="relleno-combustible" className="cursor-pointer min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              Relleno de combustible
            </span>
            <span className="block mt-1 text-xs leading-relaxed text-slate-500">
              Marcar solamente después de haber llenado el tanque.
            </span>
          </label>
        </div>

        {relleno && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Galones rellenados
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={galonesRellenados}
              onChange={(e) =>
                setGalonesRellenados(sanitizeDecimalInput(e.target.value))
              }
              required
              className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Cantidad de galones cargados al tanque"
            />
          </div>
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
            {submitting ? "Guardando…" : editing ? "Actualizar" : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
