"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserId } from "@/lib/supabase";
import { db } from "@/lib/storage";
import type { Habit, HabitLog } from "@/lib/supabase";
import { isDomainId, type DomainId } from "@/lib/domains";

export interface DomainScoreRow {
  id: string;
  user_id: string;
  domain: string;
  score_date: string;
  score: number;
}

export interface TotalScoreRow {
  id: string;
  user_id: string;
  score_date: string;
  score: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getTodayDateString(): string {
  return formatDate(new Date());
}

export function getDaysAgoDateString(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return formatDate(d);
}

/** Oldest-first list of the last n local calendar dates (inclusive of today). */
export function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(getDaysAgoDateString(i));
  return out;
}

function dayDiff(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.round(ms / 86_400_000);
}

export function isCompleted(
  habit: Habit,
  log: HabitLog | null | undefined,
): boolean {
  if (!log) return false;
  if (habit.type === "recurring") return log.completed === true;
  if (habit.type === "volume") {
    return (
      habit.target_value != null &&
      Number(log.value ?? 0) >= Number(habit.target_value)
    );
  }
  return (
    habit.checkpoint_count != null &&
    Number(log.checkpoints_done ?? 0) >= Number(habit.checkpoint_count)
  );
}

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * A "tracked day" is any date with a total_scores row (i.e. at least one
 * habit was logged that day). Current streak stays alive if today OR
 * yesterday is tracked (same convention as activity trackers).
 */
export function computeStreaks(trackedDates: Set<string>): StreakInfo {
  if (trackedDates.size === 0) return { current: 0, best: 0 };
  const sorted = [...trackedDates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = dayDiff(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  const today = getTodayDateString();
  const yesterday = getDaysAgoDateString(1);
  let current = 0;
  if (trackedDates.has(today) || trackedDates.has(yesterday)) {
    current = 1;
    let cursor = trackedDates.has(today) ? today : yesterday;
    for (;;) {
      const d = new Date(cursor + "T00:00:00");
      d.setDate(d.getDate() - 1);
      cursor = formatDate(d);
      if (!trackedDates.has(cursor)) break;
      current++;
    }
  }
  return { current, best };
}

export interface UserXpRow {
  user_id: string;
  total_xp: number;
  current_level: number;
}

export interface BadgeRow {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badges: BadgeRow;
}

export interface DashboardDataBundle {
  habits: Habit[];
  logsByHabit: Map<string, Map<string, HabitLog>>;
  todayScores: Partial<Record<DomainId, number>>;
  latestTotal: TotalScoreRow | null;
  trackedDates: Set<string>;
  userXp: UserXpRow | null;
  earnedBadges: UserBadgeRow[];
}

function buildLogsByHabit(logs: HabitLog[]): Map<string, Map<string, HabitLog>> {
  const map = new Map<string, Map<string, HabitLog>>();
  for (const log of logs) {
    let inner = map.get(log.habit_id);
    if (!inner) {
      inner = new Map<string, HabitLog>();
      map.set(log.habit_id, inner);
    }
    inner.set(log.log_date, log);
  }
  return map;
}

export function useDashboardData() {
  const [bundle, setBundle] = useState<DashboardDataBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBundle =
    useCallback(async (): Promise<DashboardDataBundle> => {
      const userId = await getUserId();
      if (!userId) throw new Error("Not signed in");
      const today = getTodayDateString();
      const [habitsRes, logsRes, dsRes, tsRes, xpRes, ubRes, badgeCatRes] = await Promise.all([
        db.from("habits").select("*").order("created_at", { ascending: true }),
        db.from("habit_logs").select("*").gte("log_date", today),
        db.from("domain_scores").select("*").eq("score_date", today),
        db.from("total_scores").select("*").order("score_date", { ascending: true }),
        db.from("user_xp").select("*").maybeSingle(),
        db.from("user_badges").select("id, user_id, badge_id, earned_at").order("earned_at", { ascending: false }),
        db.from("badges").select("id, key, name, description, icon"),
      ]);
      if (habitsRes.error) throw new Error(habitsRes.error.message);
      if (logsRes.error) throw new Error(logsRes.error.message);
      if (dsRes.error) throw new Error(dsRes.error.message);
      if (tsRes.error) throw new Error(tsRes.error.message);

      const habits = habitsRes.data as Habit[];
      const logsByHabit = buildLogsByHabit(logsRes.data as HabitLog[]);

      const todayScores: Partial<Record<DomainId, number>> = {};
      for (const row of dsRes.data as unknown as DomainScoreRow[]) {
        if (isDomainId(row.domain)) todayScores[row.domain] = Number(row.score);
      }

      const tsRows = tsRes.data as unknown as TotalScoreRow[];
      const latestTotal = tsRows.find((r) => r.score_date === today) ?? null;
      const trackedDates = new Set(tsRows.map((r) => r.score_date));

      const badgeCatMap = new Map<string, BadgeRow>();
      for (const b of (badgeCatRes.data ?? []) as BadgeRow[]) badgeCatMap.set(b.id, b);
      const earnedBadges: UserBadgeRow[] = ((ubRes.data ?? []) as UserBadgeRow[]).map((ub) => ({ ...ub, badges: badgeCatMap.get(ub.badge_id)! })).filter((ub) => ub.badges);

      return { habits, logsByHabit, todayScores, latestTotal, trackedDates, userXp: (xpRes.data as UserXpRow) ?? null, earnedBadges };
    }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBundle();
        if (!cancelled) {
          setBundle(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchBundle]);

  /** Optimistically swap today's log for one habit (null removes it). */
  const patchLogLocal = useCallback(
    (habitId: string, log: HabitLog | null) => {
      setBundle((prev) => {
        if (!prev) return prev;
        const nextMaps = new Map(prev.logsByHabit);
        const inner = new Map(nextMaps.get(habitId) ?? []);
        if (log) inner.set(log.log_date, log);
        else inner.delete(getTodayDateString());
        nextMaps.set(habitId, inner);
        return { ...prev, logsByHabit: nextMaps };
      });
    },
    [],
  );

  /** Refetch authoritative state (scores are trigger-computed server-side). */
  const reload = useCallback(async () => {
    try {
      const data = await fetchBundle();
      setBundle(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, [fetchBundle]);

  return { bundle, loading, error, reload, patchLogLocal };
}

export interface HistoryDataBundle {
  totals: TotalScoreRow[];
  domainScores: DomainScoreRow[];
  habits: Habit[];
  logs: HabitLog[];
}

export function useHistoryData() {
  const [bundle, setBundle] = useState<HistoryDataBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = await getUserId();
        if (!userId) throw new Error("Not signed in");
        if (cancelled) return;
        setLoading(true);
        setError(null);
        const cutoff = getDaysAgoDateString(89);
        const [habitsRes, logsRes, dsRes, tsRes] = await Promise.all([
          db.from("habits").select("*").order("created_at", { ascending: true }),
          db.from("habit_logs").select("*").gte("log_date", cutoff).order("log_date", { ascending: true }),
          db.from("domain_scores").select("*").gte("score_date", cutoff).order("score_date", { ascending: true }),
          db.from("total_scores").select("*").gte("score_date", cutoff).order("score_date", { ascending: true }),
        ]);
        if (habitsRes.error) throw new Error(habitsRes.error.message);
        if (logsRes.error) throw new Error(logsRes.error.message);
        if (dsRes.error) throw new Error(dsRes.error.message);
        if (tsRes.error) throw new Error(tsRes.error.message);
        if (!cancelled) {
          setBundle({
            totals: tsRes.data as unknown as TotalScoreRow[],
            domainScores: dsRes.data as unknown as DomainScoreRow[],
            habits: habitsRes.data as Habit[],
            logs: logsRes.data as HabitLog[],
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { bundle, loading, error };
}
