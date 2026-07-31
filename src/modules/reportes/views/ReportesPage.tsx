import { NavLink, Outlet } from "react-router-dom";

const TAB_META = [
  { to: "uso-rendimientos", label: "Uso y rendimientos" },
  { to: "uso-empresa", label: "Uso por empresa" },
] as const;

export const ReportesPage = () => {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div
        className="flex gap-1 border-b border-slate-200 overflow-x-auto"
        role="tablist"
        aria-label="Secciones de reportes"
      >
        {TAB_META.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            role="tab"
            className={({ isActive }) =>
              "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap " +
              (isActive
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300")
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div role="tabpanel">
        <Outlet />
      </div>
    </main>
  );
};
