import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, BarChart3, Briefcase, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/authContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload CV', icon: Upload },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/jobs', label: 'Job Matcher', icon: Briefcase },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="min-h-dvh">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[--color-line] bg-[--color-surface-1]/95 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-[--color-line] px-5">
          {/* Wordmark. The falling-streak effect lives in the landing hero —
              there is no room for it in a 4rem-tall sidebar row. */}
          <span className="text-[1.0625rem] font-semibold tracking-tight text-gradient">
            CVision AI
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1.5 text-[--color-muted] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[--color-line] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-berry-600/20 text-sm font-semibold text-berry-300">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-[--color-muted]">{user?.email}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="nav-link mt-1 w-full">
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Scrim behind the mobile drawer */}
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ---------- Main ---------- */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[--color-line] bg-[--color-surface-0]/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-[--color-muted] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="truncate text-base font-semibold">
            {NAV.find((n) => location.pathname.startsWith(n.to))?.label ?? 'CVision AI'}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-[--color-muted] sm:inline">
              {user?.stats?.analysesRun ?? 0} analyses run
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
