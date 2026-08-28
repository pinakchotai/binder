import { SCORE_MAX } from "./constants";
import { round2 } from "./math";
import { streakMultiplier } from "./streak";

export interface ComputeDomainScoreInput {
  dayLogs: Array<{ pointsEarned: number }>;
  activeHabits: Array<{ difficultyWeight: number }>;
  priorStreak: number;
}

export function computeDomainScore(input: ComputeDomainScoreInput): number {
  const earned = input.dayLogs.reduce(
    (sum, log) => sum + (log.pointsEarned ?? 0),
    0
  );
  const max = input.activeHabits.reduce(
    (sum, habit) => sum + habit.difficultyWeight,
    0
  );

  const raw = max > 0 ? round2((earned / max) * 100) : 0;
  if (raw === 0) return 0;

  const multiplier = streakMultiplier(input.priorStreak + 1);
  return Math.min(round2(raw * multiplier), SCORE_MAX);
}