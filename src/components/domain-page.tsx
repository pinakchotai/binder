"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconDangerTriangleBold,
  IconAltArrowLeftBold,
  IconRefreshBold,
  IconLoginBold,
  IconAddCircleBold,
} from "@ninzapp/solar-icons/bold";
import { getUserId, type Habit, type HabitLog } from "@/lib/supabase";
import { computeUserStreak } from "@binder/engine";
import { db } from "@/lib/storage";
import { writeHabitLog } from "@/lib/api-log";
import { DOMAIN_META, type DomainId } from "@/lib/domains";
import CustomHabitModal, {
  type CustomHabitInput,
  type EditingHabit,
} from "@/components/custom-habit-modal";
import HabitCard, { sortHabits } from "@/components/habit-card";
import { Card, Button, Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/lithos";

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type LogPatch = Partial<
  Pick<HabitLog, "completed" | "value" | "checkpoints_done">
>;

interface CardUiState {
  saving: boolean;
  error: string | null;
  lastPatch: LogPatch | null;
}

export default function DomainPageClient({ domainId }: { domainId: DomainId }) {
  const meta = DOMAIN_META[domainId];

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logsByHabit, setLogsByHabit] = useState<Record<string, HabitLog>>({});
  const [score, setScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const [cardUi, setCardUi] = useState<Record<string, CardUiState>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<EditingHabit | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const setCardState = useCallback(
    (habitId: string, patch: Partial<CardUiState>) => {
      setCardUi((prev) => {
        const base: CardUiState =
          prev[habitId] ?? { saving: false, error: null, lastPatch: null };
        return { ...prev, [habitId]: { ...base, ...patch } };
      });
    },
    [],
  );

  const fetchScore = useCallback(
    async (uid: string) => {
      const { data } = await db
        .from("domain_scores")
        .select("score")
        .eq("user_id", uid)
        .eq("domain", domainId)
        .eq("score_date", getTodayDateString())
        .maybeSingle();
      if (data) setScore(data.score);
    },
    [domainId],
  );

  const fetchDomain = useCallback(async () => {
    try {
      const uid = await getUserId();
      setSignedIn(Boolean(uid));
      if (!uid) return;

      const today = getTodayDateString();
      const [habitsRes, logsRes, totalsRes, freezeRes] = await Promise.all([
        db
          .from("habits")
          .select("*")
          .eq("user_id", uid)
          .eq("domain", domainId)
          .eq("is_template", false)
          .order("created_at"),
        db
          .from("habit_logs")
          .select("*")
          .eq("user_id", uid)
          .eq("log_date", today),
        db
          .from("total_scores")
          .select("score_date, score")
          .eq("user_id", uid),
        db
          .from("user_streak_freezes")
          .select("available_count, protected_dates")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      const firstError =
        habitsRes.error ?? logsRes.error ?? totalsRes.error ?? freezeRes.error;
      if (firstError) {
        setLoadError(firstError.message);
        return;
      }

      setStreak(
        computeUserStreak({
          totalScores: ((totalsRes.data ?? []) as { score_date: string; score: number }[]).map(
            (row) => ({ scoreDate: row.score_date, score: Number(row.score) }),
          ),
          asOfDate: today,
          protectedFreezeDates: ((freezeRes.data as { protected_dates?: unknown } | null)
            ?.protected_dates ?? []) as string[],
        }),
      );

      const habitList = (habitsRes.data ?? []) as Habit[];
      const habitIds = new Set(habitList.map((h) => h.id));
      const logMap: Record<string, HabitLog> = {};
      for (const log of (logsRes.data ?? []) as HabitLog[]) {
        if (habitIds.has(log.habit_id)) logMap[log.habit_id] = log;
      }

      setHabits(habitList);
      setLogsByHabit(logMap);
      await fetchScore(uid);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [domainId, fetchScore]);

  useEffect(() => {
    // Mount-time load: all state updates flow from awaited Supabase responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDomain();
  }, [fetchDomain]);

  /** Optimistic write: patch UI immediately, persist, roll back + error on failure. */
  const handleLogChange = useCallback(
    async (habit: Habit, patch: LogPatch) => {
      const uid = await getUserId();
      if (!uid) {
        setCardState(habit.id, { error: "session expired" });
        return;
      }

      const snapshot = logsByHabit[habit.id] ?? null;
      // Optimistic merge so the UI feels instant. points_earned is replaced by
      // the authoritative returned row below.
      setLogsByHabit((prev) => ({
        ...prev,
        [habit.id]: {
          id: snapshot?.id ?? "optimistic",
          habit_id: habit.id,
          user_id: uid,
          log_date: getTodayDateString(),
          value: snapshot?.value ?? null,
          completed: snapshot?.completed ?? false,
          checkpoints_done: snapshot?.checkpoints_done ?? null,
          points_earned: snapshot?.points_earned ?? 0,
          created_at: snapshot?.created_at ?? "",
          updated_at: snapshot?.updated_at ?? "",
          ...patch,
        },
      }));
      setCardState(habit.id, { saving: true, error: null, lastPatch: patch });

      const { data, error } = await writeHabitLog({
        habit_id: habit.id,
        log_date: getTodayDateString(),
        value: patch.value,
        completed: patch.completed,
        checkpoints_done: patch.checkpoints_done,
      });

      if (error || !data) {
        // Revert to pre-interaction state; keep the patch available for Retry.
        setLogsByHabit((prev) => {
          const next = { ...prev };
          if (snapshot) next[habit.id] = snapshot;
          else delete next[habit.id];
          return next;
        });
        setCardState(habit.id, {
          saving: false,
          error: error?.message ?? "unknown error",
        });
        return;
      }

      setLogsByHabit((prev) => ({ ...prev, [habit.id]: data as HabitLog }));
      setCardState(habit.id, { saving: false });
      // Engine computes scores server-side inside the /api/log transaction — re-read is fresh.
      await fetchScore(uid);
    },
    [logsByHabit, fetchScore, setCardState],
  );

  const retryHabit = useCallback(
    (habit: Habit) => {
      const ui = cardUi[habit.id];
      if (ui?.lastPatch) void handleLogChange(habit, ui.lastPatch);
      else setCardState(habit.id, { error: null });
    },
    [cardUi, handleLogChange, setCardState],
  );

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  /** Insert a new habit; the returned row is appended directly. */
  const handleCreateHabit = useCallback(
    async (input: CustomHabitInput) => {
      const uid = await getUserId();
      if (!uid) {
        setCreateError("Session expired — sign in again.");
        return;
      }
      setCreating(true);
      setCreateError(null);
      const { data, error } = await db
        .from("habits")
        .insert({ user_id: uid, domain: domainId, is_template: false, ...input })
        .select()
        .single();
      setCreating(false);
      if (error || !data) {
        setCreateError(error?.message ?? "Failed to create habit.");
        return;
      }
      setHabits((prev) => [...prev, data as Habit]);
      setModalOpen(false);
      setToast("Habit created");
      void fetchScore(uid);
    },
    [domainId, fetchScore],
  );

  const handleEditHabit = useCallback(
    async (input: CustomHabitInput) => {
      if (!editingHabit) return;
      const uid = await getUserId();
      if (!uid) {
        setCreateError("Session expired — sign in again.");
        return;
      }
      setCreating(true);
      setCreateError(null);
      const { data, error } = await db
        .from("habits")
        .update({
          name: input.name,
          difficulty: input.difficulty,
          target_value: input.target_value,
          checkpoint_count: input.checkpoint_count,
          intended_time: input.intended_time,
          intended_context: input.intended_context,
        })
        .eq("id", editingHabit.id)
        .eq("user_id", uid)
        .select()
        .single();
      setCreating(false);
      if (error || !data) {
        setCreateError(error?.message ?? "Failed to update habit.");
        return;
      }
      setHabits((prev) => prev.map((h) => (h.id === editingHabit.id ? (data as Habit) : h)));
      setEditingHabit(null);
      setModalOpen(false);
      setToast("Habit updated");
      void fetchScore(uid);
    },
    [editingHabit, fetchScore],
  );

  const handleDeleteHabit = useCallback(
    async (habit: Habit) => {
      const uid = await getUserId();
      if (!uid) return;
      setDeleteConfirming(true);
      const { error } = await db
        .from("habits")
        .delete()
        .eq("id", habit.id)
        .eq("user_id", uid);
      setDeleteConfirming(false);
      if (error) {
        setToast("Failed to delete habit");
        return;
      }
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      setLogsByHabit((prev) => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
      setDeletingHabit(null);
      setToast("Habit deleted");
      void fetchScore(uid);
    },
    [fetchScore],
  );

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void fetchDomain();
  }, [fetchDomain]);

  const sorted = sortHabits(habits);
  const scorePct = Math.min(score ?? 0, 100);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b border-card-border bg-sidebar-bg px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent"
          >
            <IconAltArrowLeftBold className="h-3.5 w-3.5" />
            Binder
          </Link>
          <Button
            variant="text"
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 border border-input-border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <IconRefreshBold className="h-3 w-3" />
            Sync
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-10" id="main-content">
        {/* Header: domain name + centered score */}
        <Card className="px-6 py-6 text-center card-depth-lg">
          <span className="inline-flex items-center border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {meta.label}
          </span>
          <div className="mt-4 flex items-baseline justify-center gap-1">
            <span className="font-mono text-7xl font-bold tabular-nums text-foreground">
              {score === null ? "--" : score}
            </span>
            <span className="font-mono text-lg font-medium text-muted">/100</span>
          </div>
          <div className="mx-auto mt-3 h-1.5 w-full max-w-sm border border-input-border bg-input-bg">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <p className="mt-2.5 font-mono text-[11px] uppercase tracking-widest text-muted">
            {meta.subtitle}
          </p>
        </Card>

        {/* Body */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <IconRefreshBold className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-6 border border-red-500/40 bg-red-500/5 py-10">
              <IconDangerTriangleBold className="h-5 w-5 text-red-400" />
              <p className="font-mono text-xs text-red-300">{loadError}</p>
              <Button
                variant="primary"
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 border border-button-bg bg-button-bg px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-button-text btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconRefreshBold className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : !signedIn ? (
            <div className="flex flex-col items-center gap-6 border border-card-border bg-card-bg py-10">
              <IconLoginBold className="h-5 w-5 text-muted" />
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                Sign in to track this domain
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center border border-button-bg bg-button-bg px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-button-text btn-primary"
              >
                Go to sign in
              </Link>
            </div>
          ) : sorted.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 border border-dashed border-card-border py-12 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
                No habits yet. Add one to get started.
              </p>
              <Button
                variant="primary"
                type="button"
                onClick={() => {
                  setEditingHabit(null);
                  setCreateError(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 border border-button-bg bg-button-bg px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-button-text btn-primary"
              >
                <IconAddCircleBold className="h-3.5 w-3.5" />
                Add habit
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {sorted.map((habit) => {
                  const ui = cardUi[habit.id];
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      streak={streak}
                      todayLog={logsByHabit[habit.id] ?? null}
                      onLogChange={(patch) => void handleLogChange(habit, patch)}
                      isLoading={ui?.saving ?? false}
                      error={ui?.error ?? null}
                      onRetry={() => retryHabit(habit)}
                      onDismissError={() =>
                        setCardState(habit.id, { error: null })
                      }
                      onEdit={() => {
                        setEditingHabit({
                          id: habit.id,
                          name: habit.name,
                          type: habit.type,
                          frequency: habit.frequency,
                          difficulty: habit.difficulty,
                          target_value: habit.target_value,
                          checkpoint_count: habit.checkpoint_count,
                          intended_time: habit.intended_time,
                          intended_context: habit.intended_context,
                        });
                        setCreateError(null);
                        setModalOpen(true);
                      }}
                      onDelete={() => setDeletingHabit(habit)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !loadError && signedIn && sorted.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditingHabit(null);
              setCreateError(null);
              setModalOpen(true);
            }}
              className="mt-6 flex w-full items-center justify-center gap-2 border border-dashed border-input-border py-3 font-mono text-xs font-bold uppercase tracking-wider text-muted btn-ghost hover:border-accent/40 hover:text-accent"
          >
            <IconAddCircleBold className="h-3.5 w-3.5" />
            Add habit
          </button>
        )}
        </div>
      </div>

      {modalOpen && (
        <CustomHabitModal
          isOpen
          domain={domainId}
          editingHabit={editingHabit}
          onClose={() => { setModalOpen(false); setEditingHabit(null); }}
          onSubmit={editingHabit ? handleEditHabit : handleCreateHabit}
          isLoading={creating}
          error={createError}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 border border-accent/40 bg-card-bg px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-accent shadow-lg toast-animate">
          {toast}
        </div>
      )}
      {deletingHabit && (
        <Dialog open={!!deletingHabit} onClose={() => !deleteConfirming && setDeletingHabit(null)}>
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="font-mono text-sm text-foreground/80">
              Delete <span className="font-bold text-red-400">{deletingHabit.name}</span>?
              This removes all its logged history and can&apos;t be undone.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" onClick={() => setDeletingHabit(null)} disabled={deleteConfirming} className="mr-2">Cancel</Button>
            <Button variant="primary" onClick={() => void handleDeleteHabit(deletingHabit)} disabled={deleteConfirming} className="bg-red-500/10 border-red-500/60 text-red-400 hover:bg-red-500/20">
              {deleteConfirming && <IconRefreshBold className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
