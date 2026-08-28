import { addDays, dayDiff } from "./date";
import { computeBestStreak } from "./freezes";
import { computeUserStreak } from "./streak";

/**
 * History analytics + trend insights. Pure functions over the same daily
 * score rows that drive streak/scoring, so web and device stay identical.
 */

export interface InsightsInput {
  totals: Array<{ scoreDate: string; score: number }>;
  domainScores: Array<{ scoreDate: string; score: number; domain: string }>;
  habits: Array<{ id: string; domain: string; name?: string }>;
  logs: Array<{
    habit_id: string;
    log_date: string;
    points_earned?: number;
    completed?: boolean;
  }>;
  asOfDate: string;
  /** Days per comparison window for week-over-week deltas. Default 7. */
  weekDays?: number;
}

export interface Trend {
  lastAvg: number;
  prevAvg: number;
  delta: number;
  direction: "up" | "down" | "flat";
}

export interface DomainTrend {
  domain: string;
  trend: Trend;
}

export interface HabitConsistency {
  habitId: string;
  name: string;
  domain: string;
  daysLogged: number;
  completionRate: number;
}

export interface InsightsResult {
  windowActiveDays: number;
  windowDays: number;
  consistency: number;
  averageScore: number | null;
  bestDay: { scoreDate: string; score: number } | null;
  currentStreak: number;
  bestStreakInWindow: number;
  totalTrend: Trend;
  domainTrends: DomainTrend[];
  mostConsistentHabits: HabitConsistency[];
  highlights: string[];
}

const DOMAIN_LABELS: Record<string, string> = {
  non_negotiables: "Non-Negotiables",
  academia: "Academia",
  physical: "Physical",
  personal_growth: "Personal Growth",
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Average daily score over the inclusive window; missing days count as 0. */
function averageOver(
  rows: Array<{ scoreDate: string; score: number }>,
  from: string,
  to: string,
): number {
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.scoreDate, Number(r.score));
  let sum = 0;
  let cursor = from;
  for (;;) {
    sum += byDate.get(cursor) ?? 0;
    if (cursor === to) break;
    cursor = addDays(cursor, 1);
  }
  return sum / (dayDiff(from, to) + 1);
}

function trendFor(
  rows: Array<{ scoreDate: string; score: number }>,
  asOfDate: string,
  weekDays: number,
): Trend {
  const lastFrom = addDays(asOfDate, -weekDays);
  const lastTo = addDays(asOfDate, -1);
  const prevFrom = addDays(asOfDate, -(2 * weekDays));
  const prevTo = addDays(asOfDate, -1 - weekDays);
  const lastAvg = round1(averageOver(rows, lastFrom, lastTo));
  const prevAvg = round1(averageOver(rows, prevFrom, prevTo));
  const delta = round1(lastAvg - prevAvg);
  const direction: Trend["direction"] =
    delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  return { lastAvg, prevAvg, delta, direction };
}

export function buildInsights(input: InsightsInput): InsightsResult {
  const asOf = input.asOfDate;
  const weekDays = Math.max(1, input.weekDays ?? 7);
  const totals = input.totals.map((t) => ({
    scoreDate: t.scoreDate,
    score: Number(t.score),
  }));
  const scoreByDate = new Map(totals.map((t) => [t.scoreDate, t.score]));

  const dates = totals.map((t) => t.scoreDate).sort();
  const minDate = dates.length > 0 ? dates[0] : asOf;
  const windowDays = dayDiff(minDate, asOf) + 1;
  const windowActiveDays = dates.filter((d) => (scoreByDate.get(d) ?? 0) > 0).length;
  const consistency = round1(windowActiveDays / Math.max(1, windowDays));

  const averageScore =
    windowActiveDays > 0
      ? round1(
          totals.reduce((sum, t) => sum + t.score, 0) / windowActiveDays,
        )
      : null;

  let bestDay: { scoreDate: string; score: number } | null = null;
  for (const t of totals) {
    if (t.score > 0 && (!bestDay || t.score > bestDay.score)) {
      bestDay = { scoreDate: t.scoreDate, score: t.score };
    }
  }

  const currentStreak = computeUserStreak({ totalScores: totals, asOfDate: asOf });
  const bestStreakInWindow = computeBestStreak(totals);
  const totalTrend = trendFor(totals, asOf, weekDays);

  const domains = [...new Set(input.domainScores.map((r) => r.domain))];
  const domainTrends = domains
    .map((domain) => ({
      domain,
      trend: trendFor(
        input.domainScores
          .filter((r) => r.domain === domain)
          .map((r) => ({ scoreDate: r.scoreDate, score: Number(r.score) })),
        asOf,
        weekDays,
      ),
    }))
    .sort((a, b) => Math.abs(b.trend.delta) - Math.abs(a.trend.delta));

  const habitMeta = new Map(input.habits.map((h) => [h.id, h]));
  const logsByHabit = new Map<string, Map<string, boolean>>();
  for (const log of input.logs) {
    const ok = (log.points_earned ?? 0) > 0 || log.completed === true;
    let days = logsByHabit.get(log.habit_id);
    if (!days) {
      days = new Map();
      logsByHabit.set(log.habit_id, days);
    }
    days.set(log.log_date, (days.get(log.log_date) ?? false) || ok);
  }
  const mostConsistentHabits = [...logsByHabit.entries()]
    .map(([habitId, days]) => {
      const entries = [...days.values()];
      const meta = habitMeta.get(habitId);
      return {
        habitId,
        name: meta?.name ?? habitId,
        domain: meta?.domain ?? "general",
        daysLogged: entries.length,
        completionRate: entries.length > 0 ? round1(entries.filter(Boolean).length / entries.length) : 0,
      };
    })
    .sort(
      (a, b) =>
        b.completionRate - a.completionRate || b.daysLogged - a.daysLogged,
    )
    .slice(0, 3);

  const highlights: string[] = [];
  if (currentStreak >= 3) {
    highlights.push(`You're on a ${currentStreak}-day streak — protect it.`);
  }
  if (totalTrend.direction === "up" && totalTrend.delta >= 5) {
    highlights.push(
      `Total score trending up ${totalTrend.delta} pts vs the previous week.`,
    );
  }
  if (totalTrend.direction === "down" && totalTrend.delta <= -10) {
    highlights.push(
      `Total dipped ${Math.abs(totalTrend.delta).toFixed(0)} pts this week — a small reset rebuilds momentum.`,
    );
  }
  const topHabit = mostConsistentHabits[0];
  if (topHabit && topHabit.daysLogged >= 3 && topHabit.completionRate >= 0.6) {
    highlights.push(
      `Most consistent: "${topHabit.name}" — completed ${pct(
        topHabit.completionRate,
      )} of logged days.`,
    );
  }
  const topDomain = domainTrends.find(
    (d) => d.trend.direction === "up" && d.trend.delta >= 3,
  );
  if (topDomain) {
    highlights.push(
      `${(DOMAIN_LABELS[topDomain.domain] ?? topDomain.domain).toLowerCase()} improved ${topDomain.trend.delta} pts this week.`,
    );
  }
  if (consistency >= 0.5 && windowActiveDays >= 10) {
    highlights.push(
      `Active ${pct(consistency)} of days in view — strong rhythm.`,
    );
  }
  if (highlights.length === 0 && windowActiveDays === 0) {
    highlights.push("No activity in view yet — log your first habit to start a trend.");
  } else if (highlights.length === 0) {
    highlights.push("You've logged some days — keep showing up.");
  }

  return {
    windowActiveDays,
    windowDays,
    consistency,
    averageScore,
    bestDay,
    currentStreak,
    bestStreakInWindow,
    totalTrend,
    domainTrends,
    mostConsistentHabits,
    highlights,
  };
}