"use strict";

const path = require("node:path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "16kb" }));

if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
}

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "StudyFlow API" }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api", notFound);

// Mismo servidor para frontend y API: no se necesita Live Server ni CORS en local.
const frontend = path.resolve(__dirname, "../../frontend");
app.use(express.static(frontend));
app.get("/", (req, res) => res.sendFile(path.join(frontend, "index.html")));
app.use(notFound);
app.use(errorHandler);

module.exports = app;
