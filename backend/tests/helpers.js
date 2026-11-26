"use strict";

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/db/pool");
const initializeDatabase = require("../src/db/init");

async function resetDb() {
  await initializeDatabase();
  await pool.query("TRUNCATE tasks, users RESTART IDENTITY CASCADE");
}

async function registerUser(name, email, password = "ClaveSegura123") {
  const res = await request(app).post("/api/auth/register").send({ name, email, password });
  return { token: res.body.token, user: res.body.user, status: res.status };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, pool, request, resetDb, registerUser, auth };
