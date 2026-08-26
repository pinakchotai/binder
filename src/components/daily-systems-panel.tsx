"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Lightning,
  CircleNotch,
  SunHorizon,
  Drop,
  Brain,
  Barbell,
  WifiSlash,
  Moon,
  FloppyDisk,
  Trophy,
} from "@phosphor-icons/react";
import { supabase, getUserId, type DailyNonNegotiable, type WaterIntake } from "@/lib/supabase";
import { useSettings } from "@/lib/settings";

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const defaultState = {
  wake_on_time: false,
  hydrated: false,
  meditation_minutes: 0,
  workout_completed: false,
  screen_disconnect: false,
  sleep_on_time: false,
};

interface HabitToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  points: number;
}

function HabitToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  points,
}: HabitToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 border-[2px] px-4 py-3 transition-colors ${
        checked
          ? "border-accent/50 bg-accent/10"
          : "border-input-border bg-input-bg hover:border-input-border/80"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center border-[2px] transition-colors ${
          checked
            ? "border-accent/50 bg-accent/20"
            : "border-input-border bg-transparent"
        }`}
      >
        <Icon
          className={`h-3.5 w-3.5 ${checked ? "text-accent" : "text-muted"}`}
        />
      </div>
      <span
        className={`flex-1 text-left font-mono text-xs font-bold uppercase tracking-wider ${
          checked ? "text-accent" : "text-muted"
        }`}
      >
        {label}
      </span>
      <span className="font-mono text-[10px] text-muted">+{points}</span>
      <div
        className={`h-4 w-4 border-[2px] transition-colors ${
          checked ? "border-accent bg-accent" : "border-input-border bg-transparent"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 16 16"
            className="h-full w-full p-[2px] text-background"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M3 8.5L6.5 12L13 4" />
          </svg>
        )}
      </div>
    </button>
  );
}

interface AttributeBarProps {
  label: string;
  abbr: string;
  value: number;
  max: number;
  color: string;
}

function AttributeBar({ label, abbr, value, max, color }: AttributeBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          {abbr}
        </span>
        <span className="font-mono text-[10px] text-muted">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full border border-input-border bg-input-bg">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 font-mono text-[9px] text-muted/60">{label}</p>
    </div>
  );
}

export default function DailySystemsPanel() {
  const { settings } = useSettings();
  const [record, setRecord] = useState<DailyNonNegotiable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayWaterMl, setTodayWaterMl] = useState(0);

  const [form, setForm] = useState(defaultState);

  const fetchToday = useCallback(async () => {
    const today = getTodayDateString();
    const [nonRes, waterRes] = await Promise.all([
      supabase
        .from("daily_non_negotiables")
        .select("*")
        .eq("log_date", today)
        .maybeSingle(),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`),
    ]);

    const waterTotal = (waterRes.data ?? []).reduce(
      (sum, e) => sum + e.amount_ml,
      0,
    );
    setTodayWaterMl(waterTotal);
    const autoHydrated = waterTotal >= settings.waterTargetMl;

    if (nonRes.error) {
      console.error("Failed to fetch daily non-negotiables:", JSON.stringify(nonRes.error));
    }

    if (nonRes.data) {
      setRecord(nonRes.data);
      setForm({
        wake_on_time: nonRes.data.wake_on_time,
        hydrated: autoHydrated,
        meditation_minutes: nonRes.data.meditation_minutes,
        workout_completed: nonRes.data.workout_completed,
        screen_disconnect: nonRes.data.screen_disconnect,
        sleep_on_time: nonRes.data.sleep_on_time,
      });
    } else {
      setRecord(null);
      setForm((prev) => ({ ...prev, hydrated: autoHydrated }));
    }
    setLoading(false);
  }, [settings.waterTargetMl]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const autoHydrated = todayWaterMl >= settings.waterTargetMl;
  const hydrationPct = Math.min((todayWaterMl / settings.waterTargetMl) * 100, 100);

  const [rpcScore, setRpcScore] = useState<{ score: number; attributes: { discipline: number; focus: number; vitality: number; recovery: number }; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("compute_daily_score", {
      p_wake_on_time: form.wake_on_time,
      p_hydrated: form.hydrated,
      p_meditation_minutes: form.meditation_minutes,
      p_workout_completed: form.workout_completed,
      p_screen_disconnect: form.screen_disconnect,
      p_sleep_on_time: form.sleep_on_time,
      p_meditation_target_min: settings.meditationTargetMin,
    }).then(({ data }) => {
      if (!cancelled && data) setRpcScore(data);
    });
    return () => { cancelled = true; };
  }, [form.wake_on_time, form.hydrated, form.meditation_minutes, form.workout_completed, form.screen_disconnect, form.sleep_on_time, settings.meditationTargetMin]);

  const liveScore = rpcScore?.score ?? 0;
  const attributes = rpcScore?.attributes ?? { discipline: 0, focus: 0, vitality: 0, recovery: 0 };

  const toggle = (key: keyof typeof defaultState) => (val: boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const today = getTodayDateString();
    const userId = await getUserId();
    const payload = {
      user_id: userId,
      log_date: today,
      ...form,
      hydrated: autoHydrated || form.hydrated,
    };

    if (record) {
      const { error } = await supabase
        .from("daily_non_negotiables")
        .update(payload)
        .eq("id", record.id);
      if (error) console.error("Failed to save:", JSON.stringify(error));
    } else {
      const { data, error } = await supabase
        .from("daily_non_negotiables")
        .insert(payload)
        .select()
        .single();
      if (error) console.error("Failed to save:", JSON.stringify(error));
      else setRecord(data);
    }

    await fetchToday();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b-[2px] border-card-border bg-card-bg px-8 py-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border-[2px] border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Daily Systems
          </span>
        </div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-foreground">
          Non-Negotiables
        </h2>
        <p className="mt-1 font-mono text-xs text-muted">
          Complete your 6 daily habits. Earn up to 100 points.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-5xl">
          {loading ? (
            <div className="flex justify-center py-12">
              <CircleNotch className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
              {/* Left: Checklist */}
              <div className="border-[2px] border-card-border bg-card-bg">
                <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
                  <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
                    <Lightning className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                    Today&apos;s Checklist
                  </h3>
                  <span className="ml-auto font-mono text-[10px] text-muted">
                    {getTodayDateString()}
                  </span>
                </div>

                <div className="space-y-2 p-5">
                  <HabitToggle
                    icon={SunHorizon}
                    label="Wake on time"
                    checked={form.wake_on_time}
                    onChange={toggle("wake_on_time")}
                    points={15}
                  />
                  {/* Hydration (auto from water tracker) */}
                  <div
                    className={`border-[2px] px-4 py-3 transition-colors ${
                      autoHydrated
                        ? "border-accent/50 bg-accent/10"
                        : "border-input-border bg-input-bg"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center border-[2px] transition-colors ${
                          autoHydrated
                            ? "border-accent/50 bg-accent/20"
                            : "border-input-border bg-transparent"
                        }`}
                      >
                        <Drop
                          className={`h-3.5 w-3.5 ${
                            autoHydrated ? "text-accent" : "text-muted"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <span
                          className={`font-mono text-xs font-bold uppercase tracking-wider ${
                            autoHydrated ? "text-accent" : "text-muted"
                          }`}
                        >
                          Hydrated
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-muted">
                          (auto &middot; {(todayWaterMl / 1000).toFixed(1)}/{(settings.waterTargetMl / 1000).toFixed(1)}L)
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted">+10</span>
                      <div
                        className={`h-4 w-4 border-[2px] transition-colors ${
                          autoHydrated
                            ? "border-accent bg-accent"
                            : "border-input-border bg-transparent"
                        }`}
                      >
                        {autoHydrated && (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-full w-full p-[2px] text-background"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path d="M3 8.5L6.5 12L13 4" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {/* Mini hydration bar */}
                    {!autoHydrated && (
                      <div className="mt-2 ml-10">
                        <div className="h-1.5 w-full border border-input-border bg-input-bg">
                          <div
                            className="h-full bg-blue-400 transition-all duration-300"
                            style={{ width: `${hydrationPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <HabitToggle
                    icon={Moon}
                    label="Sleep on time"
                    checked={form.sleep_on_time}
                    onChange={toggle("sleep_on_time")}
                    points={20}
                  />
                  <HabitToggle
                    icon={Barbell}
                    label="Workout completed"
                    checked={form.workout_completed}
                    onChange={toggle("workout_completed")}
                    points={20}
                  />
                  <HabitToggle
                    icon={WifiSlash}
                    label="Screen disconnect"
                    checked={form.screen_disconnect}
                    onChange={toggle("screen_disconnect")}
                    points={15}
                  />

                  {/* Meditation (special: has number input) */}
                  <div
                    className={`border-[2px] px-4 py-3 transition-colors ${
                      form.meditation_minutes >= settings.meditationTargetMin
                        ? "border-accent/50 bg-accent/10"
                        : "border-input-border bg-input-bg"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center border-[2px] transition-colors ${
                          form.meditation_minutes >= settings.meditationTargetMin
                            ? "border-accent/50 bg-accent/20"
                            : "border-input-border bg-transparent"
                        }`}
                      >
                        <Brain
                          className={`h-3.5 w-3.5 ${
                            form.meditation_minutes >= settings.meditationTargetMin
                              ? "text-accent"
                              : "text-muted"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <span
                          className={`font-mono text-xs font-bold uppercase tracking-wider ${
                            form.meditation_minutes >= settings.meditationTargetMin
                              ? "text-accent"
                              : "text-muted"
                          }`}
                        >
                          Meditation
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-muted">
                          (target: {settings.meditationTargetMin} min)
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={form.meditation_minutes}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            meditation_minutes: Math.max(
                              0,
                              parseInt(e.target.value) || 0,
                            ),
                          }))
                        }
                        className="w-16 border-[2px] border-input-border bg-input-bg px-2 py-1 text-center font-mono text-sm text-foreground focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none"
                      />
                      <span className="font-mono text-[10px] text-muted">
                        min
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        +20
                      </span>
                      <div
                        className={`h-4 w-4 border-[2px] transition-colors ${
                          form.meditation_minutes >= settings.meditationTargetMin
                            ? "border-accent bg-accent"
                            : "border-input-border bg-transparent"
                        }`}
                      >
                        {form.meditation_minutes >= settings.meditationTargetMin && (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-full w-full p-[2px] text-background"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path d="M3 8.5L6.5 12L13 4" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-2 flex w-full items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FloppyDisk className="h-3.5 w-3.5" />
                    )}
                    {saved ? "Saved!" : "Save Progress"}
                  </button>
                </div>
              </div>

              {/* Right: Score + Attributes */}
              <div className="flex flex-col gap-5">
                {/* Score */}
                <div className="border-[2px] border-card-border bg-card-bg">
                  <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
                      <Trophy className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                      Today&apos;s Score
                    </h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-mono text-5xl font-bold tabular-nums text-foreground">
                        {liveScore}
                      </span>
                      <span className="font-mono text-lg text-muted">/100</span>
                    </div>
                    {/* Mini bar */}
                    <div className="mt-4 h-2 w-full border border-input-border bg-input-bg">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${liveScore}%` }}
                      />
                    </div>
                    <p className="mt-2 text-center font-mono text-[10px] text-muted">
                      {rpcScore?.message}
                    </p>
                  </div>
                </div>

                {/* Player Attributes */}
                <div className="border-[2px] border-card-border bg-card-bg">
                  <div className="flex items-center gap-2.5 border-b-[2px] border-card-border px-5 py-3">
                    <div className="flex h-7 w-7 items-center justify-center border-[2px] border-accent/30 bg-accent/10">
                      <Lightning className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                      Player Attributes
                    </h3>
                  </div>
                  <div className="space-y-4 p-5">
                    <AttributeBar
                      label="Wake + Sleep"
                      abbr="DIS (Discipline)"
                      value={attributes.discipline}
                      max={100}
                      color="#f59e0b"
                    />
                    <AttributeBar
                      label="Meditation"
                      abbr="FOC (Focus)"
                      value={attributes.focus}
                      max={100}
                      color="#f59e0b"
                    />
                    <AttributeBar
                      label="Hydration + Workout"
                      abbr="VIT (Vitality)"
                      value={attributes.vitality}
                      max={100}
                      color="#f59e0b"
                    />
                    <AttributeBar
                      label="Disconnect + Sleep"
                      abbr="REC (Recovery)"
                      value={attributes.recovery}
                      max={100}
                      color="#f59e0b"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
