import { useState } from 'react';
import { NivelesTanqueTab } from '../components/NivelesTanqueTab';
import { PreciosCombustibleTab } from '../components/PreciosCombustibleTab';

type CombustibleTab = 'niveles' | 'precios';

const TABS: { id: CombustibleTab; label: string }[] = [
  { id: 'niveles', label: 'Niveles' },
  { id: 'precios', label: 'Precios' },
];

export const CombustiblePage = () => {
  const [tab, setTab] = useState<CombustibleTab>('niveles');

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Combustible</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tanque diesel y historial de precios por tipo de combustible.
        </p>
      </div>

      <div
        className="flex gap-1 border-b border-slate-200"
        role="tablist"
        aria-label="Secciones de combustible"
      >
        {TABS.map(({ id, label }) => {
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

      <div role="tabpanel">
        {tab === 'niveles' ? <NivelesTanqueTab /> : <PreciosCombustibleTab />}
      </div>
    </main>
  );
};
