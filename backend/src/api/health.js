const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});

module.exports = router;
