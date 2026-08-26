"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCloseSquareBold } from "@ninzapp/solar-icons/bold";
import {
  computeStreaks,
  useHistoryData,
} from "@/lib/dashboard-data";
import { DOMAIN_IDS, DOMAIN_META, type DomainId } from "@/lib/domains";
import type { Habit, HabitLog } from "@/lib/supabase";
import HistoryLineChart, {
  SERIES_KEY,
  type HistoryRow,
} from "@/components/history-line-chart";
import HistoryHeatmap from "@/components/history-heatmap";
import { Card } from "@/components/lithos";

type Filter = DomainId | "all";

function prettyDate(ds: string): string {
  return new Date(ds + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const { bundle, loading, error } = useHistoryData();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const view = useMemo(() => {
    type View = {
      rows: HistoryRow[];
      scoresByDate: Map<string, number>;
      stats: {
        avg: number | null;
        best: number | null;
        activeDays: number;
        currentStreak: number;
        bestStreak: number;
      };
      logsByDate: Map<string, { habit: Habit; log: HabitLog }[]>;
    };
    const empty: View = {
      rows: [],
      scoresByDate: new Map(),
      stats: { avg: null, best: null, activeDays: 0, currentStreak: 0, bestStreak: 0 },
      logsByDate: new Map(),
    };
    if (!bundle) return empty;

    const totalMap = new Map<string, number>();
    for (const t of bundle.totals) totalMap.set(t.score_date, Number(t.score));
    const domainMaps = new Map<DomainId, Map<string, number>>();
    for (const d of DOMAIN_IDS) domainMaps.set(d, new Map());
    for (const r of bundle.domainScores) {
      if ((DOMAIN_IDS as readonly string[]).includes(r.domain)) {
        domainMaps.get(r.domain as DomainId)!.set(r.score_date, Number(r.score));
      }
    }

    const activeMap = filter === "all" ? totalMap : domainMaps.get(filter)!;
    const dates = [...activeMap.keys()].sort();

    const rows: HistoryRow[] = dates.map((ds) => {
      const row: HistoryRow = {
        date: new Date(ds + "T00:00:00"),
        Total: totalMap.get(ds) ?? null,
      };
      for (const d of DOMAIN_IDS) {
        row[SERIES_KEY[d]] = domainMaps.get(d)!.get(ds) ?? null;
      }
      return row;
    });

    const values = [...activeMap.values()];
    const streaks = computeStreaks(new Set(activeMap.keys()));

    const logsByDate = new Map<string, { habit: Habit; log: HabitLog }[]>();
    for (const log of bundle.logs) {
      const habit = bundle.habits.find((h) => h.id === log.habit_id);
      if (!habit) continue;
      let arr = logsByDate.get(log.log_date);
      if (!arr) {
        arr = [];
        logsByDate.set(log.log_date, arr);
      }
      arr.push({ habit, log });
    }

    return {
      rows,
      scoresByDate: activeMap,
      stats: {
        avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
        best: values.length ? Math.max(...values) : null,
        activeDays: values.length,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
      },
      logsByDate,
    };
  }, [bundle, filter]);

  const statCells = [
    { label: "AVG SCORE", value: view.stats.avg == null ? "--" : String(Math.round(view.stats.avg)) },
    { label: "BEST DAY", value: view.stats.best == null ? "--" : String(Math.round(view.stats.best)) },
    { label: "ACTIVE DAYS", value: String(view.stats.activeDays) },
    { label: "CUR STREAK", value: `${view.stats.currentStreak}d` },
    { label: "BEST STREAK", value: `${view.stats.bestStreak}d` },
  ];

  const detail = selectedDate
    ? {
        dateLabel: prettyDate(selectedDate),
        score: view.scoresByDate.get(selectedDate),
        entries: view.logsByDate.get(selectedDate) ?? [],
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10" id="main-content">
      <div className="mb-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
          History
        </p>
        <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-foreground">
          Last 90 Days
        </h1>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/40 bg-red-500/[0.07] px-4 py-3">
          <p className="font-mono text-[11px] text-red-300">{error}</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...DOMAIN_IDS] as Filter[]).map((f) => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-card-border text-muted hover:border-white/20 hover:text-foreground/70"
              }`}
            >
              {f === "all" ? "All Domains" : DOMAIN_META[f].label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {statCells.map((cell) => (
          <Card key={cell.label} className="px-3.5 py-3 card-depth">
            <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-muted">
              {cell.label}
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
              {cell.value}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mb-6 p-4 card-depth">
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
          Daily Score Trend
        </p>
        {loading && !bundle ? (
          <div className="h-48 animate-pulse bg-input-bg" />
        ) : (
          <HistoryLineChart rows={view.rows} filter={filter} />
        )}
      </Card>

      <Card className="mb-6 p-4 card-depth">
        <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
          Daily Activity — click a day for detail
        </p>
        {loading && !bundle ? (
          <div className="h-28 animate-pulse bg-input-bg" />
        ) : (
          <HistoryHeatmap
            scoresByDate={view.scoresByDate}
            onSelect={(ds) => setSelectedDate(ds)}
          />
        )}
      </Card>

      {detail && (
        <EscapeHandler onEscape={() => setSelectedDate(null)} />
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedDate(null)}
        >
          <Card
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
                  Day Detail
                </p>
                <h2 className="mt-0.5 font-mono text-sm font-bold tracking-tight text-foreground">
                  {detail.dateLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex h-10 w-10 items-center justify-center text-muted hover:text-foreground/80"
                aria-label="Close"
              >
                <IconCloseSquareBold className="h-4 w-4" />
              </button>
            </div>

            <p className="font-mono text-2xl font-bold tabular-nums text-accent">
              {detail.score == null ? "--" : Math.round(detail.score)}
              <span className="text-sm text-muted">/100 total</span>
            </p>

            <div className="my-4 h-[1px] bg-card-border" />

            {detail.entries.length === 0 ? (
              <p className="py-4 text-center font-mono text-[10px] uppercase tracking-wider text-muted">
                No habits logged this day
              </p>
            ) : (
              <ul className="space-y-1.5">
                {detail.entries.map(({ habit, log }) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 border border-input-border bg-input-bg px-3 py-2"
                  >
                    <span className="truncate font-mono text-[11px] text-foreground/90">
                      {habit.name}
                    </span>
                    <span
                      className={`shrink-0 border px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums ${
                        Number(log.points_earned) > 0
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-card-border text-muted"
                      }`}
                    >
                      +{Number(log.points_earned)} PTS
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function EscapeHandler({ onEscape }: { onEscape: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEscape]);
  return null;
}
