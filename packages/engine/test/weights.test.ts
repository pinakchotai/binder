import { describe, expect, it } from "vitest";
import {
  DomainConfigurationError,
  getActiveDomainCount,
  getActiveDomainWeights,
} from "../src/weights";
import type { UserDomainSetting } from "../src/types";

const allActive: UserDomainSetting[] = [
  { domain: "non_negotiables", isActive: true, weightOverride: null },
  { domain: "academia", isActive: true, weightOverride: null },
  { domain: "physical", isActive: true, weightOverride: null },
  { domain: "personal_growth", isActive: true, weightOverride: null },
];

describe("getActiveDomainCount", () => {
  it("counts active domains", () => {
    expect(getActiveDomainCount(allActive)).toBe(4);
    const oneDisabled = allActive.map((s) =>
      s.domain === "academia" ? { ...s, isActive: false } : s
    );
    expect(getActiveDomainCount(oneDisabled)).toBe(3);
  });
});

describe("getActiveDomainWeights", () => {
  it("all active with defaults reproduces 40/20/20/20", () => {
    expect(getActiveDomainWeights(allActive)).toEqual({
      non_negotiables: 40,
      academia: 20,
      physical: 20,
      personal_growth: 20,
    });
  });

  it("rebalances the remaining 3 proportionally when one domain is disabled", () => {
    const settings = allActive.map((s) =>
      s.domain === "academia" ? { ...s, isActive: false } : s
    );
    expect(getActiveDomainWeights(settings)).toEqual({
      non_negotiables: 50,
      physical: 25,
      personal_growth: 25,
    });
  });

  it("rebalances down to the 2-domain floor", () => {
    const settings = allActive.map((s) =>
      s.domain === "academia" || s.domain === "physical"
        ? { ...s, isActive: false }
        : s
    );
    const weights = getActiveDomainWeights(settings);
    expect(weights).toEqual({ non_negotiables: 66.67, personal_growth: 33.33 });
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it("throws when fewer than MIN_ACTIVE_DOMAINS remain active", () => {
    const settings = allActive.map((s) =>
      s.domain === "non_negotiables" ? s : { ...s, isActive: false }
    );
    expect(() => getActiveDomainWeights(settings)).toThrowError(
      DomainConfigurationError
    );
  });

  it("uses manual overrides as-is when they already sum to 100", () => {
    const settings: UserDomainSetting[] = [
      { domain: "non_negotiables", isActive: true, weightOverride: 50 },
      { domain: "academia", isActive: true, weightOverride: 20 },
      { domain: "physical", isActive: true, weightOverride: 15 },
      { domain: "personal_growth", isActive: true, weightOverride: 15 },
    ];
    expect(getActiveDomainWeights(settings)).toEqual({
      non_negotiables: 50,
      academia: 20,
      physical: 15,
      personal_growth: 15,
    });
  });

  it("keeps the sum at exactly 100 even with awkward manual mixes", () => {
    const settings: UserDomainSetting[] = [
      { domain: "non_negotiables", isActive: true, weightOverride: 55 },
      { domain: "academia", isActive: true, weightOverride: 21 },
      { domain: "physical", isActive: true, weightOverride: 24 },
      { domain: "personal_growth", isActive: true, weightOverride: 10 },
    ];
    const weights = getActiveDomainWeights(settings);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it("throws on a domain key that is not a known domain", () => {
    const bad = (allActive as UserDomainSetting[]).map((s) =>
      s.domain === "academia" ? { ...s, domain: "unknown" } : s
    );
    expect(() =>
      getActiveDomainWeights(bad as unknown as UserDomainSetting[])
    ).toThrowError(DomainConfigurationError);
  });
});