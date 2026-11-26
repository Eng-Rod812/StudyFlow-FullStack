import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import TaskForm from "../components/TaskForm.jsx";
import TaskItem from "../components/TaskItem.jsx";
import { Alert, Icon, Pagination } from "../components/ui.jsx";

const STATUS = [["all", "Todas"], ["pending", "Pendientes"], ["completed", "Completadas"]];

export default function Tasks() {
  // Filtros y página viven en la URL: se pueden compartir, recargar y usar el botón "atrás".
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "all";
  const priority = params.get("priority") || "";
  const sort = params.get("sort") || "created_at";
  const order = params.get("order") || "desc";
  const page = Number(params.get("page")) || 1;
  const urlQ = params.get("q") || "";

  const [search, setSearch] = useState(urlQ);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const update = useCallback((changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Búsqueda con retardo para no llamar a la API en cada tecla.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => update({ q: search.trim() }), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api("/tasks", { query: { status, priority, sort, order, page, q: urlQ, limit: 8 } }));
      setError("");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [status, priority, sort, order, page, urlQ]);

  useEffect(() => { load(); }, [load]);

  async function create(body) { await api("/tasks", { method: "POST", body }); await load(); }
  async function toggle(task) {
    try { await api(`/tasks/${task.id}`, { method: "PATCH", body: { completed: !task.completed } }); await load(); } catch (err) { setError(err.message); }
  }
  async function remove(task) {
    if (!window.confirm(`¿Eliminar «${task.title}»?`)) return;
    try {
      await api(`/tasks/${task.id}`, { method: "DELETE" });
      if (data.tasks.length === 1 && page > 1) update({ page: String(page - 1) }); else await load();
    } catch (err) { setError(err.message); }
  }

  const hasFilters = status !== "all" || priority || urlQ;

  return (
    <>
      <header className="page-head"><h1>Mis tareas</h1>{data && <p>{data.summary.pending} pendientes · {data.summary.completed} completadas</p>}</header>
      <TaskForm onCreate={create} />
      <section className="card toolbar" aria-label="Filtros">
        <div className="seg" role="group" aria-label="Estado">
          {STATUS.map(([v, label]) => <button key={v} className={status === v ? "on" : ""} onClick={() => update({ status: v === "all" ? "" : v })}>{label}</button>)}
        </div>
        <label className="search"><Icon name="search" /><input type="search" placeholder="Buscar tarea…" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} aria-label="Buscar" /></label>
        <select value={priority} onChange={(e) => update({ priority: e.target.value })} aria-label="Prioridad">
          <option value="">Toda prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
        </select>
        <select value={`${sort}:${order}`} onChange={(e) => { const [s, o] = e.target.value.split(":"); update({ sort: s === "created_at" && o === "desc" ? "" : s, order: s === "created_at" && o === "desc" ? "" : o }); }} aria-label="Ordenar">
          <option value="created_at:desc">Más recientes</option><option value="created_at:asc">Más antiguas</option>
          <option value="due_date:asc">Fecha límite ↑</option><option value="priority:desc">Prioridad ↓</option><option value="title:asc">Título A–Z</option>
        </select>
      </section>
      <Alert>{error}</Alert>
      <section className="card" aria-busy={loading}>
        {data && data.tasks.length > 0 ? (
          <ul className="tasks">{data.tasks.map((t) => <TaskItem key={t.id} task={t} onToggle={toggle} onDelete={remove} />)}</ul>
        ) : (
          <div className="empty">{loading ? "Cargando…" : hasFilters ? "Ninguna tarea coincide con los filtros." : "Aún no tienes tareas. ¡Agrega la primera!"}
            {hasFilters && !loading && <button className="btn ghost" onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>Limpiar filtros</button>}
          </div>
        )}
        <Pagination meta={data?.pagination} onPage={(p) => update({ page: String(p) })} />
      </section>
    </>
  );
}
