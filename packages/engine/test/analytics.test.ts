import { describe, expect, it } from "vitest";
import { buildInsights, type InsightsInput } from "../src/analytics";

const score = (scoreDate: string, score: number) => ({ scoreDate, score });

function makeInput(overrides: Partial<InsightsInput> = {}): InsightsInput {
  return {
    totals: [],
    domainScores: [],
    habits: [],
    logs: [],
    asOfDate: "2026-08-14",
    weekDays: 7,
    ...overrides,
  };
}

describe("buildInsights totals + trends", () => {
  it("returns empty-state fields and a warm highlight when there is no data", () => {
    const r = buildInsights(makeInput());
    expect(r.windowActiveDays).toBe(0);
    expect(r.averageScore).toBeNull();
    expect(r.bestDay).toBeNull();
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreakInWindow).toBe(0);
    expect(r.totalTrend.direction).toBe("flat");
    expect(r.highlights).toContain(
      "No activity in view yet — log your first habit to start a trend.",
    );
  });

  it("computes week-over-week total trend, streaks, avg, best day, consistency", () => {
    const totals = [
      // prev week 07-31..08-06 at 30/day
      ...["2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"].map((d) => score(d, 30)),
      // last week 08-07..08-13 at 50/day
      ...["2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 50)),
      score("2026-08-14", 90),
    ];
    const r = buildInsights(makeInput({ totals }));

    expect(r.windowActiveDays).toBe(15);
    expect(r.windowDays).toBe(15); // 07-31 → 08-14 inclusive
    expect(r.consistency).toBe(1);
    expect(r.averageScore).toBe(43.3);
    expect(r.bestDay).toEqual({ scoreDate: "2026-08-14", score: 90 });
    expect(r.currentStreak).toBe(14); // 07-31..08-13 all scored, 08-14 is asOf
    expect(r.bestStreakInWindow).toBe(15);
    expect(r.totalTrend).toEqual({ lastAvg: 50, prevAvg: 30, delta: 20, direction: "up" });
  });

  it("flags a flat week as flat", () => {
    const totals = [
      ...["2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"].map((d) => score(d, 40)),
      ...["2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 40)),
    ];
    const r = buildInsights(makeInput({ totals }));
    expect(r.totalTrend.direction).toBe("flat");
    expect(r.totalTrend.delta).toBe(0);
  });

  it("reports a dip and emits the reset highlight when the week drops sharply", () => {
    const totals = [
      ...["2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"].map((d) => score(d, 40)),
      ...["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 5)),
    ];
    const r = buildInsights(makeInput({ totals }));
    expect(r.totalTrend.direction).toBe("down");
    expect(r.totalTrend.delta).toBeLessThanOrEqual(-10);
    expect(r.highlights.some((h) => h.startsWith("Total dipped"))).toBe(true);
  });
});

describe("buildInsights domains + habits", () => {
  it("orders domain trends by momentum and ranks the most consistent habits", () => {
    const totals = [
      ...["2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 50)),
      score("2026-08-14", 50),
    ];
    const domainScores = [
      ...["2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => ({ scoreDate: d, score: 50, domain: "physical" })),
      ...["2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => ({ scoreDate: d, score: 25, domain: "academia" })),
    ];
    const habits = [
      { id: "w", name: "Water", domain: "physical" },
      { id: "r", name: "Read", domain: "academia" },
    ];
    const logs = [
      ...["2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => ({ habit_id: "w", log_date: d, completed: true })),
      ...["2026-08-08", "2026-08-09", "2026-08-10"].map((d) => ({ habit_id: "r", log_date: d, completed: true })),
      ...["2026-08-11", "2026-08-12"].map((d) => ({ habit_id: "r", log_date: d, completed: false })),
      { habit_id: "r", log_date: "2026-08-13", completed: true },
    ];

    const r = buildInsights(makeInput({ totals, domainScores, habits, logs }));

    // physical 50/day last week vs 0 prev week → biggest momentum.
    expect(r.domainTrends[0].domain).toBe("physical");
    expect(r.domainTrends[0].trend.direction).toBe("up");
    expect(r.domainTrends[0].trend.delta).toBe(50);

    expect(r.mostConsistentHabits).toHaveLength(2);
    expect(r.mostConsistentHabits[0]).toMatchObject({
      habitId: "w",
      name: "Water",
      daysLogged: 6,
      completionRate: 1,
    });
    expect(r.mostConsistentHabits[1]).toMatchObject({
      habitId: "r",
      daysLogged: 6,
      completionRate: 0.7, // 4/6 rounded to 1dp
    });
  });

  it("emits a domain improvement highlight above the delta threshold", () => {
    const totals = [...["2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 40))];
    const domainScores = [...["2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => ({ scoreDate: d, score: 40, domain: "non_negotiables" }))];
    const r = buildInsights(makeInput({ totals, domainScores }));
    expect(r.highlights.some((h) => h.includes("non-negotiables improved"))).toBe(true);
  });
});

describe("buildInsights highlights", () => {
  it("highlights an active streak and strong consistency", () => {
    const totals = [
      ...["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => score(d, 60)),
      score("2026-08-14", 60),
    ];
    const logs = [
      ...["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"].map((d) => ({ habit_id: "w", log_date: d, completed: true })),
    ];
    const habits = [{ id: "w", name: "Water", domain: "physical" }];
    const r = buildInsights(makeInput({ totals, logs, habits }));
    expect(r.currentStreak).toBe(9); // 08-05..08-13; 08-14 is asOf
    expect(r.windowActiveDays).toBe(10);
    expect(r.highlights).toContainEqual("You're on a 9-day streak — protect it.");
    expect(r.highlights.some((h) => h.includes('Most consistent: "Water"'))).toBe(true);
    expect(r.highlights.some((h) => h.includes("Active 100% of days"))).toBe(true);
  });

  it("keeps the warm fallback when only a little data exists", () => {
    const r = buildInsights(makeInput({ totals: [score("2026-08-13", 20)] }));
    expect(r.highlights).toContain("You've logged some days — keep showing up.");
  });
});