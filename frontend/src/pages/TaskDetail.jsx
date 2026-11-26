import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Alert, Icon, formatDate, money } from "../components/ui.jsx";

// Ruta dinámica /tareas/:id — React Router entrega el parámetro con useParams.
export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [rate, setRate] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setForm(null); setError("");
    api(`/tasks/${id}`).then(({ task }) => alive && setForm({ ...task, due_date: task.due_date || "", cost_usd: task.cost_usd ?? "" }))
      .catch((err) => alive && setError(err.status === 404 || err.status === 400 ? "Esta tarea no existe." : err.message));
    api("/external/exchange-rate", { query: { from: "USD", to: "MXN" } }).then((r) => alive && setRate(r)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const set = (k) => (e) => { setSaved(false); setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }); };

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const { task } = await api(`/tasks/${id}`, { method: "PATCH", body: {
        title: form.title, completed: form.completed, priority: form.priority,
        due_date: form.due_date || null, cost_usd: form.cost_usd === "" ? null : Number(form.cost_usd),
      } });
      setForm({ ...task, due_date: task.due_date || "", cost_usd: task.cost_usd ?? "" });
      setSaved(true);
    } catch (err) { setError(err.message); }
  }
  async function remove() {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    try { await api(`/tasks/${id}`, { method: "DELETE" }); navigate("/tareas", { replace: true }); } catch (err) { setError(err.message); }
  }

  if (!form) {
    return (
      <>
        <Link className="back" to="/tareas"><Icon name="back" /> Volver</Link>
        {error ? <Alert>{error}</Alert> : <p className="empty">Cargando…</p>}
      </>
    );
  }
  const cost = form.cost_usd === "" ? null : Number(form.cost_usd);
  return (
    <>
      <Link className="back" to="/tareas"><Icon name="back" /> Volver a tareas</Link>
      <header className="page-head"><h1>Editar tarea</h1><p>Creada el {formatDate(String(form.created_at).slice(0, 10))}</p></header>
      <form className="card form-grid" onSubmit={save}>
        <Alert>{error}</Alert>
        <Alert kind="ok">{saved ? "Cambios guardados." : ""}</Alert>
        <label className="full">Título<input value={form.title} onChange={set("title")} maxLength={140} required /></label>
        <label>Prioridad<select value={form.priority} onChange={set("priority")}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></label>
        <label>Fecha límite<input type="date" value={form.due_date} onChange={set("due_date")} /></label>
        <label>Costo (USD)<input type="number" min="0" step="0.01" value={form.cost_usd} onChange={set("cost_usd")} inputMode="decimal" /></label>
        <div className="fx">
          {cost !== null && rate ? <><span>Equivale a</span><strong>{money(cost * rate.rate, "MXN")}</strong><small>1 USD = {rate.rate.toFixed(4)} MXN · {rate.date}</small></>
            : cost !== null ? <small>Tipo de cambio no disponible por ahora.</small> : <small>Agrega un costo para ver su equivalente en pesos.</small>}
        </div>
        <label className="check full"><input type="checkbox" checked={form.completed} onChange={set("completed")} /> Tarea completada</label>
        <div className="actions full">
          <button className="btn primary">Guardar cambios</button>
          <button type="button" className="btn danger" onClick={remove}><Icon name="trash" /> Eliminar</button>
        </div>
      </form>
    </>
  );
}
