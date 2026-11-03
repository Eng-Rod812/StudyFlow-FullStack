"use strict";

const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

const fields = "id, title, completed, created_at, updated_at";

async function list(req, res) {
  const result = await pool.query(
    `SELECT ${fields} FROM tasks WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
    [req.userId],
  );
  res.json({ tasks: result.rows });
}

async function create(req, res) {
  const { title } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.trim().length > 140) {
    throw new HttpError(400, "El título debe tener entre 1 y 140 caracteres.");
  }
  const result = await pool.query(
    `INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING ${fields}`,
    [req.userId, title.trim()],
  );
  res.status(201).json({ task: result.rows[0] });
}

async function update(req, res) {
  const { title, completed } = req.body;
  const result = await pool.query(
    `UPDATE tasks
        SET title = COALESCE($1::varchar, title),
            completed = COALESCE($2::boolean, completed),
            updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING ${fields}`,
    [title === undefined ? null : title.trim(), completed === undefined ? null : completed, req.taskId, req.userId],
  );
  if (!result.rows[0]) throw new HttpError(404, "Tarea no encontrada.");
  res.json({ task: result.rows[0] });
}

async function remove(req, res) {
  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
    [req.taskId, req.userId],
  );
  if (!result.rows[0]) throw new HttpError(404, "Tarea no encontrada.");
  res.status(204).end();
}

module.exports = { list, create, update, remove };
