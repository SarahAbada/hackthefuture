export interface NLPIntent {
  targetTime: string | null; // "18:30"
  confidenceType: "arrival_probability";
  requiresRiskCalculation: boolean;
}
