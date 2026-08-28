import { SCORE_MAX } from "./constants";
import { round2 } from "./math";

export interface ComputeTotalScoreInput {
  domainScores: Record<string, number>;
  weights: Record<string, number>;
}

export function computeTotalScore(input: ComputeTotalScoreInput): number {
  let total = 0;
  for (const [domain, weight] of Object.entries(input.weights)) {
    total += (input.domainScores[domain] ?? 0) * (weight / 100);
  }
  return Math.min(round2(total), SCORE_MAX);
}