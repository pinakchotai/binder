import { describe, expect, it } from "vitest";
import { computeUserStreak, streakMultiplier } from "../src/streak";

describe("streakMultiplier", () => {
  it("returns 1.0 below all tier thresholds", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(2)).toBe(1);
  });

  it("escalates at 3/7/14/30 and holds at 30+", () => {
    expect(streakMultiplier(3)).toBe(1.05);
    expect(streakMultiplier(7)).toBe(1.1);
    expect(streakMultiplier(14)).toBe(1.15);
    expect(streakMultiplier(30)).toBe(1.25);
    expect(streakMultiplier(100)).toBe(1.25);
  });
});

describe("computeUserStreak", () => {
  it("counts only days strictly before asOfDate", () => {
    const totalScores = [{ scoreDate: "2026-08-27", score: 12 }];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-27" })).toBe(0);
  });

  it("counts consecutive qualifying days before asOfDate only", () => {
    const totalScores = [
      { scoreDate: "2026-08-24", score: 20 },
      { scoreDate: "2026-08-25", score: 20 },
      { scoreDate: "2026-08-26", score: 20 },
    ];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-27" })).toBe(3);
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-26" })).toBe(2);
  });

  it("stops at the first gap", () => {
    const totalScores = [
      { scoreDate: "2026-08-24", score: 20 },
      { scoreDate: "2026-08-25", score: 20 },
      { scoreDate: "2026-08-27", score: 20 },
    ];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-28" })).toBe(1);
  });

  it("treats an explicit zero-score day as a break", () => {
    const totalScores = [
      { scoreDate: "2026-08-24", score: 20 },
      { scoreDate: "2026-08-25", score: 0 },
    ];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-26" })).toBe(0);
  });

  it("skips older qualifying days when a gap separates them", () => {
    const totalScores = [
      { scoreDate: "2026-08-24", score: 20 },
      { scoreDate: "2026-08-26", score: 20 },
    ];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-27" })).toBe(1);
  });

  it("handles month boundaries", () => {
    const totalScores = [
      { scoreDate: "2026-07-30", score: 20 },
      { scoreDate: "2026-07-31", score: 20 },
      { scoreDate: "2026-08-01", score: 20 },
      { scoreDate: "2026-08-02", score: 20 },
    ];
    expect(computeUserStreak({ totalScores, asOfDate: "2026-08-03" })).toBe(4);
  });
});