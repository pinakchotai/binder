import { MAX_STREAK } from "./constants";
import { addDays, dayDiff } from "./date";
import { computeUserStreak, type ComputeUserStreakInput } from "./streak";

export const DEFAULT_MAX_ACTIVE_FREEZES = 3;
export const FREEZE_GRANT_DAYS = 7;

/** Longest consecutive run of genuinely scored days (raw consistency). */
export function computeBestStreak(
  totalScores: Array<{ scoreDate: string; score: number }>,
): number {
  const dates = [
    ...new Set(
      totalScores
        .filter((t) => (t.score ?? 0) > 0)
        .map((t) => t.scoreDate),
    ),
  ].sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of dates) {
    run = prev !== null && dayDiff(prev, date) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = date;
  }
  return best;
}

export interface ApplyStreakFreezesInput {
  totalScores: Array<{ scoreDate: string; score: number }>;
  asOfDate: string;
  availableCount: number;
  protectedDates?: string[];
}

export interface ApplyStreakFreezesResult {
  protectedDates: string[];
  consumed: number;
}

/**
 * Walk back from asOfDate - 1 as the streak counter would: every consecutive
 * missed day consumes one available freeze (a "protected" day), stopping at
 * the first genuinely scored day, when inventory is empty, or at MAX_STREAK.
 * Already-protected days continue the bridge without consuming. Purely
 * deterministic; never touches the caller's arrays.
 */
export function applyStreakFreezes(
  input: ApplyStreakFreezesInput,
): ApplyStreakFreezesResult {
  const scoresByDate = new Map<string, number>();
  for (const entry of input.totalScores) {
    scoresByDate.set(entry.scoreDate, entry.score);
  }
  const isScoredDay = (date: string): boolean => (scoresByDate.get(date) ?? 0) > 0;

  const protectedSet = new Set(input.protectedDates ?? []);
  const newlyProtected: string[] = [];
  let consumed = 0;
  let walked = 0;

  while (walked < MAX_STREAK) {
    const check = addDays(input.asOfDate, -1 - walked);
    if (isScoredDay(check)) break;
    if (!protectedSet.has(check)) {
      if (consumed >= input.availableCount) break;
      protectedSet.add(check);
      newlyProtected.push(check);
      consumed += 1;
    }
    walked += 1;
  }

  const protectedDates = input.protectedDates ? [...input.protectedDates] : [];
  for (const date of newlyProtected) protectedDates.push(date);
  return { protectedDates, consumed };
}

export interface FreezeGrantInput {
  /** Longest raw consecutive-day run the user has ever logged. */
  bestStreak: number;
  /** Highest completed 7-day run already rewarded. */
  paidMilestones: number;
  availableCount: number;
  maxActiveFreezes?: number;
}

export interface FreezeGrantResult {
  added: number;
  paidMilestones: number;
}

/** Grant freezes for newly completed 7-day runs, capped by held inventory. */
export function computeFreezeGrant(input: FreezeGrantInput): FreezeGrantResult {
  const max = input.maxActiveFreezes ?? DEFAULT_MAX_ACTIVE_FREEZES;
  const milestonesEarned = Math.floor(input.bestStreak / FREEZE_GRANT_DAYS);
  const added = Math.max(
    0,
    Math.min(
      milestonesEarned - input.paidMilestones,
      max - input.availableCount,
    ),
  );
  return {
    added,
    paidMilestones: Math.max(input.paidMilestones, milestonesEarned),
  };
}

/**
 * Full streak value (raw hot streak plus freeze-bridged gap) as a pure
 * function over the same inputs that drive scoring. Mirrors SQL
 * get_user_streak reading protected_dates.
 */
export function computeStreakWithFreezes(
  input: ComputeUserStreakInput & { protectedFreezeDates: string[] },
): number {
  return computeUserStreak({
    totalScores: input.totalScores,
    asOfDate: input.asOfDate,
    protectedFreezeDates: input.protectedFreezeDates,
  });
}