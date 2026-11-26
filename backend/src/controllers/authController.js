"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

const formatUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role });

// El rol viaja en el token solo como dato informativo para la interfaz;
// el servidor autoriza siempre con el rol guardado en la BD (ver middleware/auth.js).
function generateToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
}

async function register(req, res) {
  const { name, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const role = adminEmail && normalizedEmail === adminEmail ? "admin" : "user";
  const hash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name.trim(), normalizedEmail, hash, role],
    );
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "Este correo ya está registrado.");
    throw error;
  }
  const user = formatUser(result.rows[0]);
  res.status(201).json({ message: "Cuenta creada.", user, token: generateToken(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const result = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  const user = result.rows[0];
  const valid = user && await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new HttpError(401, "Correo o contraseña incorrectos.");
  res.json({ message: "Inicio de sesión correcto.", user: formatUser(user), token: generateToken(user) });
}

async function me(req, res) {
  const result = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [req.userId]);
  if (!result.rows[0]) throw new HttpError(401, "Usuario no encontrado.");
  res.json({ user: formatUser(result.rows[0]) });
}

module.exports = { register, login, me };
