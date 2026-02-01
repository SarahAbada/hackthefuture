// Local stub NLP client for hackathon/demo: no real OpenAI calls.
// Always returns the same parsed intent so the rest of the
// pipeline (risk + journey planning) can run offline.

async function interpretUserQuery(input) {
  // You can tweak this if you want to change the target time,
  // but it will be the same structure every time.
  return {
    originalText: input,
    requiresRiskCalculation: true,
    // Fixed target time today at 18:30 local time
    targetTime: new Date().setHours(18, 30, 0, 0),
  };
}

module.exports = {
  interpretUserQuery,
};
