import { Link } from "react-router-dom";
import { Icon, PRIORITY_LABEL, dueState, formatDate, money } from "./ui.jsx";

export default function TaskItem({ task, onToggle, onDelete }) {
  const due = dueState(task.due_date, task.completed);
  return (
    <li className={`task ${task.completed ? "done" : ""}`}>
      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} aria-label={`Marcar «${task.title}» como ${task.completed ? "pendiente" : "completada"}`} />
      <div className="task-main">
        <Link to={`/tareas/${task.id}`} className="task-title">{task.title}</Link>
        <div className="chips">
          <span className={`chip p-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.due_date && <span className={`chip due ${due}`}><Icon name="calendar" size={13} /> {formatDate(task.due_date)}{due === "late" ? " · vencida" : due === "soon" ? " · pronto" : ""}</span>}
          {task.cost_usd !== null && <span className="chip">{money(task.cost_usd, "USD")}</span>}
        </div>
      </div>
      <div className="task-actions">
        <Link className="icon-btn" to={`/tareas/${task.id}`} aria-label={`Editar «${task.title}»`}><Icon name="edit" /></Link>
        <button className="icon-btn danger" onClick={() => onDelete(task)} aria-label={`Eliminar «${task.title}»`}><Icon name="trash" /></button>
      </div>
    </li>
  );
}
