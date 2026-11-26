"use strict";

const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const { parsePagination, buildMeta, escapeLike } = require("../utils/pagination");
const { getRate } = require("../services/exchangeRate");

const FIELDS = "id, title, completed, priority, to_char(due_date, 'YYYY-MM-DD') AS due_date, cost_usd::float8 AS cost_usd, created_at, updated_at";

// Lista blanca de columnas ordenables: evita inyección SQL por el parámetro sort.
const SORT_SQL = {
  created_at: "created_at",
  due_date: "due_date",
  title: "LOWER(title)",
  priority: "CASE priority WHEN 'alta' THEN 3 WHEN 'media' THEN 2 ELSE 1 END",
};

// GET /api/tasks?status=&priority=&q=&sort=&order=&page=&limit=
async function list(req, res) {
  const pageInfo = parsePagination(req.query);
  const { status = "all", priority, q, sort = "created_at", order = "desc" } = req.query;

  const where = ["user_id = $1"];
  const params = [req.userId];
  if (status === "pending") where.push("completed = FALSE");
  if (status === "completed") where.push("completed = TRUE");
  if (priority) { params.push(priority); where.push(`priority = $${params.length}`); }
  if (q && q.trim()) { params.push(`%${escapeLike(q.trim())}%`); where.push(`title ILIKE $${params.length}`); }
  const whereSql = where.join(" AND ");

  const direction = order === "asc" ? "ASC" : "DESC";
  const orderSql = `${SORT_SQL[sort]} ${direction} NULLS LAST, id DESC`;

  const [count, rows, summary] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM tasks WHERE ${whereSql}`, params),
    pool.query(
      `SELECT ${FIELDS} FROM tasks WHERE ${whereSql} ORDER BY ${orderSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageInfo.limit, pageInfo.offset],
    ),
    pool.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE completed)::int AS completed FROM tasks WHERE user_id = $1",
      [req.userId],
    ),
  ]);

  const { total, completed } = summary.rows[0];
  res.json({
    tasks: rows.rows,
    pagination: buildMeta(count.rows[0].total, pageInfo),
    summary: { total, completed, pending: total - completed },
  });
}

async function getOne(req, res) {
  const result = await pool.query(`SELECT ${FIELDS} FROM tasks WHERE id = $1 AND user_id = $2`, [req.targetId, req.userId]);
  if (!result.rows[0]) throw new HttpError(404, "Tarea no encontrada.");
  res.json({ task: result.rows[0] });
}

async function create(req, res) {
  const { title, priority = "media", due_date: dueDate = null, cost_usd: cost = null } = req.body;
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title, priority, due_date, cost_usd) VALUES ($1, $2, $3, $4, $5) RETURNING ${FIELDS}`,
    [req.userId, title.trim(), priority, dueDate, cost],
  );
  res.status(201).json({ task: result.rows[0] });
}

// PATCH parcial: solo se modifican los campos enviados (null explícito borra fecha/costo).
async function update(req, res) {
  const body = req.body;
  const sets = [];
  const params = [];
  const add = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };
  if (body.title !== undefined) add("title", body.title.trim());
  if (body.completed !== undefined) add("completed", body.completed);
  if (body.priority !== undefined) add("priority", body.priority);
  if (body.due_date !== undefined) add("due_date", body.due_date);
  if (body.cost_usd !== undefined) add("cost_usd", body.cost_usd);
  params.push(req.targetId, req.userId);
  const result = await pool.query(
    `UPDATE tasks SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING ${FIELDS}`,
    params,
  );
  if (!result.rows[0]) throw new HttpError(404, "Tarea no encontrada.");
  res.json({ task: result.rows[0] });
}

async function remove(req, res) {
  const result = await pool.query("DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id", [req.targetId, req.userId]);
  if (!result.rows[0]) throw new HttpError(404, "Tarea no encontrada.");
  res.status(204).end();
}

// GET /api/tasks/budget: usa la API externa para convertir el costo pendiente de USD a MXN.
async function budget(req, res) {
  const sums = await pool.query(
    `SELECT COALESCE(SUM(cost_usd) FILTER (WHERE completed = FALSE), 0)::float8 AS pending_usd,
            COALESCE(SUM(cost_usd), 0)::float8 AS total_usd
       FROM tasks WHERE user_id = $1`,
    [req.userId],
  );
  const { pending_usd: pendingUsd, total_usd: totalUsd } = sums.rows[0];
  let exchange = null;
  let warning = null;
  try {
    exchange = await getRate("USD", "MXN");
  } catch (error) {
    if (!error.status || error.status < 500) throw error;
    warning = error.message; // la API externa falló: se devuelve el dato local sin conversión
  }
  const round = (n) => Math.round(n * 100) / 100;
  res.json({
    pendingUsd, totalUsd,
    pendingMxn: exchange ? round(pendingUsd * exchange.rate) : null,
    totalMxn: exchange ? round(totalUsd * exchange.rate) : null,
    exchange, warning,
  });
}

module.exports = { list, getOne, create, update, remove, budget };
