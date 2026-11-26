"use strict";

const HttpError = require("./httpError");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function toPositiveInt(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, `El parámetro '${name}' debe ser un entero positivo.`);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new HttpError(400, `El parámetro '${name}' debe ser un entero positivo.`);
  }
  return n;
}

// Convierte ?page=&limit= en {page, limit, offset} con tope para no sobrecargar la BD.
function parsePagination(query) {
  const page = toPositiveInt(query.page, "page", 1);
  const limit = Math.min(toPositiveInt(query.limit, "limit", DEFAULT_LIMIT), MAX_LIMIT);
  return { page, limit, offset: (page - 1) * limit };
}

function buildMeta(total, { page, limit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

// Escapa % _ \ para que una búsqueda del usuario no actúe como comodín de LIKE.
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

module.exports = { parsePagination, buildMeta, escapeLike, DEFAULT_LIMIT, MAX_LIMIT };
