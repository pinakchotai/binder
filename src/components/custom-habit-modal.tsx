"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { DOMAIN_META, type DomainId } from "@/lib/domains";

export interface CustomHabitInput {
  name: string;
  type: "recurring" | "volume" | "milestone";
  frequency: "daily" | "weekly";
  difficulty: "easy" | "medium" | "hard";
  target_value: number | null;
  checkpoint_count: number | null;
}

type HabitType = CustomHabitInput["type"];

interface CustomHabitModalProps {
  isOpen: boolean;
  domain: DomainId;
  onClose: () => void;
  onSubmit: (input: CustomHabitInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const TYPE_OPTIONS: { value: HabitType; title: string; hint: string }[] = [
  { value: "recurring", title: "RECURRING", hint: "done or not" },
  { value: "volume", title: "VOLUME", hint: "hit a number" },
  { value: "milestone", title: "MILESTONE", hint: "step by step" },
];

const DIFFICULTIES: CustomHabitInput["difficulty"][] = [
  "easy",
  "medium",
  "hard",
];

const EMPTY_FORM = {
  name: "",
  type: null as HabitType | null,
  frequency: "daily" as CustomHabitInput["frequency"],
  difficulty: "medium" as CustomHabitInput["difficulty"],
  targetValue: "",
  checkpointCount: "",
};

const segBtn = (active: boolean) =>
  `flex-1 border-[2px] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
    active
      ? "border-accent/60 bg-accent/10 text-accent"
      : "border-input-border text-muted hover:text-foreground/70"
  }`;

export default function CustomHabitModal({
  isOpen,
  domain,
  onClose,
  onSubmit,
  isLoading,
  error,
}: CustomHabitModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (form.name.trim().length > 100) return "Max 100 characters.";
    if (!form.type) return "Pick a type.";
    if (form.type === "volume") {
      const v = Number(form.targetValue);
      if (!form.targetValue || !Number.isFinite(v) || v <= 0)
        return "Target value must be greater than 0.";
    }
    if (form.type === "milestone") {
      const c = Number(form.checkpointCount);
      if (!form.checkpointCount || !Number.isInteger(c) || c <= 0)
        return "Checkpoints must be a whole number greater than 0.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setValidationError(problem);
      return;
    }
    setValidationError(null);
    await onSubmit({
      name: form.name.trim(),
      type: form.type as HabitType,
      frequency: form.type === "recurring" ? form.frequency : "daily",
      difficulty: form.difficulty,
      target_value: form.type === "volume" ? Number(form.targetValue) : null,
      checkpoint_count:
        form.type === "milestone" ? Number(form.checkpointCount) : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border-[2px] border-card-border bg-sidebar-bg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-[2px] border-card-border px-5 py-4">
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              New Habit
            </h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {DOMAIN_META[domain].label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-[2px] border-transparent text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Name
            </label>
            <input
              type="text"
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Deep work block"
              className="w-full border-[2px] border-input-border bg-input-bg px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/50"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                  className={`border-[2px] px-2 py-2.5 text-center transition-colors ${
                    form.type === opt.value
                      ? "border-accent/60 bg-accent/10"
                      : "border-input-border hover:border-accent/30"
                  }`}
                >
                  <span
                    className={`block font-mono text-[10px] font-bold uppercase tracking-wider ${
                      form.type === opt.value
                        ? "text-accent"
                        : "text-foreground/80"
                    }`}
                  >
                    {opt.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-muted">
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Frequency — recurring only */}
          {form.type === "recurring" && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Frequency
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, frequency: "daily" }))
                  }
                  className={segBtn(form.frequency === "daily")}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, frequency: "weekly" }))
                  }
                  className={segBtn(form.frequency === "weekly")}
                >
                  Weekly
                </button>
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Difficulty
            </label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, difficulty: diff }))}
                  className={segBtn(form.difficulty === diff)}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Volume target */}
          {form.type === "volume" && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Target value
              </label>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.targetValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetValue: e.target.value }))
                }
                placeholder="e.g. 3000"
                className="w-full border-[2px] border-input-border bg-input-bg px-3 py-2 font-mono text-sm tabular-nums text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/50"
              />
            </div>
          )}

          {/* Milestone checkpoints */}
          {form.type === "milestone" && (
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                Number of checkpoints
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.checkpointCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkpointCount: e.target.value }))
                }
                placeholder="e.g. 5"
                className="w-full border-[2px] border-input-border bg-input-bg px-3 py-2 font-mono text-sm tabular-nums text-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent/50"
              />
            </div>
          )}

          {/* Errors */}
          {(validationError || error) && (
            <p className="border-l-[3px] border-red-500 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300">
              {validationError ?? error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t-[2px] border-card-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 border-[2px] border-input-border px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 border-[2px] border-button-bg bg-button-bg px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-button-text transition-colors hover:bg-button-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
