import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tasks from "./pages/Tasks.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import Admin from "./pages/Admin.jsx";
import NotFound from "./pages/NotFound.jsx";

// Ruta protegida: exige sesión (y opcionalmente rol admin). Guarda la ruta pedida para volver tras el login.
function Protected({ adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Rutas públicas (login/registro): si ya hay sesión, se redirige al panel.
function PublicOnly() {
  const { user } = useAuth();
  const location = useLocation();
  // Tras iniciar sesión, vuelve a la ruta que el usuario intentaba abrir (si existe).
  return user ? <Navigate to={location.state?.from || "/"} replace /> : <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
      </Route>
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tareas" element={<Tasks />} />
          <Route path="tareas/:id" element={<TaskDetail />} />
          <Route element={<Protected adminOnly />}>
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
