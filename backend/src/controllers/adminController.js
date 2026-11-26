"use strict";

const pool = require("../db/pool");
const HttpError = require("../utils/httpError");
const { parsePagination, buildMeta, escapeLike } = require("../utils/pagination");

async function listUsers(req, res) {
  const pageInfo = parsePagination(req.query);
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const params = [];
  let where = "";
  if (q) { params.push(`%${escapeLike(q)}%`); where = "WHERE u.name ILIKE $1 OR u.email ILIKE $1"; }
  const total = await pool.query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
  const rows = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, COUNT(t.id)::int AS tasks
       FROM users u LEFT JOIN tasks t ON t.user_id = u.id
       ${where}
      GROUP BY u.id ORDER BY u.id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageInfo.limit, pageInfo.offset],
  );
  res.json({ users: rows.rows, pagination: buildMeta(total.rows[0].total, pageInfo) });
}

async function stats(req, res) {
  const result = await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM users) AS users,
            (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admins,
            (SELECT COUNT(*)::int FROM tasks) AS tasks,
            (SELECT COUNT(*)::int FROM tasks WHERE completed) AS completed_tasks`,
  );
  res.json({ stats: result.rows[0] });
}

async function changeRole(req, res) {
  if (req.targetId === req.userId) throw new HttpError(400, "No puedes cambiar tu propio rol.");
  const result = await pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
    [req.body.role, req.targetId],
  );
  if (!result.rows[0]) throw new HttpError(404, "Usuario no encontrado.");
  res.json({ user: result.rows[0] });
}

async function removeUser(req, res) {
  if (req.targetId === req.userId) throw new HttpError(400, "No puedes eliminar tu propia cuenta de administrador.");
  const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.targetId]);
  if (!result.rows[0]) throw new HttpError(404, "Usuario no encontrado.");
  res.status(204).end();
}

module.exports = { listUsers, stats, changeRole, removeUser };
