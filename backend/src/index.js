require("dotenv").config();
const express = require("express");

const { interpretUserQuery } = require("./nlp/nlpClient");
const { getLegRisk } = require("./services/journeyPlanner");

const app = express();
app.use(express.json());

// Core APIs
app.use(require("./api/health"));
app.use(require("./api/prediction"));
app.use(require("./api/weather"));
app.use("/api", require("./api/risk"));
app.use("/api", require("./api/nlp"));

// Example prompt to run on startup
const examplePrompt = "I need to reach the friends meetup for 6:30pm";

async function runDemoPrompt() {
  try {
    console.log("\n--- Demo prompt ---");
    console.log("Input:", examplePrompt);

    const intent = await interpretUserQuery(examplePrompt);
    console.log("Parsed intent:", intent);

    if (!intent || !intent.requiresRiskCalculation) {
      console.log("No timing/arrival constraint detected by NLP.");
      return;
    }

    const targetTime = new Date(intent.targetTime || Date.now());
    const scheduledArrivalTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 min before target

    // Use demo route/stop IDs – risk code has fallbacks so this is safe
    const demoRouteId = "DEMO_ROUTE";
    const demoStopId = "DEMO_STOP";

    const risk = await getLegRisk(demoRouteId, demoStopId, targetTime, scheduledArrivalTime);
    const onTimeProbability = Number(((1 - risk) * 100).toFixed(1));

    console.log(
      `Estimated probability of arriving by ${targetTime.toISOString()}: ${onTimeProbability}%`
    );
    console.log("-------------------\n");
  } catch (error) {
    console.error("Error running demo prompt:", error.message || error);
  }
}

app.listen(3000, () => {
  console.log("Server running on port 3000");
  // Fire and forget demo prompt
  runDemoPrompt();
});
