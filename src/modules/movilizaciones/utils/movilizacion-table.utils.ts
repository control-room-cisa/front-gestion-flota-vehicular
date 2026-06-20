import type { MovilizacionDto } from '../types/movilizacion.types';

export type MovilizacionGroupBy = 'none' | 'usuario' | 'unidad' | 'empresa';

export type MovilizacionTableRow =
  | { kind: 'group'; id: string; label: string; count: number }
  | { kind: 'mov'; mov: MovilizacionDto; rowKey: string };

/**
 * Construye filas de tabla con encabezados de grupo. Para `empresa`, una
 * movilización con varias empresas aparece en cada grupo correspondiente.
 */
export const buildGroupedTableRows = (
  items: MovilizacionDto[],
  groupBy: MovilizacionGroupBy,
): MovilizacionTableRow[] => {
  if (groupBy === 'none') {
    return items.map((mov) => ({
      kind: 'mov',
      mov,
      rowKey: String(mov.id),
    }));
  }

  type Bucket = { key: string; label: string; movs: MovilizacionDto[] };
  const buckets = new Map<string, Bucket>();

  const add = (key: string, label: string, mov: MovilizacionDto) => {
    const existing = buckets.get(key);
    if (existing) {
      existing.movs.push(mov);
    } else {
      buckets.set(key, { key, label, movs: [mov] });
    }
  };

  for (const m of items) {
    if (groupBy === 'usuario') {
      add(
        String(m.usuario.id),
        `${m.usuario.nombre} ${m.usuario.apellido}`.trim(),
        m,
      );
    } else if (groupBy === 'unidad') {
      add(
        String(m.unidad.id),
        `${m.unidad.nombre} · ${m.unidad.clase.toUpperCase()}`,
        m,
      );
    } else if (groupBy === 'empresa') {
      if (m.empresas.length === 0) {
        add('sin-empresa', 'Sin empresas asignadas', m);
      } else {
        for (const e of m.empresas) {
          add(String(e.id), `${e.nombre} (${e.codigo})`, m);
        }
      }
    }
  }

  const sortedBuckets = [...buckets.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'es'),
  );

  const rows: MovilizacionTableRow[] = [];
  for (const bucket of sortedBuckets) {
    const movs = [...bucket.movs].sort(
      (a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id,
    );
    rows.push({
      kind: 'group',
      id: bucket.key,
      label: bucket.label,
      count: movs.length,
    });
    for (const mov of movs) {
      rows.push({
        kind: 'mov',
        mov,
        rowKey:
          groupBy === 'empresa' ? `${mov.id}-emp-${bucket.key}` : String(mov.id),
      });
    }
  }
  return rows;
};
