import { useCallback, useEffect, useState } from "react";
import { CONFIGURACION_KEYS } from "../../../shared/config/configuracion-keys";
import { ApiError } from "../../../shared/http/api-client";
import { configuracionService } from "../../../shared/services/configuracion.service";
import {
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../../../shared/utils/numeric-input";

const ConfigKeyBadge = ({ nombre }: { nombre: string }) => (
  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{nombre}</code>
);

export const ConfiguracionesPage = () => {
  const [precioInput, setPrecioInput] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const precio = await configuracionService.getValor(
        CONFIGURACION_KEYS.PRECIO_COMBUSTIBLE,
      );
      setPrecioInput(precio);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo cargar la configuración",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    setError(null);
    setMensaje(null);

    const precio = parseDecimalInput(precioInput);
    if (precio === null || precio < 0) {
      setError("Ingresa un precio de combustible válido (mayor o igual a 0)");
      return;
    }

    setGuardando(true);
    try {
      await configuracionService.setValor(
        CONFIGURACION_KEYS.PRECIO_COMBUSTIBLE,
        String(precio),
      );
      setPrecioInput(String(precio));
      setMensaje("Configuración guardada correctamente");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo guardar la configuración",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {cargando ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          Cargando…
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-slate-200 p-8">
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {mensaje && (
            <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {mensaje}
            </p>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Precio combustible (L / galón)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                <ConfigKeyBadge
                  nombre={CONFIGURACION_KEYS.PRECIO_COMBUSTIBLE}
                />
              </p>
              <input
                type="text"
                inputMode="decimal"
                value={precioInput}
                onChange={(e) => {
                  setPrecioInput(sanitizeDecimalInput(e.target.value));
                  setMensaje(null);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleGuardar()}
            disabled={guardando}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {guardando ? "Guardando…" : "Guardar configuración"}
          </button>
        </section>
      )}
    </main>
  );
};
