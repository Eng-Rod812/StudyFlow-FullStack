"use strict";

const express = require("express");
const requireAuth = require("../middleware/auth");
const { parseId, validateTask, validateTaskCreate, validateTaskQuery } = require("../middleware/validate");
const tasks = require("../controllers/taskController");
const router = express.Router();

router.use(requireAuth); // Todas las tareas son privadas del usuario autenticado.
router.get("/", validateTaskQuery, tasks.list);
router.get("/budget", tasks.budget);
router.get("/:id", parseId, tasks.getOne);
router.post("/", validateTaskCreate, tasks.create);
router.patch("/:id", parseId, validateTask, tasks.update);
router.delete("/:id", parseId, tasks.remove);

module.exports = router;
