import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Board from "./pages/Board";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-100 border-t-brand-500" />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (user.mustChangePassword) {
    return (
      <Routes>
        <Route path="*" element={<ChangePassword />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Board />} />
      <Route path="/feladatok" element={<Tasks />} />
      <Route path="/beallitasok" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
