"use strict";

const express = require("express");
const { register, login, me } = require("../controllers/authController");
const requireAuth = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimit");
const router = express.Router();

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);
router.get("/me", requireAuth, me);

module.exports = router;
