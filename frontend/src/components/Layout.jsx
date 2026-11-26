import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Icon } from "./ui.jsx";

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const links = [
    { to: "/", label: "Panel", icon: "home", end: true },
    { to: "/tareas", label: "Tareas", icon: "list" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: "shield" }] : []),
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Icon name="check" /></span>StudyFlow</div>
        <nav aria-label="Principal">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link"><Icon name={l.icon} /><span>{l.label}</span></NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{isAdmin ? "Administrador" : "Estudiante"}</small></span>
          </div>
          <button className="btn ghost" onClick={() => logout()}><Icon name="out" /> Salir</button>
        </div>
      </aside>
      <main className="content" id="contenido"><Outlet /></main>
    </div>
  );
}
