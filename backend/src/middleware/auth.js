"use strict";

const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

// Autenticación: valida el JWT y vuelve a consultar al usuario en la BD, así
// un usuario eliminado o con rol cambiado pierde el acceso de inmediato.
async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return next(new HttpError(401, "Se requiere iniciar sesión."));
  }
  let payload;
  try {
    payload = jwt.verify(header.substring(7).trim(), process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub) || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Identificador inválido");
    }
  } catch (error) {
    return next(new HttpError(401, "Sesión inválida o vencida. Inicia sesión nuevamente."));
  }
  try {
    const result = await pool.query("SELECT id, role FROM users WHERE id = $1", [Number(payload.sub)]);
    if (!result.rows[0]) return next(new HttpError(401, "La cuenta ya no existe."));
    req.userId = result.rows[0].id;
    req.userRole = result.rows[0].role;
    next();
  } catch (error) {
    next(error);
  }
}

// Autorización: restringe una ruta a ciertos roles (RBAC).
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return next(new HttpError(403, "No tienes permisos para realizar esta acción."));
    }
    next();
  };
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
