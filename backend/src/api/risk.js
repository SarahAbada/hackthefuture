// api/risk.js
const express = require("express");
const pool = require("../db");
const { mean, stdDev } = require("../stats"); // reuse your stats helpers

const router = express.Router();

// Weight configuration (can be adjusted later)
const WEIGHTS = {
  historical: 0.4,
  weather: 0.2,
  traffic: 0.2,
  routeFeatures: 0.2,
};

// Example simple mapping functions
function mapDelayToRisk(delay, μ, σ) {
  // z-score normalized, then clamped to [0,1]
  const z = (delay - μ) / (σ || 1);
  return Math.min(Math.max(z / 3, 0), 1); // ~99% of values within ±3σ
}

function mapWeatherToRisk(weather) {
  // crude example: snow + wind increases risk
  let risk = 0;
  if (weather.condition.toLowerCase().includes("snow")) risk += 0.5;
  if (weather.wind_kph > 20) risk += 0.3;
  if (weather.temperature_c < -10) risk += 0.2;
  return Math.min(risk, 1);
}

function mapTrafficToRisk(congestion_level) {
  return Math.min(Math.max(congestion_level / 10, 0), 1); // assume congestion_level 0–10
}

function mapRouteFeaturesToRisk(route) {
  // combine construction, slope, snow sensitivity
  const score = ((route.construction_risk || 0.1) +
                 (route.avg_road_slope || 0.1) +
                 (route.snow_sensitivity || 0.1)) / 3;
  return Math.min(score, 1);
}

// Main route
router.get("/risk", async (req, res) => {
  try {
    const { route_id, stop_id } = req.query;
    if (!route_id || !stop_id) return res.status(400).json({ error: "route_id & stop_id required" });

    // 1️⃣ Historical delay
    const histRes = await pool.query(
      `SELECT delay_minutes FROM historical_arrivals ha
       JOIN trips t ON ha.trip_id = t.trip_id
       WHERE t.route_id = $1 AND ha.stop_id = $2`,
      [route_id, stop_id]
    );
    const delays = histRes.rows.map(r => r.delay_minutes);
    const μ = mean(delays);
    const σ = stdDev(delays, μ);
    const historicalRisk = delays.length > 0 ? mapDelayToRisk(μ + σ, μ, σ) : 0.1;

    // 2️⃣ Latest weather
    const weatherRes = await pool.query(
      `SELECT raw_json FROM weather_snapshots ORDER BY timestamp DESC LIMIT 1`
    );
    const weather = weatherRes.rows[0]?.raw_json || {};
    const weatherRisk = mapWeatherToRisk(weather);

    // 3️⃣ Traffic
    const hour = new Date().getHours();
    const dayType = ["Sunday","Saturday"].includes(new Date().toLocaleString("en-US", { weekday: "long" })) ? "weekend" : "weekday";
    const trafficRes = await pool.query(
      `SELECT congestion_level FROM traffic_profiles WHERE route_id=$1 AND hour_of_day=$2 AND day_type=$3 LIMIT 1`,
      [route_id, hour, dayType]
    );
    const trafficRisk = trafficRes.rows[0]?.congestion_level ? mapTrafficToRisk(trafficRes.rows[0].congestion_level) : 0.1;

    // 4️⃣ Route features
    const routeRes = await pool.query(`SELECT * FROM routes WHERE route_id=$1`, [route_id]);
    const route = routeRes.rows[0];
    const routeRisk = route ? mapRouteFeaturesToRisk(route) : 0.1;

    // Weighted sum
    const totalRisk = WEIGHTS.historical * historicalRisk +
                      WEIGHTS.weather * weatherRisk +
                      WEIGHTS.traffic * trafficRisk +
                      WEIGHTS.routeFeatures * routeRisk;

    res.json({
      route_id,
      stop_id,
      risk_score: Number((totalRisk * 100).toFixed(1)) // 0–100%
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
