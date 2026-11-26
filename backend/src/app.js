"use strict";

const path = require("node:path");
const fs = require("node:fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");
const externalRoutes = require("./routes/externalRoutes");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // Render usa un proxy inverso; necesario para el rate limit por IP.
app.use(helmet());
app.use(express.json({ limit: "16kb" }));

if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
}

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "StudyFlow API" }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/external", externalRoutes);
app.use("/api", notFound);

// Frontend React (build de Vite). Express sirve el mismo origen, y cualquier ruta
// que no sea /api devuelve index.html para que React Router resuelva la URL.
const dist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}
app.use(notFound);
app.use(errorHandler);

module.exports = app;
