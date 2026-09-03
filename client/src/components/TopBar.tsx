import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ProfileModal } from "./ProfileModal";

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-2 text-sm font-medium transition"
      style={{
        color: active ? "#14171c" : "#6b7280",
        backgroundColor: active ? "#eef0f3" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

export function TopBar({ onNewCustomer }: { onNewCustomer?: () => void }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-ink-50/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5">
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

          <nav className="flex items-center gap-1">
            <NavLink to="/" label="Ügyfelek" active={location.pathname === "/"} />
            <NavLink
              to="/feladatok"
              label="Feladatok"
              active={location.pathname === "/feladatok"}
            />
            {user?.role === "superadmin" && (
              <NavLink
                to="/felhasznalok"
                label="Felhasználók"
                active={location.pathname === "/felhasznalok"}
              />
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {location.pathname === "/" && onNewCustomer && (
            <button
              onClick={onNewCustomer}
              className="rounded-lg bg-ink-950 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              + Új ügyfél
            </button>
          )}
          <div className="mx-1 h-6 w-px bg-ink-100" />
          <button
            onClick={() => setProfileOpen(true)}
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

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  );
}
