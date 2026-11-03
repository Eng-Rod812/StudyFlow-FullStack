"use strict";

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL. Copia backend/.env.example como backend/.env y configúrala.");
}

// Para TLS remoto se puede agregar ?sslmode=require a DATABASE_URL.
// No se desactiva la verificación de certificados TLS.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = pool;
