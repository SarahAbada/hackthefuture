const express = require("express");
const pool = require("../db");
const { mean, stdDev } = require("../stats");

const router = express.Router();

router.get("/predict", async (req, res) => {
  const { route, stop } = req.query;

  const result = await pool.query(
    `
    SELECT delay_minutes
    FROM historical_arrivals
    WHERE stop_id = $1
    `,
    [stop]
  );

  const delays = result.rows.map(r => r.delay_minutes);

  if (delays.length === 0) {
    return res.status(404).json({ error: "No historical data" });
  }

  const μ = mean(delays);
  const σ = stdDev(delays, μ);

  res.json({
    route_id: route,
    stop_id: stop,
    predicted_delay_minutes: {
      mean: Number(μ.toFixed(2)),
      std_dev: Number(σ.toFixed(2))
    }
  });
});

module.exports = router;
