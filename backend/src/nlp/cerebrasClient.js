const Cerebras = require("@cerebras/cerebras_cloud_sdk");

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

async function interpretUserQuery(text) {
  const response = await client.chat.completions.create({
    model: "llama3.1-8b",
    messages: [
      {
        role: "system",
        content:
          "You are an intent parser. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0,
  });

  const raw = response.choices[0].message.content;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON from model: " + raw);
  }
}

module.exports = { interpretUserQuery };
