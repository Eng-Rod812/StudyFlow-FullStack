"use strict";

const HttpError = require("../utils/httpError");

function notFound(req, res, next) {
  next(new HttpError(404, "Ruta no encontrada."));
}

// Middleware centralizado de errores (4 parámetros) — debe ir al final de la cadena.
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  // JSON mal formado o demasiado grande (body-parser)
  if (error.type === "entity.parse.failed") error = new HttpError(400, "JSON mal formado.");
  if (error.type === "entity.too.large") error = new HttpError(413, "El cuerpo de la petición es demasiado grande.");
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (status >= 500 && process.env.NODE_ENV !== "test") {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ->`, error);
  }
  res.status(status).json({ error: status >= 500 && !(error instanceof HttpError) ? "Error interno del servidor." : error.message });
}

module.exports = { notFound, errorHandler };
