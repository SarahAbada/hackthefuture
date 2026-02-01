function buildPrompt(userInput) {
  return `
You are a backend NLP service.
You must return ONLY valid JSON.
No explanations. No markdown.

User input:
"${userInput}"

Return JSON in this exact format:
{
  "targetTime": "HH:MM" | null,
  "confidenceType": "arrival_probability",
  "requiresRiskCalculation": true | false
}

Rules:
- If user mentions a time (e.g. "6:30pm"), convert to 24h format.
- If no time is mentioned, targetTime must be null.
`;
}

module.exports = { buildPrompt };
