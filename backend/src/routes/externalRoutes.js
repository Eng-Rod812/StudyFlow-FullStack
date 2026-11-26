"use strict";

const express = require("express");
const requireAuth = require("../middleware/auth");
const { exchangeRate } = require("../controllers/externalController");
const router = express.Router();

router.get("/exchange-rate", requireAuth, exchangeRate);

module.exports = router;
