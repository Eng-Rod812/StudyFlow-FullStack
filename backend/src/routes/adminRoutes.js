"use strict";

const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { parseId, validateRoleChange } = require("../middleware/validate");
const admin = require("../controllers/adminController");
const router = express.Router();

router.use(requireAuth, requireRole("admin")); // Sección exclusiva de administradores.
router.get("/stats", admin.stats);
router.get("/users", admin.listUsers);
router.patch("/users/:id/role", parseId, validateRoleChange, admin.changeRole);
router.delete("/users/:id", parseId, admin.removeUser);

module.exports = router;
