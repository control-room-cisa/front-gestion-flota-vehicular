import { useState } from "react";
import { UsoPorEmpresaTab } from "../components/UsoPorEmpresaTab";
import { UsoRendimientosTab } from "../components/UsoRendimientosTab";

type ReportesTab = "uso-rendimientos" | "uso-empresa";

const TAB_META: { id: ReportesTab; label: string }[] = [
  { id: "uso-rendimientos", label: "Uso y rendimientos" },
  { id: "uso-empresa", label: "Uso por empresa" },
];

export const ReportesPage = () => {
  const [tab, setTab] = useState<ReportesTab>("uso-rendimientos");

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div
        className="flex gap-1 border-b border-slate-200 overflow-x-auto"
        role="tablist"
        aria-label="Secciones de reportes"
      >
        {TAB_META.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={
                "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap " +
                (active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300")
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "uso-rendimientos" ? (
          <UsoRendimientosTab />
        ) : (
          <UsoPorEmpresaTab />
        )}
      </div>
    </main>
  );
};
