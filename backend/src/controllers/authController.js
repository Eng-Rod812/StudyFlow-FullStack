"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const HttpError = require("../utils/httpError");

const formatUser = (row) => ({ id: row.id, name: row.name, email: row.email });

function generateToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });
}

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    throw new HttpError(400, "Escribe un nombre de 1 a 80 caracteres.");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
    throw new HttpError(400, "Introduce un correo válido.");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    throw new HttpError(400, "La contraseña debe tener entre 8 y 72 caracteres.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name.trim(), normalizedEmail, hash],
    );
  } catch (error) {
    if (error.code === "23505") throw new HttpError(409, "Este correo ya está registrado.");
    throw error;
  }
  const user = formatUser(result.rows[0]);
  res.status(201).json({ message: "Cuenta creada.", user, token: generateToken(user.id) });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw new HttpError(400, "Introduce tu correo y contraseña.");
  }
  const result = await pool.query(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  const user = result.rows[0];
  const valid = user && await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new HttpError(401, "Correo o contraseña incorrectos.");
  res.json({ message: "Inicio de sesión correcto.", user: formatUser(user), token: generateToken(user.id) });
}

async function me(req, res) {
  const result = await pool.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [req.userId],
  );
  if (!result.rows[0]) throw new HttpError(401, "Usuario no encontrado.");
  res.json({ user: formatUser(result.rows[0]) });
}

module.exports = { register, login, me };
