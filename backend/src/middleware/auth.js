"use strict";

const jwt = require("jsonwebtoken");
const HttpError = require("../utils/httpError");

function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return next(new HttpError(401, "Se requiere iniciar sesión."));
  }
  try {
    const token = header.substring(7).trim();
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub) || !Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) <= 0) {
      throw new Error("Identificador inválido");
    }
    req.userId = Number(payload.sub);
    next();
  } catch (error) {
    next(new HttpError(401, "Sesión inválida o vencida. Inicia sesión nuevamente."));
  }
}

module.exports = requireAuth;
