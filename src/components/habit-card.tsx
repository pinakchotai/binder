"use client";

import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/supabase";

const DIFFICULTY_WEIGHT: Record<Habit["difficulty"], number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

const DIFFICULTY_STYLE: Record<Habit["difficulty"], string> = {
  easy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  medium: "border-accent/40 bg-accent/10 text-accent",
  hard: "border-red-500/40 bg-red-500/10 text-red-400",
};

const TYPE_ORDER: Record<Habit["type"], number> = {
  recurring: 0,
  volume: 1,
  milestone: 2,
};

export function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort(
    (a, b) =>
      TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
      a.created_at.localeCompare(b.created_at),
  );
}

function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M3 8.5L6.5 12L13 4" />
    </svg>
  );
}

interface HabitCardProps {
  habit: Habit;
  todayLog: HabitLog | null;
  onLogChange: (
    patch: Partial<Pick<HabitLog, "completed" | "value" | "checkpoints_done">>,
  ) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDismissError: () => void;
}

export default function HabitCard({
  habit,
  todayLog,
  onLogChange,
  isLoading,
  error,
  onRetry,
  onDismissError,
}: HabitCardProps) {
  const points = todayLog?.points_earned ?? 0;

  let complete = false;
  if (habit.type === "recurring") complete = todayLog?.completed === true;
  else if (habit.type === "volume")
    complete =
      habit.target_value !== null &&
      habit.target_value > 0 &&
      (todayLog?.value ?? 0) >= habit.target_value;
  else
    complete =
      habit.checkpoint_count !== null &&
      habit.checkpoint_count > 0 &&
      (todayLog?.checkpoints_done ?? 0) >= habit.checkpoint_count;

  return (
    <div
      className={`relative border-[2px] transition-colors ${
        complete ? "border-accent/50 bg-accent/10" : "border-card-border bg-card-bg"
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <h3
          className={`font-mono text-sm font-bold uppercase tracking-wider ${
            complete ? "text-accent" : "text-foreground"
          }`}
        >
          {habit.name}
        </h3>
        <span
          className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
            DIFFICULTY_STYLE[habit.difficulty]
          }`}
        >
          {habit.difficulty}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted/70">
          max +{DIFFICULTY_WEIGHT[habit.difficulty]} pts
        </span>
        <span
          className={`ml-auto border px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums ${
            points > 0
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-input-border bg-input-bg text-muted"
          }`}
        >
          {complete ? "✓ " : ""}
          {habit.type === "volume" ? "📊 " : ""}
          {habit.type === "milestone" ? "🎯 " : ""}+{formatPoints(points)} PTS
        </span>
      </div>

      <div className="px-5 pb-4">
        {habit.type === "recurring" && (
          <RecurringBody
            done={todayLog?.completed === true}
            isLoading={isLoading}
            onToggle={(v) => onLogChange({ completed: v })}
          />
        )}
        {habit.type === "volume" && (
          <VolumeBody
            habit={habit}
            todayLog={todayLog}
            isLoading={isLoading}
            onLog={(v) => onLogChange({ value: v })}
          />
        )}
        {habit.type === "milestone" && (
          <MilestoneBody
            habit={habit}
            todayLog={todayLog}
            isLoading={isLoading}
            onChange={(n) => onLogChange({ checkpoints_done: n })}
          />
        )}

        {/* Inline failed-save alert */}
        {error && (
          <div className="mt-3 flex items-center gap-2.5 border-[2px] border-red-500/50 bg-red-500/10 px-3 py-2">
            <p className="flex-1 font-mono text-[10px] text-red-300">
              Failed to save — {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-300 underline hover:text-red-100"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onDismissError}
              className="font-mono text-[10px] font-bold uppercase text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RecurringBody({
  done,
  isLoading,
  onToggle,
}: {
  done: boolean;
  isLoading: boolean;
  onToggle: (completed: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => onToggle(!done)}
      className={`flex w-full items-center gap-3 border-[2px] px-4 py-3 transition-colors disabled:cursor-not-allowed ${
        done
          ? "border-accent/50 bg-accent/10"
          : "border-input-border bg-input-bg hover:border-input-border/80"
      }`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-[2px] ${
          done ? "border-accent bg-accent" : "border-input-border bg-transparent"
        }`}
      >
        {done && <CheckMark className="h-full w-full p-[3px] text-background" />}
      </div>
      <span
        className={`flex-1 text-left font-mono text-xs font-bold uppercase tracking-wider ${
          done ? "text-accent" : "text-muted"
        }`}
      >
        {done ? "Done today" : "Mark as done"}
      </span>
    </button>
  );
}

function VolumeBody({
  habit,
  todayLog,
  isLoading,
  onLog,
}: {
  habit: Habit;
  todayLog: HabitLog | null;
  isLoading: boolean;
  onLog: (value: number) => void;
}) {
  // Draft holds the AMOUNT TO ADD (delta), not the running total.
  const [dirty, setDirty] = useState<string>("");

  const target = habit.target_value ?? 0;
  const current = todayLog?.value ?? 0;
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  const addDelta = (delta: number) => {
    onLog(Math.max(0, current + delta));
  };

  const commit = () => {
    const parsed = parseFloat(dirty);
    if (!Number.isFinite(parsed)) return;
    addDelta(parsed);
    setDirty("");
  };

  return (
    <div>
      {/* Progress */}
      <div className="mb-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Progress
          </span>
          <span
            className={`font-mono text-[10px] tabular-nums ${
              pct >= 100 ? "text-accent" : "text-muted"
            }`}
          >
            {current} / {target}
          </span>
        </div>
        <div className="h-2 w-full border border-input-border bg-input-bg">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Input row */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => addDelta(-1)}
          disabled={isLoading || current <= 0}
          className="flex w-9 items-center justify-center border-[2px] border-input-border bg-input-bg text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Subtract 1"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={dirty}
          onChange={(e) => setDirty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          placeholder="+ add"
          className="w-24 border-[2px] border-input-border bg-input-bg px-2 py-2 text-center font-mono text-sm tabular-nums text-foreground placeholder:text-muted/60 focus:border-input-focus focus:outline-none"
        />
        <button
          type="button"
          onClick={() => addDelta(1)}
          disabled={isLoading}
          className="flex w-9 items-center justify-center border-[2px] border-input-border bg-input-bg text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add 1"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={isLoading || dirty === "" || !Number.isFinite(parseFloat(dirty))}
          className="flex flex-1 items-center justify-center border-[2px] border-button-bg bg-button-bg px-4 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function MilestoneBody({
  habit,
  todayLog,
  isLoading,
  onChange,
}: {
  habit: Habit;
  todayLog: HabitLog | null;
  isLoading: boolean;
  onChange: (checkpointsDone: number) => void;
}) {
  const count = habit.checkpoint_count ?? 0;

  if (count <= 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
        Misconfigured milestone: checkpoint count missing.
      </p>
    );
  }

  const done = Math.max(0, Math.min(todayLog?.checkpoints_done ?? 0, count));
  const pct = Math.round((done / count) * 100);

  return (
    <div>
      {/* Progress summary */}
      <div className="mb-3">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Progress
          </span>
          <span
            className={`font-mono text-[10px] tabular-nums ${
              pct >= 100 ? "text-accent" : "text-muted"
            }`}
          >
            {done}/{count} · {pct}%
          </span>
        </div>
        <div className="h-2 w-full border border-input-border bg-input-bg">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checkpoint steps — sequential: checking a step completes all before it */}
      <div className="space-y-1.5">
        {Array.from({ length: count }, (_, i) => {
          const checked = i < done;
          return (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => onChange(checked ? i : i + 1)}
              className={`flex w-full items-center gap-3 border-[2px] px-3 py-2 transition-colors disabled:cursor-not-allowed ${
                checked
                  ? "border-accent/40 bg-accent/10"
                  : "border-input-border bg-input-bg hover:border-input-border/80"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center border-[2px] ${
                  checked
                    ? "border-accent bg-accent"
                    : "border-input-border bg-transparent"
                }`}
              >
                {checked && (
                  <CheckMark className="h-full w-full p-[2px] text-background" />
                )}
              </div>
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                  checked ? "text-accent" : "text-muted"
                }`}
              >
                Step {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
