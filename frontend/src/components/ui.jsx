// Piezas pequeñas reutilizables: iconos, anillo de progreso, paginación, alertas.
const paths = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  out: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  check: "M5 12.5l4.5 4.5L19 7",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16v4z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  back: "M15 5l-7 7 7 7",
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function ProgressRing({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const r = 52; const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${pct}% completado`}>
      <svg viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} className="ring-bg" />
        <circle cx="64" cy="64" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} />
      </svg>
      <div className="ring-text"><strong>{pct}%</strong><small>{value} de {total}</small></div>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Paginación">
      <button className="btn ghost" disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)}>← Anterior</button>
      <span>Página <strong>{meta.page}</strong> de {meta.totalPages} · {meta.total} resultados</span>
      <button className="btn ghost" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>Siguiente →</button>
    </nav>
  );
}

export const Alert = ({ kind = "error", children }) => (children ? <div className={`alert ${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div> : null);

export const PRIORITY_LABEL = { baja: "Baja", media: "Media", alta: "Alta" };

export const money = (n, cur) => new Intl.NumberFormat("es-MX", { style: "currency", currency: cur }).format(n);

export function dueState(due, completed) {
  if (!due || completed) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  const days = Math.round((d - today) / 86400000);
  if (days < 0) return "late";
  if (days <= 2) return "soon";
  return "";
}

export const formatDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "");
