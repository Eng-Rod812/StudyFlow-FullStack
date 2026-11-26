"use strict";

// Integración con la API externa REST Frankfurter (https://frankfurter.dev):
// gratuita, sin clave, datos del Banco Central Europeo.
const HttpError = require("../utils/httpError");

const BASE_URL = process.env.EXCHANGE_API_URL || "https://api.frankfurter.dev/v1";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

function clearCache() { cache.clear(); }

async function getRate(from = "USD", to = "MXN") {
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    throw new HttpError(400, "Los códigos de moneda deben tener 3 letras mayúsculas (ej. USD, MXN).");
  }
  if (from === to) return { from, to, rate: 1, date: new Date().toISOString().slice(0, 10), source: "Frankfurter", cached: false };

  const key = `${from}_${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.data, cached: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${BASE_URL}/latest?base=${from}&symbols=${to}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new HttpError(502, "No se pudo contactar al servicio de tipo de cambio. Inténtalo más tarde.");
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 404 || response.status === 422) {
    throw new HttpError(400, "Moneda no soportada por el servicio de tipo de cambio.");
  }
  if (!response.ok) throw new HttpError(502, "El servicio de tipo de cambio respondió con un error.");

  let body;
  try { body = await response.json(); } catch (error) {
    throw new HttpError(502, "Respuesta inválida del servicio de tipo de cambio.");
  }
  const rate = body && body.rates ? body.rates[to] : undefined;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new HttpError(502, "Respuesta inesperada del servicio de tipo de cambio.");
  }
  const data = { from, to, rate, date: typeof body.date === "string" ? body.date : null, source: "Frankfurter (BCE)" };
  cache.set(key, { at: Date.now(), data });
  return { ...data, cached: false };
}

module.exports = { getRate, clearCache };
