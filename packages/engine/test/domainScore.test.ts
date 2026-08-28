import { describe, expect, it } from "vitest";
import { computeDomainScore } from "../src/domainScore";

describe("computeDomainScore", () => {
  it("returns 0 with no active habits (avoids divide-by-zero)", () => {
    expect(
      computeDomainScore({ dayLogs: [], activeHabits: [], priorStreak: 0 })
    ).toBe(0);
  });

  it("full marks when every active habit weight is earned", () => {
    const activeHabits = [{ difficultyWeight: 10 }, { difficultyWeight: 20 }];
    const dayLogs = [{ pointsEarned: 10 }, { pointsEarned: 20 }];
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 0 })
    ).toBe(100);
  });

  it("scales linearly to the ratio earned", () => {
    const activeHabits = [{ difficultyWeight: 10 }, { difficultyWeight: 10 }];
    const dayLogs = [{ pointsEarned: 10 }];
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 0 })
    ).toBe(50);
  });

  it("returns 0 when nothing is earned even with a high streak", () => {
    const activeHabits = [{ difficultyWeight: 20 }];
    const dayLogs = [{ pointsEarned: 0 }];
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 29 })
    ).toBe(0);
  });

  it("applies the streak multiplier after the base percentage", () => {
    const activeHabits = [{ difficultyWeight: 10 }, { difficultyWeight: 10 }];
    const dayLogs = [{ pointsEarned: 10 }];
    // raw 50, priorStreak 2 -> +1 = 3 -> 1.05 -> 52.5
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 2 })
    ).toBe(52.5);
  });

  it("caps the multiplied score at 100", () => {
    const activeHabits = [{ difficultyWeight: 10 }];
    const dayLogs = [{ pointsEarned: 10 }];
    // raw 100 * 1.25 (priorStreak 29 -> 30) = 125 -> capped 100
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 29 })
    ).toBe(100);
  });

  it("rounds the raw percentage to 2 decimals", () => {
    const activeHabits = [{ difficultyWeight: 30 }];
    const dayLogs = [{ pointsEarned: 11 }];
    expect(
      computeDomainScore({ dayLogs, activeHabits, priorStreak: 0 })
    ).toBe(36.67);
  });
});