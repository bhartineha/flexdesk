import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { FloorplanMatrixPage } from "./pages/FloorplanMatrixPage";
import { TeamSynchronizerPage } from "./pages/TeamSynchronizerPage";
import { CapacityMonitorPage } from "./pages/CapacityMonitorPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/floorplan" replace />} />
        <Route path="/floorplan" element={<FloorplanMatrixPage />} />
        <Route path="/team-sync" element={<TeamSynchronizerPage />} />
        <Route path="/capacity" element={<CapacityMonitorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
