const { interpretUserQuery } = require("../nlp/nlpClient");
const { getLegRisk } = require("../risk/getLegRisk");


export async function handleUserQuery(
  input: string,
  routeId: string,
  stopId: string
) {
  const intent = await interpretUserQuery(input);

  if (!intent.requiresRiskCalculation) {
    return { message: "No risk calculation required." };
  }

  const risk = await getLegRisk(
    routeId,
    stopId,
    intent.targetTime
  );

  return {
    targetTime: intent.targetTime,
    probabilityArrivingByTarget:
      (1 - risk) * 100
  };
}
