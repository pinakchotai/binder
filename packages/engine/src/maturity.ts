// Lally et al., 2010: ~66 days average to automaticity.
export const DEFAULT_MATURITY_DAYS = 66;

export interface MaturityInput {
  habitCreatedAt: string; // ISO date — reserved for future per-habit-type targets
  currentStreak: number; // consecutive days logged, from existing streak logic
  maturityTargetDays?: number; // defaults to DEFAULT_MATURITY_DAYS
}

export interface MaturityResult {
  daysToward: number; // same value as currentStreak, named for this context
  targetDays: number;
  percentComplete: number; // 0-100, capped at 100
  isLikelyAutomatic: boolean; // true once percentComplete >= 100
}

export function computeHabitMaturity(input: MaturityInput): MaturityResult {
  const target = Math.max(1, input.maturityTargetDays ?? DEFAULT_MATURITY_DAYS);
  const percent = Math.min((input.currentStreak / target) * 100, 100);
  return {
    daysToward: input.currentStreak,
    targetDays: target,
    percentComplete: Math.round(percent),
    isLikelyAutomatic: percent >= 100,
  };
}