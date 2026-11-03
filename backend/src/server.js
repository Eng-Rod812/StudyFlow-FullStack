"use strict";

require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes("REEMPLAZA")) {
  console.error("Configura JWT_SECRET con al menos 32 caracteres aleatorios en backend/.env");
  process.exit(1);
}

const app = require("./app");
const pool = require("./db/pool");
const initializeDatabase = require("./db/init");

const port = Number(process.env.PORT) || 3000;

async function start() {
  await initializeDatabase();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`StudyFlow Full Stack: http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close(async () => { await pool.end(); process.exit(0); });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  console.error("No se pudo iniciar la aplicación o conectar a PostgreSQL:", error.message);
  await pool.end();
  process.exit(1);
});
