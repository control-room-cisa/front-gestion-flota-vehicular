import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/auth/AuthContext';
import {
  canAccessCombustibleNiveles,
  canAccessCombustiblePrecios,
} from '../../../shared/types/roles.types';
import { NivelesTanqueTab } from '../components/NivelesTanqueTab';
import { PreciosCombustibleTab } from '../components/PreciosCombustibleTab';

type CombustibleTab = 'niveles' | 'precios';

const TAB_META: { id: CombustibleTab; label: string }[] = [
  { id: 'niveles', label: 'Niveles' },
  { id: 'precios', label: 'Precios' },
];

export const CombustiblePage = () => {
  const { usuario } = useAuth();
  const roles = usuario?.roles;

  const puedeNiveles = canAccessCombustibleNiveles(roles);
  const puedePrecios = canAccessCombustiblePrecios(roles);

  const tabsVisibles = useMemo(
    () =>
      TAB_META.filter(
        (t) =>
          (t.id === 'niveles' && puedeNiveles) ||
          (t.id === 'precios' && puedePrecios),
      ),
    [puedeNiveles, puedePrecios],
  );

  const [tab, setTab] = useState<CombustibleTab>(
    () => tabsVisibles[0]?.id ?? 'niveles',
  );

  useEffect(() => {
    if (!tabsVisibles.some((t) => t.id === tab)) {
      setTab(tabsVisibles[0]?.id ?? 'niveles');
    }
  }, [tab, tabsVisibles]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {tabsVisibles.length > 1 && (
        <div
          className="flex gap-1 border-b border-slate-200"
          role="tablist"
          aria-label="Secciones de combustible"
        >
          {tabsVisibles.map(({ id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={
                  'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ' +
                  (active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div role="tabpanel">
        {tab === 'niveles' && puedeNiveles ? (
          <NivelesTanqueTab />
        ) : tab === 'precios' && puedePrecios ? (
          <PreciosCombustibleTab />
        ) : null}
      </div>
    </main>
  );
};
