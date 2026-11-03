"use strict";

const express = require("express");
const requireAuth = require("../middleware/auth");
const { parseTaskId, validateTask } = require("../middleware/validate");
const tasks = require("../controllers/taskController");
const router = express.Router();

router.use(requireAuth); // Todas las tareas son privadas del usuario autenticado.
router.get("/", tasks.list);
router.post("/", tasks.create);
router.patch("/:id", parseTaskId, validateTask, tasks.update);
router.delete("/:id", parseTaskId, tasks.remove);

module.exports = router;
