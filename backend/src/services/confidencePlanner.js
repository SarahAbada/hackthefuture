// services/confidencePlanner.js
const axios = require("axios");

/**
 * Compute probability of arriving on-time for a single leg
 * Optionally relative to a user target arrival time
 */
async function getLegConfidence(route_id, stop_id, targetArrivalTime) {
  const res = await axios.get("http://localhost:3000/api/risk", {
    params: { route_id, stop_id, targetArrivalTime }
  });

  const risk = res.data.risk_score / 100;

  return {
    onTimeProbability: Number(((1 - risk) * 100).toFixed(1)),
    μ: res.data.delay_model?.mean_minutes ?? null,
    σ: res.data.delay_model?.stddev_minutes ?? null
  };
}

module.exports = { getLegConfidence };
