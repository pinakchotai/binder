import { describe, expect, it } from "vitest";
import { computeTotalScore } from "../src/totalScore";

describe("computeTotalScore", () => {
  it("reproduces the legacy 40/20/20/20 aggregation exactly", () => {
    const domainScores = {
      non_negotiables: 80,
      academia: 60,
      physical: 40,
      personal_growth: 20,
    };
    const weights = {
      non_negotiables: 40,
      academia: 20,
      physical: 20,
      personal_growth: 20,
    };
    expect(computeTotalScore({ domainScores, weights })).toBe(56);
  });

  it("uses dynamic weights for a reduced active set", () => {
    const domainScores = {
      non_negotiables: 80,
      physical: 40,
      personal_growth: 40,
    };
    const weights = { non_negotiables: 50, physical: 25, personal_growth: 25 };
    // 80*0.5 + 40*0.25 + 40*0.25 = 60
    expect(computeTotalScore({ domainScores, weights })).toBe(60);
  });

  it("treats missing domain scores as zero", () => {
    const domainScores = {};
    const weights = { non_negotiables: 100 };
    expect(computeTotalScore({ domainScores, weights })).toBe(0);
  });

  it("caps at 100 even when every domain caps", () => {
    const domainScores = {
      non_negotiables: 100,
      academia: 100,
      physical: 100,
      personal_growth: 100,
    };
    const weights = {
      non_negotiables: 40,
      academia: 20,
      physical: 20,
      personal_growth: 20,
    };
    expect(computeTotalScore({ domainScores, weights })).toBe(100);
  });
});