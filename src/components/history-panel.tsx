"use client";

import { useEffect, useState, useCallback } from "react";
import { IconAltArrowLeftBold, IconAltArrowRightBold, IconWaterBold, IconCheckSquareBold, IconRefreshBold, IconBoltBold } from "@ninzapp/solar-icons/bold";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/lib/settings";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Streak = consecutive days with score >= 50, counting back from today.
function ScoreStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("daily_non_negotiables")
        .select("log_date, daily_score")
        .gte("daily_score", 50)
        .order("log_date", { ascending: false })
        .limit(365);
      if (cancelled) return;
      const goodDays = new Set((data ?? []).map((r) => r.log_date));
      let count = 0;
      const cursor = new Date();
      // If today isn't done yet, start counting from yesterday.
      const todayKey = formatDate(cursor);
      if (!goodDays.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
      while (goodDays.has(formatDate(cursor))) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      }
      setStreak(count);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <IconBoltBold className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Score Streak
        </h3>
        <span className="ml-auto font-mono text-[10px] text-muted">
          DAYS WITH SCORE &ge; 50
        </span>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-2"><IconRefreshBold className="h-4 w-4 animate-spin text-muted" /></div>
        ) : (
          <div className="flex items-baseline justify-center gap-2">
            <span className={`font-mono text-4xl font-bold tabular-nums ${streak > 0 ? "text-accent" : "text-muted"}`}>
              {streak}
            </span>
            <span className="font-mono text-xs text-muted">
              {streak === 1 ? "day" : "days"} strong
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function WaterHistory() {
  const { settings } = useSettings();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [dailyTotals, setDailyTotals] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  const fetchWeek = useCallback(async (start: Date) => {
    setLoading(true);
    const end = addDays(start, 6);
    const { data } = await supabase
      .from("water_intake")
      .select("amount_ml, created_at")
      .gte("created_at", `${formatDate(start)}T00:00:00`)
      .lte("created_at", `${formatDate(end)}T23:59:59`);
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const row of data ?? []) {
      const d = new Date(row.created_at);
      const dayIdx = (d.getDay() + 6) % 7;
      totals[dayIdx] += row.amount_ml;
    }
    setDailyTotals(totals);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  const maxMl = Math.max(...dailyTotals, settings.waterTargetMl);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${formatDate(weekStart)} — ${formatDate(weekEnd)}`;

  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-blue-400/30 bg-blue-400/10">
          <IconWaterBold className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Water History
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="border-[2px] border-input-border bg-input-bg p-1 text-muted transition-colors hover:border-accent/40 hover:text-accent">
            <IconAltArrowLeftBold className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-muted px-2">{weekLabel}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="border-[2px] border-input-border bg-input-bg p-1 text-muted transition-colors hover:border-accent/40 hover:text-accent">
            <IconAltArrowRightBold className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-6"><IconRefreshBold className="h-4 w-4 animate-spin text-muted" /></div>
        ) : (
          <>
            <div className="flex items-end gap-2" style={{ height: 140 }}>
              {dailyTotals.map((ml, i) => {
                const pct = maxMl > 0 ? (ml / maxMl) * 100 : 0;
                const hit = ml >= settings.waterTargetMl;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-mono text-[9px] text-muted tabular-nums">
                      {ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : ml > 0 ? `${ml}` : ""}
                    </span>
                    <div className="relative w-full" style={{ height: 100 }}>
                      <div className="absolute left-0 right-0 border-t-[2px] border-dashed border-accent/40" style={{ bottom: `${(settings.waterTargetMl / maxMl) * 100}%` }} />
                      <div className={`absolute bottom-0 w-full transition-all ${hit ? "bg-blue-400" : ml > 0 ? "bg-blue-400/40" : "bg-input-border"}`} style={{ height: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="flex-1 text-center font-mono text-[9px] text-muted">{label}</div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 border-t-[2px] border-card-border pt-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 bg-blue-400" />
                <span className="font-mono text-[9px] text-muted">HIT TARGET</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 bg-blue-400/40" />
                <span className="font-mono text-[9px] text-muted">BELOW TARGET</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-[1px] w-4 border-t-[2px] border-dashed border-accent/40" />
                <span className="font-mono text-[9px] text-muted">TARGET ({settings.waterTargetMl}ml)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HabitHeatmap() {
  const { settings } = useSettings();
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [habitData, setHabitData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(async (start: Date) => {
    setLoading(true);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const { data } = await supabase
      .from("daily_non_negotiables")
      .select("log_date, wake_on_time, hydrated, meditation_minutes, workout_completed, screen_disconnect, sleep_on_time")
      .gte("log_date", formatDate(start))
      .lte("log_date", formatDate(end));
    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const count = [
        row.wake_on_time,
        row.hydrated,
        row.meditation_minutes >= settings.meditationTargetMin,
        row.workout_completed,
        row.screen_disconnect,
        row.sleep_on_time,
      ].filter(Boolean).length;
      map.set(row.log_date, count);
    }
    setHabitData(map);
    setLoading(false);
  }, [settings.meditationTargetMin]);

  useEffect(() => { fetchMonth(monthStart); }, [monthStart, fetchMonth]);

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const numWeeks = Math.ceil((firstDayOfWeek + daysInMonth) / 7);

  const grid: (number | null)[][] = [];
  for (let row = 0; row < 7; row++) {
    grid[row] = [];
    for (let col = 0; col < numWeeks; col++) {
      const dayNum = col * 7 + row - firstDayOfWeek + 1;
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        grid[row][col] = habitData.get(key) ?? 0;
      } else {
        grid[row][col] = null;
      }
    }
  }

  const getShade = (count: number | null) => {
    if (count === null) return "bg-transparent border-transparent";
    if (count === 0) return "bg-accent/[0.06] border-accent/10";
    if (count <= 1) return "bg-accent/[0.15] border-accent/20";
    if (count <= 2) return "bg-accent/[0.25] border-accent/25";
    if (count <= 3) return "bg-accent/40 border-accent/35";
    if (count <= 4) return "bg-accent/60 border-accent/45";
    if (count <= 5) return "bg-accent/80 border-accent/55";
    return "bg-accent border-accent/70";
  };

  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div className="border-[2px] border-card-border bg-card-bg">
      <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
          <IconCheckSquareBold className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          Daily Systems
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMonthStart(new Date(year, month - 1, 1))} className="border-[2px] border-input-border bg-input-bg p-1 text-muted transition-colors hover:border-accent/40 hover:text-accent">
            <IconAltArrowLeftBold className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-muted px-2">{monthLabel}</span>
          <button onClick={() => setMonthStart(new Date(year, month + 1, 1))} className="border-[2px] border-input-border bg-input-bg p-1 text-muted transition-colors hover:border-accent/40 hover:text-accent">
            <IconAltArrowRightBold className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-6"><IconRefreshBold className="h-4 w-4 animate-spin text-muted" /></div>
        ) : (
          <>
            <div className="flex items-start gap-1.5">
              <div className="flex flex-col gap-[3px] pt-0">
                {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
                  <div key={i} className="h-[11px] flex items-center font-mono text-[8px] text-muted w-3">{l}</div>
                ))}
              </div>
              <div className="flex flex-col gap-[3px]">
                {grid.map((row, ri) => (
                  <div key={ri} className="flex gap-[3px]">
                    {row.map((count, ci) => {
                      const dayNum = ci * 7 + ri - firstDayOfWeek + 1;
                      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
                      return (
                        <div key={ci} className="relative group">
                          <div
                            className={`w-[11px] h-[11px] border ${getShade(count)}`}
                            title={inMonth ? `${dayNum} — ${count}/6 habits` : ""}
                          />
                          {inMonth && (
                            <div className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-foreground text-background font-mono text-[8px] whitespace-nowrap pointer-events-none">
                              {MONTHS[month].slice(0, 3)} {dayNum} — {count}/6
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 pt-3">
              <span className="font-mono text-[8px] text-muted mr-1">LESS</span>
              {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                <div key={c} className={`h-[11px] w-[11px] border ${getShade(c)}`} />
              ))}
              <span className="font-mono text-[8px] text-muted ml-1">MORE</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function HistoryPanel() {
  return (
    <div className="space-y-4">
      <ScoreStreak />
      <WaterHistory />
      <HabitHeatmap />
    </div>
  );
}
