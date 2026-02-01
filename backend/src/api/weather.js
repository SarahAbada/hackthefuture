const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/weather", async (req, res) => {
  const weather = req.body;

  await pool.query(
    `
    INSERT INTO weather_snapshots (timestamp, raw_json)
    VALUES (NOW(), $1)
    `,
    [weather]
  );

  res.json({ status: "weather stored" });
});

module.exports = router;
