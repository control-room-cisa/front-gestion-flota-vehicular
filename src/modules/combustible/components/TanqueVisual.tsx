import type { NivelTanqueDieselDto } from '../types/nivel-tanque-diesel.types';
import {
  formatGalonesDisplay,
  formatPorcentajeDisplay,
  volumenGalonesDesdeAlturaTanque,
} from '../utils/tanque-cilindrico';

interface TanqueVisualProps {
  porcentaje: number;
  ultimo?: NivelTanqueDieselDto | null;
  capacidadGalones: number;
  className?: string;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Marcas de referencia de nivel (desde la base del tanque). */
const MARCAS_NIVEL = [100, 75, 50, 25, 0] as const;

/**
 * Representación gráfica del tanque de combustible según el último registro.
 */
export const TanqueVisual = ({
  porcentaje,
  ultimo,
  capacidadGalones,
  className = '',
}: TanqueVisualProps) => {
  const pct = clamp(porcentaje);
  const fillHeight = `${pct}%`;
  const nivelPulg =
    ultimo !== null && ultimo !== undefined
      ? parseDecimalSafe(ultimo.alturaPulgadas)
      : null;
  const volumenGal =
    nivelPulg !== null ? volumenGalonesDesdeAlturaTanque(nivelPulg) : null;

  return (
    <div
      className={`flex flex-col items-center gap-4 ${className}`}
      aria-label={`Tanque de combustible al ${formatPorcentajeDisplay(pct)}%`}
    >
      <div className="relative w-40 sm:w-48">
        <div className="mx-auto h-3 w-24 rounded-t-lg border-2 border-slate-400 bg-gradient-to-b from-slate-300 to-slate-400" />

        <div className="relative mx-auto h-56 w-full overflow-hidden rounded-b-2xl rounded-t-md border-4 border-slate-500 bg-slate-100 shadow-inner">
          {/* Líneas de referencia horizontales */}
          {MARCAS_NIVEL.filter((m) => m > 0 && m < 100).map((marca) => (
            <div
              key={marca}
              className="pointer-events-none absolute left-2 right-9 border-t border-dashed border-slate-400/60"
              style={{ bottom: `${marca}%` }}
              aria-hidden
            />
          ))}

          {/* Nivel de combustible */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
            style={{ height: fillHeight }}
          >
            <div className="h-full w-full bg-gradient-to-t from-amber-700 via-amber-500 to-amber-300 opacity-95" />
            <div
              className="absolute left-0 right-0 top-0 h-3 -translate-y-1/2 bg-amber-200/60 blur-sm"
              aria-hidden
            />
          </div>

          {/* Porcentaje centrado sobre el tanque */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-slate-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.95)]">
              {Math.round(pct)}%
            </span>
          </div>

          {/* Etiquetas de referencia */}
          <div className="pointer-events-none absolute inset-y-3 right-2 z-10 flex flex-col justify-between text-[10px] font-medium text-slate-500">
            {MARCAS_NIVEL.map((marca) => (
              <span key={marca}>{marca}%</span>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-y-4 left-3 w-4 rounded-full bg-white/25" />
        </div>

        <div className="mx-auto -mt-1 h-2 w-32 rounded-b-md bg-slate-500" />
      </div>

      <dl className="w-full max-w-[14rem] space-y-2 text-sm text-center">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Capacidad</dt>
          <dd className="font-semibold tabular-nums text-slate-800">
            {formatGalonesDisplay(capacidadGalones)} gal
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Diesel</dt>
          <dd className="font-semibold tabular-nums text-slate-800">
            {volumenGal !== null
              ? `${formatGalonesDisplay(volumenGal)} gal`
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Nivel</dt>
          <dd className="font-semibold tabular-nums text-slate-800">
            {nivelPulg !== null ? `${nivelPulg.toFixed(2)} pulg` : '—'}
          </dd>
        </div>
      </dl>

      {!ultimo && (
        <p className="text-sm text-slate-500">Sin registros de nivel</p>
      )}
    </div>
  );
};

const parseDecimalSafe = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
