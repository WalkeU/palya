import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function TopBar({ onNewCustomer }: { onNewCustomer?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-scale-1" />
            <span className="h-1.5 w-1.5 rounded-full bg-scale-3" />
            <span className="h-2 w-2 rounded-full bg-scale-5" />
          </div>
          <span className="font-display text-xl font-medium text-ink-950">
            Pálya
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {location.pathname === "/" && onNewCustomer && (
            <button
              onClick={onNewCustomer}
              className="rounded-lg bg-ink-950 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              + Új ügyfél
            </button>
          )}
          {user?.role === "superadmin" && (
            <Link
              to={location.pathname === "/" ? "/felhasznalok" : "/"}
              className="rounded-lg border border-ink-100 px-3.5 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-300"
            >
              {location.pathname === "/" ? "Felhasználók" : "Vissza a táblához"}
            </Link>
          )}
          <div className="mx-1 h-6 w-px bg-ink-100" />
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
              {(user?.nickname || user?.email || "?")[0]?.toUpperCase()}
            </div>
            <span className="hidden text-sm text-ink-700 sm:inline">
              {user?.nickname || user?.email}
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="text-sm text-ink-500 transition hover:text-ink-900"
          >
            Kilépés
          </button>
        </div>
      </div>
    </header>
  );
}
