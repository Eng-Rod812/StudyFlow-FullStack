import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Alert, Pagination, formatDate } from "../components/ui.jsx";

// Panel exclusivo de administradores (la ruta también se protege en el servidor con requireRole("admin")).
export default function Admin() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api("/admin/stats"), api("/admin/users", { query: { page, q, limit: 8 } })]);
      setStats(s.stats); setData(u); setError("");
    } catch (err) { setError(err.message); }
  }, [page, q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  async function changeRole(u) {
    try { await api(`/admin/users/${u.id}/role`, { method: "PATCH", body: { role: u.role === "admin" ? "user" : "admin" } }); await load(); } catch (err) { setError(err.message); }
  }
  async function remove(u) {
    if (!window.confirm(`¿Eliminar a ${u.name} y todas sus tareas? Esta acción no se puede deshacer.`)) return;
    try { await api(`/admin/users/${u.id}`, { method: "DELETE" }); await load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <header className="page-head"><h1>Administración</h1><p>Gestiona usuarios y revisa la actividad de la plataforma.</p></header>
      <Alert>{error}</Alert>
      {stats && (
        <div className="stats">
          <div className="card stat"><strong>{stats.users}</strong><span>Usuarios</span></div>
          <div className="card stat"><strong>{stats.admins}</strong><span>Admins</span></div>
          <div className="card stat"><strong>{stats.tasks}</strong><span>Tareas</span></div>
          <div className="card stat"><strong>{stats.completed_tasks}</strong><span>Completadas</span></div>
        </div>
      )}
      <section className="card">
        <label className="search wide"><input type="search" placeholder="Buscar por nombre o correo…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} maxLength={100} aria-label="Buscar usuarios" /></label>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Tareas</th><th>Alta</th><th><span className="sr">Acciones</span></th></tr></thead>
            <tbody>
              {data?.users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><small>{u.email}</small></td>
                  <td><span className={`chip ${u.role === "admin" ? "p-alta" : ""}`}>{u.role === "admin" ? "Admin" : "Usuario"}</span></td>
                  <td>{u.tasks}</td>
                  <td>{formatDate(String(u.created_at).slice(0, 10))}</td>
                  <td className="row-actions">
                    {u.id !== me.id ? (<>
                      <button className="btn ghost sm" onClick={() => changeRole(u)}>{u.role === "admin" ? "Quitar admin" : "Hacer admin"}</button>
                      <button className="btn danger sm" onClick={() => remove(u)}>Eliminar</button>
                    </>) : <small>Tú</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.users.length === 0 && <p className="empty">Sin resultados.</p>}
        <Pagination meta={data?.pagination} onPage={setPage} />
      </section>
    </>
  );
}
