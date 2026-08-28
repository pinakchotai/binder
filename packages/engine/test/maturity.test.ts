import { describe, expect, it } from "vitest";
import { computeHabitMaturity, DEFAULT_MATURITY_DAYS } from "../src/maturity";

describe("computeHabitMaturity", () => {
  it("new habit (streak 0) → 0% complete, not automatic", () => {
    const result = computeHabitMaturity({
      habitCreatedAt: "2026-08-28",
      currentStreak: 0,
    });
    expect(result.daysToward).toBe(0);
    expect(result.targetDays).toBe(DEFAULT_MATURITY_DAYS);
    expect(result.percentComplete).toBe(0);
    expect(result.isLikelyAutomatic).toBe(false);
  });

  it("33-day streak → 50% of default 66-day target", () => {
    const result = computeHabitMaturity({
      habitCreatedAt: "2026-07-26",
      currentStreak: 33,
    });
    expect(result.daysToward).toBe(33);
    expect(result.targetDays).toBe(DEFAULT_MATURITY_DAYS);
    expect(result.percentComplete).toBe(50);
    expect(result.isLikelyAutomatic).toBe(false);
  });

  it("10-day streak → ~15% complete (matches display spec)", () => {
    const result = computeHabitMaturity({
      habitCreatedAt: "2026-08-18",
      currentStreak: 10,
    });
    expect(result.percentComplete).toBe(15);
    expect(result.isLikelyAutomatic).toBe(false);
  });

  it("66+ day streak → capped at 100%, automatic", () => {
    const at66 = computeHabitMaturity({
      habitCreatedAt: "2026-06-23",
      currentStreak: 66,
    });
    expect(at66.percentComplete).toBe(100);
    expect(at66.isLikelyAutomatic).toBe(true);

    const beyond = computeHabitMaturity({
      habitCreatedAt: "2026-04-30",
      currentStreak: 120,
    });
    expect(beyond.percentComplete).toBe(100);
    expect(beyond.isLikelyAutomatic).toBe(true);
  });

  it("respects a custom maturityTargetDays override", () => {
    const result = computeHabitMaturity({
      habitCreatedAt: "2026-07-30",
      currentStreak: 15,
      maturityTargetDays: 30,
    });
    expect(result.targetDays).toBe(30);
    expect(result.percentComplete).toBe(50);
    expect(result.isLikelyAutomatic).toBe(false);
  });

  it("does not divide by zero on a degenerate target override", () => {
    const result = computeHabitMaturity({
      habitCreatedAt: "2026-08-01",
      currentStreak: 5,
      maturityTargetDays: 0,
    });
    expect(result.percentComplete).toBe(100);
    expect(result.isLikelyAutomatic).toBe(true);
  });
});