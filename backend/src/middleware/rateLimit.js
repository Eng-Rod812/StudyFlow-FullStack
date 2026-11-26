"use strict";

const rateLimit = require("express-rate-limit");

// Frena ataques de fuerza bruta contra login/registro. En pruebas se desactiva con DISABLE_RATE_LIMIT.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  message: { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
});

module.exports = { authLimiter };
