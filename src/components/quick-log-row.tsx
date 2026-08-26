"use client";

import { useState } from "react";
import { CaretDown, CaretUp, CircleNotch, ArrowClockwise } from "@phosphor-icons/react";
import type { Habit, HabitLog } from "@/lib/supabase";
import { DOMAIN_META, type DomainId } from "@/lib/domains";

type LogPatch = Partial<Pick<HabitLog, "completed" | "value" | "checkpoints_done">>;

const DOMAIN_BADGE: Record<DomainId, string> = {
  non_negotiables: "border-red-500/30 bg-red-500/10 text-red-300",
  academia: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  physical: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  personal_growth: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

const DIFF_POINTS = { easy: 10, medium: 20, hard: 30 } as const;

const GLYPH: Record<Habit["type"], string> = {
  recurring: "[ ]",
  volume: "📊",
  milestone: "🎯",
};

interface QuickLogRowProps {
  habit: Habit;
  todayLog: HabitLog | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDismissError: () => void;
  onChange: (patch: LogPatch) => void;
}

export default function QuickLogRow({
  habit,
  todayLog,
  isLoading,
  error,
  onRetry,
  onDismissError,
  onChange,
}: QuickLogRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [pulsing, setPulsing] = useState(false);
  const [flashAdd, setFlashAdd] = useState(false);

  const expandable = habit.type !== "recurring";
  const points = todayLog?.points_earned ?? null;
  const max =
    habit.type === "recurring"
      ? DIFF_POINTS[habit.difficulty]
      : habit.type === "volume"
        ? Number(habit.target_value ?? 0) > 0
          ? DIFF_POINTS[habit.difficulty]
          : 0
        : Number(habit.checkpoint_count ?? 1) * DIFF_POINTS[habit.difficulty];

  const pct =
    habit.type === "volume" && habit.target_value
      ? Math.min(Number(todayLog?.value ?? 0) / Number(habit.target_value), 1) * 100
      : habit.type === "milestone" && habit.checkpoint_count
        ? Math.min(Number(todayLog?.checkpoints_done ?? 0) / Number(habit.checkpoint_count), 1) * 100
        : todayLog?.completed
          ? 100
          : 0;

  const commitValue = () => {
    const v = Number(draft);
    if (!draft || !Number.isFinite(v)) return;
    const cur = Number(todayLog?.value ?? 0);
    onChange({ value: Math.max(0, cur + v) });
    setDraft("");
    setFlashAdd(true);
    setTimeout(() => setFlashAdd(false), 410);
  };

  const steps = habit.type === "milestone" ? Number(habit.checkpoint_count ?? 0) : 0;
  const doneSteps = Number(todayLog?.checkpoints_done ?? 0);

  return (
      <div className="border-[2px] border-card-border bg-card-bg transition-colors hover:border-white/15">
      <div className="flex items-center gap-3 px-4 py-3">
        {habit.type === "recurring" ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              onChange({ completed: !(todayLog?.completed === true) });
              if (!todayLog?.completed) {
                setPulsing(true);
                setTimeout(() => setPulsing(false), 260);
              }
            }}
            className={`flex h-5 w-5 shrink-0 items-center justify-center border-[2px] font-mono text-[10px] transition-colors active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50 ${
              todayLog?.completed
                ? "border-accent bg-accent text-button-text"
                : "border-input-border hover:border-accent/40"
            } ${pulsing ? "check-pulse" : ""}`}
            aria-label="Toggle habit"
          >
            {todayLog?.completed ? "✓" : ""}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex h-10 w-10 shrink-0 items-center justify-center font-mono text-sm"
            aria-label="Expand habit"
          >
            {GLYPH[habit.type]}
          </button>
        )}

        <button
          type="button"
          onClick={() => expandable && setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left"
        >
          <span className="truncate font-sans text-sm font-bold tracking-tight text-foreground">
            {habit.name}
          </span>
          <span
            className={`hidden shrink-0 border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider sm:inline ${
              DOMAIN_BADGE[habit.domain as DomainId]
            }`}
          >
            {DOMAIN_META[habit.domain as DomainId].label}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {expandable && (
            <span className="font-mono text-[10px] tabular-nums text-muted">
              {habit.type === "milestone"
                ? `${doneSteps}/${habit.checkpoint_count}`
                : `${todayLog?.value ?? 0}/${habit.target_value}`}
            </span>
          )}
          <span
            className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums ${
              points && points > 0
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-input-border text-muted"
            }`}
          >
            {points ?? 0}/{max} PTS
          </span>
          {expandable && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex h-10 w-10 items-center justify-center text-muted hover:text-foreground/70"
              aria-label="Toggle expand"
            >
              {expanded ? <CaretUp className="h-3.5 w-3.5" /> : <CaretDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expandable && (
        <div className="mx-4 mb-2 h-1 bg-input-bg">
          <div className="h-full bg-accent/70 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}

      {expanded && habit.type === "volume" && (
        <div className="flex items-center gap-2 border-t-[2px] border-card-border px-4 py-3">
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitValue()}
            placeholder={`+ add (target ${habit.target_value})`}
            className="w-36 border-[2px] border-input-border bg-input-bg px-2 py-1.5 font-mono text-xs tabular-nums text-foreground placeholder:font-normal placeholder:text-muted/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/50 outline-none"
          />
          <button
            type="button"
            onClick={commitValue}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 border-[2px] border-button-bg bg-button-bg px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover disabled:opacity-60 ${flashAdd ? "submit-flash" : ""}`}
          >
            {isLoading && <CircleNotch className="h-3 w-3 animate-spin" />}
            Add
          </button>
        </div>
      )}

      {expanded && habit.type === "milestone" && (
        <div className="space-y-1 border-t-[2px] border-card-border px-4 py-3">
          {Array.from({ length: steps }, (_, i) => i + 1).map((step) => {
            const checked = step <= doneSteps;
            return (
              <button
                key={step}
                type="button"
                disabled={isLoading || (!checked && step !== doneSteps + 1)}
                onClick={() => onChange({ checkpoints_done: step })}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  checked
                    ? "text-accent"
                    : step === doneSteps + 1
                      ? "text-foreground/80 hover:bg-white/[0.03]"
                      : "text-muted/50"
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center border-[2px] text-[8px] ${
                    checked ? "border-accent bg-accent text-button-text" : "border-input-border"
                  }`}
                >
                  {checked ? "✓" : ""}
                </span>
                Step {String(step).padStart(2, "0")}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 border-t-[2px] border-red-500/40 bg-red-500/[0.07] px-4 py-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-red-300">
            Failed to save — {error}
          </p>
          <button
            type="button"
            onClick={onDismissError}
            className="font-mono text-[10px] uppercase text-muted hover:text-foreground/70"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-accent hover:underline"
          >
            <ArrowClockwise className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
