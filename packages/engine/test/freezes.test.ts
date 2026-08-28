import { describe, expect, it } from "vitest";
import { computeUserStreak } from "../src/streak";
import {
  applyStreakFreezes,
  computeBestStreak,
  computeFreezeGrant,
  computeStreakWithFreezes,
  DEFAULT_MAX_ACTIVE_FREEZES,
  FREEZE_GRANT_DAYS,
} from "../src/freezes";

const scored = (scoreDate: string, score = 10) => ({ scoreDate, score });

describe("computeUserStreak with protected freeze dates", () => {
  it("counts a protected date as a scored day", () => {
    const totalScores = [scored("2026-08-24"), scored("2026-08-26")];
    expect(
      computeUserStreak({
        totalScores,
        asOfDate: "2026-08-27",
        protectedFreezeDates: ["2026-08-25"],
      }),
    ).toBe(3);
  });

  it("does not extend the run across a protection far from the boundary", () => {
    const totalScores = [scored("2026-08-24")];
    expect(
      computeUserStreak({
        totalScores,
        asOfDate: "2026-08-27",
        protectedFreezeDates: ["2026-08-20"],
      }),
    ).toBe(0);
  });

  it("behaves identically without protections (existing contract)", () => {
    const totalScores = [scored("2026-08-24"), scored("2026-08-25"), scored("2026-08-26")];
    expect(
      computeUserStreak({ totalScores, asOfDate: "2026-08-27" }),
    ).toBe(3);
  });
});

describe("applyStreakFreezes", () => {
  it("protects one missed day (single gap)", () => {
    const totalScores = [scored("2026-08-17"), scored("2026-08-20")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-20",
      availableCount: 1,
    });
    expect(result).toEqual({ protectedDates: ["2026-08-19"], consumed: 1 });
  });

  it("bridges consecutive missed days, consuming one freeze each", () => {
    const totalScores = [scored("2026-08-17"), scored("2026-08-20")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-20",
      availableCount: 2,
    });
    expect(result.protectedDates.sort()).toEqual(["2026-08-18", "2026-08-19"]);
    expect(result.consumed).toBe(2);
  });

  it("stops when inventory is exhausted mid-gap", () => {
    const totalScores = [scored("2026-08-17"), scored("2026-08-20")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-20",
      availableCount: 1,
    });
    expect(result).toEqual({ protectedDates: ["2026-08-19"], consumed: 1 });
  });

  it("does not re-consume an already protected day", () => {
    const totalScores = [scored("2026-08-17"), scored("2026-08-20")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-20",
      availableCount: 2,
      protectedDates: ["2026-08-19"],
    });
    expect(result.consumed).toBe(1);
    expect(result.protectedDates).toEqual(["2026-08-19", "2026-08-18"]);
  });

  it("only rescues the gap touching the live streak boundary", () => {
    // 14 and 16 are scored, so the trailing boundary (17→16) has no gap;
    // the interior miss on 15 is left alone, not bridged.
    const totalScores = [scored("2026-08-14"), scored("2026-08-16"), scored("2026-08-17")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-17",
      availableCount: 3,
    });
    expect(result).toEqual({ protectedDates: [], consumed: 0 });
  });

  it("is a no-op with zero freezes and never mutates inputs", () => {
    const totalScores = [scored("2026-08-20")];
    const result = applyStreakFreezes({
      totalScores,
      asOfDate: "2026-08-20",
      availableCount: 0,
    });
    expect(result).toEqual({ protectedDates: [], consumed: 0 });
  });
});

describe("computeStreakWithFreezes", () => {
  it("recovers the full run across a protected gap", () => {
    const totalScores = [scored("2026-08-17"), scored("2026-08-20")];
    const streak = computeStreakWithFreezes({
      totalScores,
      asOfDate: "2026-08-21",
      protectedFreezeDates: ["2026-08-18", "2026-08-19"],
    });
    expect(streak).toBe(4);
  });
});

describe("computeBestStreak", () => {
  it("returns 0 for no scored days", () => {
    expect(computeBestStreak([])).toBe(0);
    expect(computeBestStreak([scored("2026-08-20", 0)])).toBe(0);
  });

  it("finds the longest consecutive scored-run", () => {
    const totalScores = [
      scored("2026-08-10"),
      scored("2026-08-11"),
      scored("2026-08-12"),
      scored("2026-08-14"),
      scored("2026-08-15"),
    ];
    expect(computeBestStreak(totalScores)).toBe(3);
  });

  it("handles month boundaries", () => {
    const totalScores = [
      scored("2026-07-30"),
      scored("2026-07-31"),
      scored("2026-08-01"),
    ];
    expect(computeBestStreak(totalScores)).toBe(3);
  });
});

describe("computeFreezeGrant", () => {
  it("grants nothing before the first full 7-day run", () => {
    expect(
      computeFreezeGrant({ bestStreak: 6, paidMilestones: 0, availableCount: 0 }),
    ).toEqual({ added: 0, paidMilestones: 0 });
  });

  it("grants one freeze per completed 7-day run", () => {
    const first = computeFreezeGrant({
      bestStreak: 7,
      paidMilestones: 0,
      availableCount: 0,
    });
    expect(first).toEqual({ added: 1, paidMilestones: 1 });

    const second = computeFreezeGrant({
      bestStreak: 14,
      paidMilestones: 1,
      availableCount: 1,
    });
    expect(second).toEqual({ added: 1, paidMilestones: 2 });
  });

  it("caps the bank at DEFAULT_MAX_ACTIVE_FREEZES", () => {
    const result = computeFreezeGrant({
      bestStreak: 28,
      paidMilestones: 2,
      availableCount: 2,
    });
    expect(result).toEqual({ added: 1, paidMilestones: 4 });
    const full = computeFreezeGrant({
      bestStreak: 35,
      paidMilestones: 4,
      availableCount: 3,
    });
    expect(full).toEqual({ added: 0, paidMilestones: 5 });
  });

  it("can refill after a freeze is spent (new milestone, bank space)", () => {
    const result = computeFreezeGrant({
      bestStreak: 49,
      paidMilestones: 6,
      availableCount: 2,
    });
    expect(result).toEqual({ added: 1, paidMilestones: 7 });
  });

  it("exports sensible constants", () => {
    expect(DEFAULT_MAX_ACTIVE_FREEZES).toBe(3);
    expect(FREEZE_GRANT_DAYS).toBe(7);
  });
});