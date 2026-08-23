import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/floorplan", label: "Floorplan Matrix", icon: "🗺️" },
  { to: "/team-sync", label: "Team Synchronizer", icon: "👥" },
  { to: "/capacity", label: "Capacity Monitor", icon: "📊" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl">🏢</span>
          <span className="text-lg font-bold text-slate-900">FlexDesk</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks />
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4 text-sm">
          <p className="font-medium text-slate-900">{user?.name}</p>
          <p className="text-slate-500">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏢</span>
          <span className="font-bold text-slate-900">FlexDesk</span>
        </div>
        <button
          aria-label="Toggle navigation"
          onClick={() => setMobileNavOpen((v) => !v)}
          className="rounded-md border border-slate-300 p-2 text-slate-600"
        >
          {mobileNavOpen ? "✕" : "☰"}
        </button>
      </header>

      {mobileNavOpen && (
        <nav className="flex flex-col gap-1 border-b border-slate-200 bg-white p-3 md:hidden">
          <NavLinks onNavigate={() => setMobileNavOpen(false)} />
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
            <div>
              <p className="font-medium text-slate-900">{user?.name}</p>
              <p className="text-slate-500">{user?.role}</p>
            </div>
            <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600">
              Sign out
            </button>
          </div>
        </nav>
      )}

      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
