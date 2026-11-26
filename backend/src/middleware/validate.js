"use strict";

const HttpError = require("../utils/httpError");

const PRIORITIES = ["baja", "media", "alta"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isPlainObject(body) {
  return body !== null && typeof body === "object" && !Array.isArray(body);
}

// ---- Tareas (POST y PATCH comparten reglas; PATCH exige al menos un campo) ----
function buildTaskValidator(partial) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) return next(new HttpError(400, "El cuerpo debe ser un objeto JSON."));
    const { title, completed, priority, due_date: dueDate, cost_usd: cost } = req.body;
    const provided = [title, completed, priority, dueDate, cost].some((v) => v !== undefined);
    if (partial && !provided) {
      return next(new HttpError(400, "Proporciona al menos un campo para actualizar."));
    }
    if ((!partial || title !== undefined) && (typeof title !== "string" || !title.trim() || title.trim().length > 140)) {
      return next(new HttpError(400, "El título debe tener entre 1 y 140 caracteres."));
    }
    if (completed !== undefined && typeof completed !== "boolean") {
      return next(new HttpError(400, "El estado 'completed' debe ser true o false."));
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return next(new HttpError(400, "La prioridad debe ser baja, media o alta."));
    }
    if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
      return next(new HttpError(400, "La fecha límite debe tener formato AAAA-MM-DD."));
    }
    if (cost !== undefined && cost !== null && (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > 99999999)) {
      return next(new HttpError(400, "El costo en USD debe ser un número entre 0 y 99,999,999."));
    }
    next();
  };
}

const validateTaskCreate = buildTaskValidator(false);
const validateTask = buildTaskValidator(true);

// ---- Consulta de tareas: filtros permitidos (lista blanca) ----
const STATUSES = ["all", "pending", "completed"];
const SORTS = ["created_at", "due_date", "title", "priority"];
const ORDERS = ["asc", "desc"];

function validateTaskQuery(req, res, next) {
  const { status, priority, sort, order, q } = req.query;
  for (const [name, value] of Object.entries({ status, priority, sort, order, q })) {
    if (value !== undefined && typeof value !== "string") {
      return next(new HttpError(400, `El parámetro '${name}' es inválido.`));
    }
  }
  if (status !== undefined && !STATUSES.includes(status)) return next(new HttpError(400, "status debe ser all, pending o completed."));
  if (priority !== undefined && priority !== "" && !PRIORITIES.includes(priority)) return next(new HttpError(400, "priority debe ser baja, media o alta."));
  if (sort !== undefined && !SORTS.includes(sort)) return next(new HttpError(400, `sort debe ser uno de: ${SORTS.join(", ")}.`));
  if (order !== undefined && !ORDERS.includes(order)) return next(new HttpError(400, "order debe ser asc o desc."));
  if (q !== undefined && q.length > 100) return next(new HttpError(400, "La búsqueda admite máximo 100 caracteres."));
  next();
}

// ---- Parámetro :id genérico ----
function parseId(req, res, next) {
  const raw = req.params.id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id <= 0) {
    return next(new HttpError(400, "ID inválido."));
  }
  req.targetId = id;
  req.taskId = id; // compatibilidad con el avance
  next();
}

// ---- Autenticación ----
function validateRegister(req, res, next) {
  if (!isPlainObject(req.body)) return next(new HttpError(400, "El cuerpo debe ser un objeto JSON."));
  const { name, email, password } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    return next(new HttpError(400, "Escribe un nombre de 1 a 80 caracteres."));
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return next(new HttpError(400, "Introduce un correo válido."));
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return next(new HttpError(400, "La contraseña debe tener entre 8 y 72 caracteres."));
  }
  next();
}

function validateLogin(req, res, next) {
  if (!isPlainObject(req.body)) return next(new HttpError(400, "El cuerpo debe ser un objeto JSON."));
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return next(new HttpError(400, "Introduce tu correo y contraseña."));
  }
  next();
}

function validateRoleChange(req, res, next) {
  const role = isPlainObject(req.body) ? req.body.role : undefined;
  if (!["user", "admin"].includes(role)) return next(new HttpError(400, "El rol debe ser 'user' o 'admin'."));
  next();
}

module.exports = {
  validateTask, validateTaskCreate, validateTaskQuery, parseId, parseTaskId: parseId,
  validateRegister, validateLogin, validateRoleChange, isValidDate,
};
