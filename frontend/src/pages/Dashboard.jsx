import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Alert, Icon, PRIORITY_LABEL, ProgressRing, dueState, formatDate, money } from "../components/ui.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api("/tasks", { query: { status: "pending", sort: "due_date", order: "asc", limit: 5 } }).then((d) => alive && setTasks(d)).catch((e) => alive && setError(e.message));
    api("/tasks/budget").then((d) => alive && setBudget(d)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const s = tasks?.summary;

  return (
    <>
      <header className="page-head"><h1>{greeting}, {user.name.split(" ")[0]}</h1><p>Esto es lo que sigue en tu semestre.</p></header>
      <Alert>{error}</Alert>
      <div className="grid-2">
        <section className="card center">
          <h2>Tu progreso</h2>
          {s ? <ProgressRing value={s.completed} total={s.total} /> : <p className="empty">Cargando…</p>}
          {s && s.total === 0 && <p className="muted">Agrega tu primera tarea para empezar.</p>}
        </section>
        <section className="card budget">
          <h2>Presupuesto de estudio</h2>
          {budget ? (
            <>
              <p className="big">{budget.pendingMxn !== null ? money(budget.pendingMxn, "MXN") : money(budget.pendingUsd, "USD")}</p>
              <p className="muted">por pagar en tareas pendientes{budget.pendingMxn !== null ? ` (${money(budget.pendingUsd, "USD")})` : ""}</p>
              {budget.exchange
                ? <p className="fx-note">1 USD = {budget.exchange.rate.toFixed(4)} MXN · {budget.exchange.source} · {budget.exchange.date}</p>
                : <Alert kind="info">{budget.warning}</Alert>}
            </>
          ) : <p className="empty">Cargando…</p>}
        </section>
      </div>
      <section className="card">
        <div className="row-between"><h2>Próximas entregas</h2><Link to="/tareas?status=pending&sort=due_date&order=asc" className="link">Ver todas</Link></div>
        {tasks && tasks.tasks.length > 0 ? (
          <ul className="tasks compact">
            {tasks.tasks.map((t) => (
              <li key={t.id} className="task">
                <div className="task-main">
                  <Link to={`/tareas/${t.id}`} className="task-title">{t.title}</Link>
                  <div className="chips">
                    <span className={`chip p-${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span>
                    {t.due_date ? <span className={`chip due ${dueState(t.due_date, false)}`}><Icon name="calendar" size={13} /> {formatDate(t.due_date)}</span> : <span className="chip">Sin fecha</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="empty">{tasks ? "No tienes tareas pendientes. 🎉" : "Cargando…"}</p>}
      </section>
    </>
  );
}
