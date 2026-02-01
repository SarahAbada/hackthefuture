// services/journeyPlanner.js

const MAX_ONE_LEG_RESULTS = 5;
const MAX_TWO_LEG_RESULTS = 10;

const pool = require("../db");
const { haversine } = require("../utils/geo");
const axios = require("axios");
// =====================
// Risk / Probability helpers
// =====================

async function getLegRisk(route_id, stop_id) {
  const res = await axios.get("http://localhost:3000/api/risk", {
    params: { route_id, stop_id }
  });

  // API returns 0–100, convert to 0–1
  return res.data.risk_score / 100;
}

/**
 * Combine multiple leg risks into one journey probability
 * Example:
 *   leg1 risk = 0.10
 *   leg2 risk = 0.15
 *   on-time = (1-0.10)*(1-0.15) = 0.765 = 76.5%
 */
function computeJourneyOnTimeProbability(legRisks) {
  if (legRisks.length === 0) return 1; // walking-only = 100%

  return legRisks.reduce((prob, risk) => {
    return prob * (1 - risk);
  }, 1);
}

async function findNearbyStops({ lat, lon }, maxWalkMinutes) {
  const walkSpeedMps = 1.4;
  const maxMeters = maxWalkMinutes * 60 * walkSpeedMps;

  const { rows } = await pool.query(`SELECT stop_id, lat, lon FROM stops`);

  const nearbyStops = rows
    .map(s => ({
      ...s,
      distance: haversine(lat, lon, s.lat, s.lon)
    }))
    .filter(s => s.distance <= maxMeters);

  console.log(
    "Nearby stops:",
    nearbyStops.map(s => `${s.stop_id} (${s.distance.toFixed(1)} m)`)
  );

  return nearbyStops;
}

async function findOneLegJourneys({
  start,
  end,
  targetArrivalTime,
  maxWalkMinutes
}) {
  const startStops = await findNearbyStops(start, maxWalkMinutes);
  const endStops   = await findNearbyStops(end, maxWalkMinutes);

  if (startStops.length === 0 || endStops.length === 0) return [];

  const startIds = startStops.map(s => s.stop_id);
  const endIds   = endStops.map(s => s.stop_id);

  const { rows } = await pool.query(`
    SELECT
      t.trip_id,
      t.route_id,
      ha_start.stop_id AS start_stop,
      ha_end.stop_id   AS end_stop,
      ha_end.scheduled_arrival
    FROM historical_arrivals ha_start
    JOIN historical_arrivals ha_end
      ON ha_start.trip_id = ha_end.trip_id
    JOIN trips t ON t.trip_id = ha_start.trip_id
    WHERE ha_start.stop_id = ANY($1)
      AND ha_end.stop_id   = ANY($2)
      AND ha_start.scheduled_arrival < ha_end.scheduled_arrival
      AND ha_end.scheduled_arrival <= $3
  `, [startIds, endIds, targetArrivalTime]);

  const seen = new Set();
  const deduped = [];
  for (const r of rows) {  
    const key = `${r.trip_id}|${r.start_stop}|${r.end_stop}|${r.scheduled_arrival.toISOString()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  
  deduped.sort(
    (a, b) => new Date(a.scheduled_arrival) - new Date(b.scheduled_arrival)
  );

  deduped.splice(MAX_ONE_LEG_RESULTS);
  
return Promise.all(
  deduped.map(async (r, i) => {

    const transitStops = [
      r.start_stop,
      r.end_stop
    ];

    const legs = [];

    // Walk to first stop
    legs.push({
      type: "walk",
      from: "origin",
      to: transitStops[0]
    });

    // Transit leg
    legs.push({
      type: "transit",
      route_id: r.route_id,
      trip_id: r.trip_id,
      from_stop: transitStops[0],
      to_stop: transitStops[1]
    });

    // Walk to destination
    legs.push({
      type: "walk",
      from: transitStops[1],
      to: "destination"
    });

    // =====================
    // Risk calculation
    // =====================
    const legRisks = [];

    for (const leg of legs) {
      if (leg.type === "transit") {
        const risk = await getLegRisk(leg.route_id, leg.from_stop);
        legRisks.push(risk);
      }
    }

    const onTimeProbability =
      computeJourneyOnTimeProbability(legRisks);

    return {
      journey_id: `1leg-${i}`,
      scheduled_arrival: r.scheduled_arrival,
      on_time_probability: Number((onTimeProbability * 100).toFixed(1)),
      legs
    };
  })
);

}

async function findTwoLegJourneys({
  start,
  end,
  targetArrivalTime,
  maxWalkMinutes,
  minTransferMinutes = 3
}) {
  const startStops = await findNearbyStops(start, maxWalkMinutes);
  const endStops   = await findNearbyStops(end, maxWalkMinutes);

  if (startStops.length === 0 || endStops.length === 0) return [];

  const startIds = startStops.map(s => s.stop_id);
  const endIds   = endStops.map(s => s.stop_id);

  const { rows } = await pool.query(`
    WITH first_leg AS (
      SELECT
        t1.route_id AS route1,
        ha.trip_id,
        ha.stop_id AS start_stop,
        ha.scheduled_arrival AS dep_time
      FROM historical_arrivals ha
      JOIN trips t1 ON t1.trip_id = ha.trip_id
      WHERE ha.stop_id = ANY($1)
    ),
    transfer_points AS (
      SELECT
        fl.route1,
        fl.trip_id AS trip1,
        fl.start_stop,
        ha.stop_id AS transfer_stop,
        ha.scheduled_arrival AS transfer_time
      FROM first_leg fl
      JOIN historical_arrivals ha
        ON fl.trip_id = ha.trip_id
       AND ha.scheduled_arrival > fl.dep_time
    ),
    second_leg AS (
      SELECT
        tp.route1,
        tp.trip1,
        tp.start_stop,
        tp.transfer_stop,
        tp.transfer_time,
        
        t2.route_id AS route2,
        ha2_transfer.trip_id AS trip2,
        ha2_end.stop_id AS end_stop,
        ha2_end.scheduled_arrival AS arrival_time

      FROM transfer_points tp

      JOIN historical_arrivals ha2_transfer
        ON ha2_transfer.stop_id = tp.transfer_stop
       AND ha2_transfer.trip_id <> tp.trip1
       AND ha2_transfer.scheduled_arrival >=
           tp.transfer_time + ($4 * INTERVAL '1 minute')

      JOIN trips t2 ON t2.trip_id = ha2_transfer.trip_id

      JOIN historical_arrivals ha2_end
        ON ha2_end.trip_id = ha2_transfer.trip_id
       AND ha2_end.stop_id = ANY($2)
       AND ha2_end.scheduled_arrival > ha2_transfer.scheduled_arrival
    )

    SELECT *
    FROM second_leg
    WHERE arrival_time <= $3
    ORDER BY arrival_time
  `, [startIds, endIds, targetArrivalTime, minTransferMinutes]);

  rows.splice(MAX_TWO_LEG_RESULTS);

return Promise.all(
  rows.map(async (r, i) => {

    const transitStops = [
      r.start_stop,
      r.transfer_stop,
      r.end_stop
    ];

    const legs = [];

    legs.push({
      type: "walk",
      from: "origin",
      to: transitStops[0]
    });

    legs.push({
      type: "transit",
      trip_id: r.trip1,
      route_id: null, // optional if you later want route lookup
      from_stop: transitStops[0],
      to_stop: transitStops[1]
    });

    legs.push({
      type: "transit",
      trip_id: r.trip2,
      route_id: null,
      from_stop: transitStops[1],
      to_stop: transitStops[2]
    });

    legs.push({
      type: "walk",
      from: transitStops[2],
      to: "destination"
    });

    // =====================
    // Risk calculation
    // =====================
    const legRisks = [];

    for (const leg of legs) {
      if (leg.type === "transit") {
        // ⚠️ you may later map trip_id → route_id
        const risk = await getLegRisk(leg.route_id ?? "unknown", leg.from_stop);
        legRisks.push(risk);
      }
    }

    const onTimeProbability =
      computeJourneyOnTimeProbability(legRisks);

    return {
      journey_id: `2leg-${i}`,
      scheduled_arrival: r.arrival_time,
      on_time_probability: Number((onTimeProbability * 100).toFixed(1)),
      legs
    };
  })
);

}

async function findMultiLegJourneys({
  start,
  end,
  targetArrivalTime,
  maxWalkMinutes,
  maxLegs = 3,
  minTransferMinutes = 3
}) {
  const startStops = await findNearbyStops(start, maxWalkMinutes);
  const endStops   = await findNearbyStops(end, maxWalkMinutes);

  if (!startStops.length || !endStops.length) return [];

  const startIds = startStops.map(s => s.stop_id);
  const endSet = new Set(endStops.map(s => s.stop_id));

  // Pull ALL arrivals before target time (small dataset = fine)
  const { rows: arrivals } = await pool.query(`
    SELECT ha.trip_id, ha.stop_id, ha.scheduled_arrival, t.route_id
    FROM historical_arrivals ha
    JOIN trips t ON t.trip_id = ha.trip_id
    WHERE ha.scheduled_arrival <= $1
    ORDER BY ha.scheduled_arrival
  `, [targetArrivalTime]);

  // Index arrivals by stop
  const byStop = {};
  for (const a of arrivals) {
    if (!byStop[a.stop_id]) byStop[a.stop_id] = [];
    byStop[a.stop_id].push(a);
  }

  const results = [];
  const queue = [];

  // Seed queue with starting stops
  for (const stop of startIds) {
    queue.push({
      currentStop: stop,
      time: null,
      legs: [],
      usedTrips: new Set()
    });
  }

  while (queue.length) {
    const state = queue.shift();

    if (state.legs.length > maxLegs) continue;

    // 🎯 Reached destination area
    if (endSet.has(state.currentStop) && state.legs.length > 0) {
      if (state.legs.length < 2) continue;
      results.push({
        journey_id: `mleg-${results.length}`,
        scheduled_arrival: state.time,
        legs: [
          { type: "walk", from: "origin", to: state.legs[0].from_stop },
          ...state.legs,
          { type: "walk", from: state.currentStop, to: "destination" }
        ]
      });
      if (results.length >= 5) break;
      continue;
    }

    const arrivalsHere = byStop[state.currentStop] || [];

    for (const a of arrivalsHere) {
      if (state.usedTrips.has(a.trip_id)) continue;

      if (state.time) {
        const minTime = new Date(state.time);
        minTime.setMinutes(minTime.getMinutes() + minTransferMinutes);
        if (new Date(a.scheduled_arrival) < minTime) continue;
      }

      // Find next stops on same trip AFTER this stop
      const nextStops = arrivals.filter(
        x =>
          x.trip_id === a.trip_id &&
          x.scheduled_arrival > a.scheduled_arrival
      );

      for (const next of nextStops) {
        queue.push({
          currentStop: next.stop_id,
          time: next.scheduled_arrival,
          legs: [
            ...state.legs,
            {
              type: "transit",
              route_id: a.route_id,
              trip_id: a.trip_id,
              from_stop: a.stop_id,
              to_stop: next.stop_id
            }
          ],
          usedTrips: new Set([...state.usedTrips, a.trip_id])
        });
      }
    }
  }
return Promise.all(
  results.map(async (r, i) => {

    // =====================
    // Risk calculation
    // =====================
    const legRisks = [];

    for (const leg of r.legs) {
      if (leg.type === "transit") {
        const risk = await getLegRisk(
          leg.route_id ?? "unknown",
          leg.from_stop
        );
        legRisks.push(risk);
      }
    }

    const onTimeProbability =
      computeJourneyOnTimeProbability(legRisks);

    return {
      journey_id: `mleg-${i}`,
      scheduled_arrival: r.scheduled_arrival,
      on_time_probability: Number((onTimeProbability * 100).toFixed(1)),
      legs: r.legs
    };
  })
);


    

}


module.exports = { 
  findOneLegJourneys, 
  findTwoLegJourneys,
  findMultiLegJourneys
};