"use client";

import { useState } from "react";
import { IconRefreshBold, IconMinusCircleBold, IconPenBold, IconAddCircleBold, IconTrashBin2Bold } from "@ninzapp/solar-icons/bold";
import { Card, Button, Checkbox } from '@/components/lithos';
import { computeHabitMaturity } from "@binder/engine";
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

/** '13:05' -> '1:05 PM'; '07:00' -> '7:00 AM' */
function formatIntendedTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((p) => parseInt(p, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

interface HabitCardProps {
  habit: Habit;
  streak: number;
  todayLog: HabitLog | null;
  onLogChange: (
    patch: Partial<Pick<HabitLog, "completed" | "value" | "checkpoints_done">>,
  ) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDismissError: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function HabitCard({
  habit,
  streak,
  todayLog,
  onLogChange,
  isLoading,
  error,
  onRetry,
  onDismissError,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const points = todayLog?.points_earned ?? 0;

  const maturity = computeHabitMaturity({
    habitCreatedAt: habit.created_at,
    currentStreak: streak,
  });

  const intendedChunks: string[] = [];
  if (habit.intended_time) intendedChunks.push(formatIntendedTime(habit.intended_time));
  if (habit.intended_context) intendedChunks.push(habit.intended_context);

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
    <Card
      className={`relative transition-colors ${
        complete ? "border-accent/50 bg-accent/10" : ""
      }`}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <IconRefreshBold className="h-4 w-4 animate-spin text-accent" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <h3
          className={`font-mono text-sm font-bold tracking-tight ${
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
          {complete ? "DONE " : ""}+{formatPoints(points)} PTS
        </span>
        <Button
          variant="text"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          disabled={isLoading}
          className="flex h-8 w-8 items-center justify-center border border-transparent p-1 text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Edit habit"
        >
          <IconPenBold className="h-3 w-3" />
        </Button>
        <Button
          variant="text"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          disabled={isLoading}
          className="flex h-8 w-8 items-center justify-center border border-transparent p-1 text-muted transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Delete habit"
        >
          <IconTrashBin2Bold className="h-3 w-3" />
        </Button>
      </div>

      <div className="px-5 pb-5">
        {intendedChunks.length > 0 && (
          <div className="mb-3 border-l-[3px] border-accent/40 bg-input-bg px-3 py-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
              {intendedChunks.join("  ·  ")}
            </span>
          </div>
        )}

        {/* Maturity indicator */}
        <div className={`mb-3 ${maturity.isLikelyAutomatic ? "border border-emerald-500/40 bg-emerald-500/5" : ""} px-3 py-2`}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span
              className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${
                maturity.isLikelyAutomatic ? "text-emerald-400" : "text-muted"
              }`}
            >
              {maturity.isLikelyAutomatic
                ? "This habit is likely automatic now"
                : maturity.daysToward > 0
                  ? `Day ${maturity.daysToward} of ~${maturity.targetDays} toward automatic`
                  : `Getting started — most habits click around day ${maturity.targetDays}`}
            </span>
            {!maturity.isLikelyAutomatic && (
              <span className="font-mono text-[9px] tabular-nums text-muted">
                {maturity.percentComplete}%
              </span>
            )}
          </div>
          <div
            className={
              maturity.isLikelyAutomatic
                ? "h-1.5 w-full border border-emerald-500/40 bg-emerald-500/5"
                : "h-1.5 w-full border border-input-border bg-input-bg"
            }
          >
            <div
              className={`h-full ${
                maturity.isLikelyAutomatic
                  ? "bg-emerald-500/70"
                  : "bg-accent transition-all duration-300"
              }`}
              style={{ width: `${maturity.percentComplete}%` }}
            />
          </div>
        </div>

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
          <div className="mt-3 flex items-center gap-2.5 border border-red-500/50 bg-red-500/10 px-3 py-2">
            <p className="flex-1 font-mono text-[10px] text-red-300">
              Failed to save — {error}
            </p>
            <Button
              variant="text"
              type="button"
              onClick={onRetry}
              className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-300 underline hover:text-red-100"
            >
              Retry
            </Button>
            <Button
              variant="text"
              type="button"
              onClick={onDismissError}
              className="font-mono text-[10px] font-bold uppercase text-red-400 hover:text-red-200"
              aria-label="Dismiss error"
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    </Card>
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
  const [pulsing, setPulsing] = useState(false);

  const handleToggle = () => {
    onToggle(!done);
    if (!done) {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 260);
    }
  };

  return (
    <div
      className={`flex w-full items-center gap-3 border px-4 py-3 transition-colors ${
        done
          ? "border-accent/50 bg-accent/10"
          : "border-input-border bg-input-bg hover:border-input-border/80"
      }`}
    >
      <Checkbox
        checked={done}
        onChange={handleToggle}
        disabled={isLoading}
        className={pulsing ? "check-pulse" : ""}
      />
      <span
        className={`flex-1 text-left font-mono text-xs font-bold uppercase tracking-wider ${
          done ? "text-accent" : "text-muted"
        }`}
      >
        {done ? "Done today" : "Mark as done"}
      </span>
    </div>
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
        <div className="h-1.5 w-full border border-input-border bg-input-bg">
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
          className="flex h-11 w-11 items-center justify-center border border-input-border bg-input-bg text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Subtract 1"
        >
          <IconMinusCircleBold className="h-3.5 w-3.5" />
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
          className="w-24 border border-input-border bg-input-bg px-2 py-2 text-center font-mono text-sm tabular-nums text-foreground placeholder:text-muted/60 focus:border-input-focus focus:ring-2 focus:ring-accent/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => addDelta(1)}
          disabled={isLoading}
          className="flex h-11 w-11 items-center justify-center border border-input-border bg-input-bg text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add 1"
        >
          <IconAddCircleBold className="h-3.5 w-3.5" />
        </button>
        <Button
          variant="primary"
          type="button"
          onClick={commit}
          disabled={isLoading || dirty === "" || !Number.isFinite(parseFloat(dirty))}
          className="flex flex-1 items-center justify-center px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-button-hover active:translate-y-[1px]"
        >
          Add
        </Button>
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
        <div className="h-1.5 w-full border border-input-border bg-input-bg">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checkpoint steps — sequential: checking a step completes all before it */}
      <div className="space-y-1.5">
        {Array.from({ length: count }, (_, i) => {
          const isChecked = i < done;
          return (
            <div
              key={i}
              className={`flex w-full items-center gap-3 border px-3 py-2 transition-colors ${
                isChecked
                  ? "border-accent/40 bg-accent/10"
                  : "border-input-border bg-input-bg hover:border-input-border/80"
              }`}
            >
              <Checkbox
                checked={isChecked}
                onChange={() => onChange(isChecked ? i : i + 1)}
                disabled={isLoading}
              />
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                  isChecked ? "text-accent" : "text-muted"
                }`}
              >
                Step {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
