export const DIFFICULTY_WEIGHTS = {
  easy: 10,
  medium: 20,
  hard: 30,
} as const;

export const DEFAULT_DOMAIN_WEIGHTS = {
  non_negotiables: 40,
  academia: 20,
  physical: 20,
  personal_growth: 20,
} as const;

export const DOMAINS = [
  "non_negotiables",
  "academia",
  "physical",
  "personal_growth",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const MIN_ACTIVE_DOMAINS = 2;

export const SCORE_MAX = 100;

export const MAX_STREAK = 365;

export const STREAK_MULTIPLIER_TIERS: ReadonlyArray<{
  minStreak: number;
  multiplier: number;
}> = [
  { minStreak: 30, multiplier: 1.25 },
  { minStreak: 14, multiplier: 1.15 },
  { minStreak: 7, multiplier: 1.1 },
  { minStreak: 3, multiplier: 1.05 },
];