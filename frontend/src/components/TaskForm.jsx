import { useState } from "react";
import { Alert, Icon } from "./ui.jsx";

// Formulario de alta rápida de tarea (título, prioridad, fecha límite y costo en USD).
export default function TaskForm({ onCreate }) {
  const empty = { title: "", priority: "media", due_date: "", cost_usd: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await onCreate({
        title: form.title, priority: form.priority,
        due_date: form.due_date || null,
        cost_usd: form.cost_usd === "" ? null : Number(form.cost_usd),
      });
      setForm(empty);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form className="card task-form" onSubmit={submit}>
      <Alert>{error}</Alert>
      <div className="task-form-row">
        <label className="grow">Nueva tarea
          <input value={form.title} onChange={set("title")} maxLength={140} placeholder="Ej. Entregar reto final de Full Stack" required />
        </label>
        <label>Prioridad
          <select value={form.priority} onChange={set("priority")}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select>
        </label>
        <label>Fecha límite<input type="date" value={form.due_date} onChange={set("due_date")} /></label>
        <label>Costo (USD)<input type="number" min="0" step="0.01" value={form.cost_usd} onChange={set("cost_usd")} placeholder="0.00" inputMode="decimal" /></label>
        <button className="btn primary" disabled={busy}><Icon name="plus" /> Agregar</button>
      </div>
    </form>
  );
}
