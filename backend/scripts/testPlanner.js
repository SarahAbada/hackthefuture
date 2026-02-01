const { findOneLegJourneys, findTwoLegJourneys, findMultiLegJourneys } =
  require("../src/services/journeyPlanner");
const pool = require("../src/db");

(async () => {
  console.log("\n===== ACTUAL STOPS IN DATABASE =====");
  const { rows } = await pool.query(`SELECT stop_id, lat, lon FROM stops LIMIT 10`);
  console.log(JSON.stringify(rows, null, 2));

  const start = { lat: 45.4215, lon: -75.6972 };
  const end   = { lat: 45.424, lon: -75.692 };
  const maxWalkMinutes = 5;
  const targetArrivalTime = new Date("2026-01-31T15:00:00Z");

  console.log("\n===== ONE LEG JOURNEYS =====");
  const oneLeg = await findOneLegJourneys({
    start,
    end,
    targetArrivalTime,
    maxWalkMinutes
  });
  console.log(JSON.stringify(oneLeg, null, 2));

  console.log("\n===== TWO LEG JOURNEYS =====");
  const twoLegStart = { lat: 45.4215, lon: -75.6972 };
  const twoLegEnd   = { lat: 45.426, lon: -75.69 };

  const twoLeg = await findTwoLegJourneys({
    start: twoLegStart,
    end: twoLegEnd,
    targetArrivalTime,
    maxWalkMinutes,
    minTransferMinutes: 3
  });
  console.log(JSON.stringify(twoLeg, null, 2));
  const multiLeg = await findMultiLegJourneys({
    start,
    end,
    targetArrivalTime,
    maxWalkMinutes: 10,
    maxLegs: 3
  });

  console.log("MULTI LEG:", JSON.stringify(multiLeg, null, 2));

  process.exit(0);
})();