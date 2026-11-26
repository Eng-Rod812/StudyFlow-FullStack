"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("./pool");

async function initializeDatabase() {
  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  // La cuenta con ADMIN_EMAIL siempre queda con rol admin (bootstrap del primer administrador).
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (adminEmail) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 AND role <> 'admin'", [adminEmail]);
  }
}

module.exports = initializeDatabase;
