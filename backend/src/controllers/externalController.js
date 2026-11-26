"use strict";

const { getRate } = require("../services/exchangeRate");

// GET /api/external/exchange-rate?from=USD&to=MXN
async function exchangeRate(req, res) {
  const from = String(req.query.from || "USD").toUpperCase();
  const to = String(req.query.to || "MXN").toUpperCase();
  res.json(await getRate(from, to));
}

module.exports = { exchangeRate };
