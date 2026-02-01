const {
    findOneLegJourneys,
    findTwoLegJourneys,
  findMultiLegJourneys,
  generateJourneyVariants
} = require("../src/services/journeyPlanner");

(async () => {
  // Fetch multi-leg journeys
  const journeys = await findOneLegJourneys({
    start: { lat: 45.4215, lon: -75.6972 },
    end: { lat: 45.4290, lon: -75.6890 },
    targetArrivalTime: new Date("2026-01-31T13:30:00Z"),
    maxWalkMinutes: 10
  });

  console.log("Journeys found:", journeys.length);

  // Guard: check if we actually found any journeys
  if (!journeys.length) {
    console.log("No multi-leg journeys found. Exiting test.");
    return;
  }

  // Generate variants for the first journey
  const variants = await generateJourneyVariants(
    journeys[0],
    new Date("2026-01-31T13:30:00Z")
  );

  console.log("VARIANTS:", JSON.stringify(variants, null, 2));
})();
