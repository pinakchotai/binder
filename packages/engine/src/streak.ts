import { MAX_STREAK, STREAK_MULTIPLIER_TIERS } from "./constants";
import { addDays } from "./date";

export interface ComputeUserStreakInput {
  totalScores: Array<{ scoreDate: string; score: number }>;
  asOfDate: string;
  /** Dates a streak freeze rescued; counted as scored days. */
  protectedFreezeDates?: string[];
}

export function computeUserStreak(input: ComputeUserStreakInput): number {
  const scoresByDate = new Map<string, number>();
  for (const entry of input.totalScores) {
    scoresByDate.set(entry.scoreDate, entry.score);
  }
  const protectedSet = new Set(input.protectedFreezeDates ?? []);
  const isScoredDay = (date: string): boolean =>
    (scoresByDate.get(date) ?? 0) > 0 || protectedSet.has(date);

  let streak = 0;
  let check = addDays(input.asOfDate, -1);

  while (streak < MAX_STREAK) {
    if (isScoredDay(check)) {
      streak += 1;
      check = addDays(check, -1);
    } else {
      break;
    }
  }

  return streak;
}

export function streakMultiplier(streak: number): number {
  for (const tier of STREAK_MULTIPLIER_TIERS) {
    if (streak >= tier.minStreak) return tier.multiplier;
  }
  return 1;
}