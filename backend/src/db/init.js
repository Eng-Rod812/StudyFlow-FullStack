"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./pool");

async function initializeDatabase() {
  // Para este prototipo, crea las tablas en la primera ejecución.
  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  await pool.query("SELECT 1");
}

module.exports = initializeDatabase;
