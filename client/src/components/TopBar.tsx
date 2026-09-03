import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { SettingsModal } from "./SettingsModal";

function NavLink({
  to,
  label,
  active,
  compact,
}: {
  to: string;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`shrink-0 rounded-lg text-sm font-medium transition ${
        compact ? "px-2.5 py-1.5" : "px-3 py-2"
      }`}
      style={{
        color: active ? "rgb(var(--ink-950))" : "rgb(var(--ink-500))",
        backgroundColor: active ? "rgb(var(--ink-100))" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export function TopBar({ onNewCustomer }: { onNewCustomer?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isCustomers = location.pathname === "/ugyfelek";

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-3 sm:gap-0 sm:px-6 sm:py-3.5">
        {/* Row 1: always visible - logo, desktop nav, account controls.
            Nav links and the "new item" button move to row 2 below `sm`
            so this row never has to shrink past comfortable tap targets. */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
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

            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to="/" label="Kezdőlap" active={location.pathname === "/"} />
              <NavLink to="/ugyfelek" label="Ügyfelek" active={isCustomers} />
              <NavLink
                to="/feladatok"
                label="Feladatok"
                active={location.pathname === "/feladatok"}
              />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isCustomers && onNewCustomer && (
              <button
                onClick={onNewCustomer}
                className="hidden rounded-lg bg-night px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600 sm:inline-flex"
              >
                + Új ügyfél
              </button>
            )}
            <div className="mx-1 hidden h-6 w-px bg-ink-100 sm:block" />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-ink-100"
            >
              <Avatar avatar={user?.avatar} name={user?.nickname || user?.email} size={28} />
              <span className="hidden text-sm text-ink-700 sm:inline">
                {user?.nickname || user?.email}
              </span>
            </button>
            <button
              onClick={() => logout()}
              className="text-sm text-ink-500 transition hover:text-ink-900"
            >
              Kilépés
            </button>
          </div>
        </div>

        {/* Row 2: mobile only - nav links + the "new item" action. Scrolls
            horizontally as a fallback rather than ever clipping a control,
            though at typical phone widths it all fits without scrolling. */}
        <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:hidden">
          <NavLink to="/" label="Kezdőlap" active={location.pathname === "/"} compact />
          <NavLink to="/ugyfelek" label="Ügyfelek" active={isCustomers} compact />
          <NavLink
            to="/feladatok"
            label="Feladatok"
            active={location.pathname === "/feladatok"}
            compact
          />
          {isCustomers && onNewCustomer && (
            <button
              onClick={onNewCustomer}
              className="ml-auto shrink-0 rounded-lg bg-night px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
            >
              + Ügyfél
            </button>
          )}
        </div>
      </div>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
