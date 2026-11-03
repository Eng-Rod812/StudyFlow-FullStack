"use strict";

const HttpError = require("../utils/httpError");

function validateTask(req, res, next) {
  const { title, completed } = req.body || {};
  if (title === undefined && completed === undefined) {
    return next(new HttpError(400, "Proporciona un título o un estado para actualizar."));
  }
  if (title !== undefined && (typeof title !== "string" || !title.trim() || title.trim().length > 140)) {
    return next(new HttpError(400, "El título debe tener entre 1 y 140 caracteres."));
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    return next(new HttpError(400, "El estado 'completed' debe ser true o false."));
  }
  next();
}

function parseTaskId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0 || !/^\d+$/.test(req.params.id)) {
    return next(new HttpError(400, "ID de tarea inválido."));
  }
  req.taskId = id;
  next();
}

module.exports = { validateTask, parseTaskId };
