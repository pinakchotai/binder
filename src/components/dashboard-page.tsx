"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import AuthScreen from "@/components/auth-screen";
import DomainScoreCard, { DOMAIN_HEX } from "@/components/domain-score-card";
import QuickLogRow from "@/components/quick-log-row";
import { supabase, getUserId } from "@/lib/supabase";
import type { Habit, HabitLog } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  computeStreaks,
  getTodayDateString,
  isCompleted,
  useDashboardData,
} from "@/lib/dashboard-data";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";

type LogPatch = Partial<
  Pick<HabitLog, "completed" | "value" | "checkpoints_done">
>;

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-24">
      <Loader2 className="h-4 w-4 animate-spin text-muted" />
    </div>
  );
}

/** Signed in but never onboarded → send to the wizard route. */
function ToOnboarding() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);
  return <Splash />;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { bundle, loading, error, reload, patchLogLocal } = useDashboardData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const lastPatchRef = useRef<Record<string, LogPatch>>({});

  const today = getTodayDateString();
  const streaks = useMemo(
    () => computeStreaks(bundle?.trackedDates ?? new Set<string>()),
    [bundle],
  );

  const handleChange = async (habit: Habit, patch: LogPatch) => {
    if (busyId) return;
    lastPatchRef.current[habit.id] = patch;
    setRowErrors((prev) => {
      if (!(habit.id in prev)) return prev;
      const next = { ...prev };
      delete next[habit.id];
      return next;
    });

    const prevLog =
      bundle?.logsByHabit.get(habit.id)?.get(today) ?? null;
    const nowIso = new Date().toISOString();
    const optimistic: HabitLog = {
      id: prevLog?.id ?? `optimistic-${habit.id}`,
      habit_id: habit.id,
      user_id: user?.id ?? "",
      log_date: today,
      value:
        patch.value !== undefined ? patch.value : (prevLog?.value ?? null),
      completed:
        patch.completed !== undefined
          ? patch.completed
          : (prevLog?.completed ?? false),
      checkpoints_done:
        patch.checkpoints_done !== undefined
          ? patch.checkpoints_done
          : (prevLog?.checkpoints_done ?? null),
      points_earned: Number(prevLog?.points_earned ?? 0),
      created_at: prevLog?.created_at ?? nowIso,
      updated_at: nowIso,
    };

    patchLogLocal(habit.id, optimistic);
    setBusyId(habit.id);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Not signed in");
      const { data, error: upsertError } = await supabase
        .from("habit_logs")
        .upsert(
          {
            habit_id: habit.id,
            user_id: userId,
            log_date: today,
            value: optimistic.value,
            completed: optimistic.completed,
            checkpoints_done: optimistic.checkpoints_done,
          },
          { onConflict: "habit_id,log_date" },
        )
        .select("*")
        .single();
      if (upsertError) throw new Error(upsertError.message);
      patchLogLocal(habit.id, data as HabitLog);
      await reload();
    } catch (e) {
      patchLogLocal(habit.id, prevLog);
      setRowErrors((prev) => ({
        ...prev,
        [habit.id]: e instanceof Error ? e.message : "Save failed",
      }));
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) return <Splash />;
  if (!user) return <AuthScreen />;
  if (!user.user_metadata?.onboarding_completed) return <ToOnboarding />;

  const habits = bundle?.habits ?? [];
  const habitsByDomain = DOMAIN_IDS.map((d) => ({
    domain: d,
    habits: habits.filter((h) => h.domain === d),
  }));
  const completedCountFor = (d: string) =>
    habitsByDomain
      .find((g) => g.domain === d)!
      .habits.filter((h) =>
        isCompleted(h, bundle?.logsByHabit.get(h.id)?.get(today) ?? null),
      ).length;

  const totalScore = bundle?.latestTotal ? Math.round(Number(bundle.latestTotal.score)) : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 border-[2px] border-red-500/40 bg-red-500/[0.07] px-4 py-3">
          <p className="min-w-0 truncate font-mono text-[11px] text-red-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="shrink-0 font-mono text-[10px] font-bold uppercase text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Today
          </p>
          <h1 className="mt-1 font-mono text-lg font-bold uppercase tracking-wider text-foreground">
            {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {busyId && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
          )}
          <Flame className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs font-bold tabular-nums text-foreground">
            {streaks.current}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            day streak
          </span>
        </div>
      </div>

      <div className="mb-6 border-[2px] border-card-border bg-card-bg p-5">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
          Total Score — All Domains
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-accent">
          {totalScore == null ? "--" : totalScore}
          <span className="text-base text-muted">/100</span>
        </p>
        <div className="mt-3 h-1.5 w-full bg-input-bg">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, totalScore ?? 0))}%` }}
          />
        </div>
      </div>

      {loading && !bundle ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-input-bg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DOMAIN_IDS.map((d) => (
              <DomainScoreCard
                key={d}
                domain={d}
                score={bundle?.todayScores[d] ?? null}
                habitCount={
                  habitsByDomain.find((g) => g.domain === d)!.habits.length
                }
                completedCount={completedCountFor(d)}
              />
            ))}
          </div>

          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
              Quick Log — Today
            </p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted/70">
              changes sync instantly
            </p>
          </div>

          {habits.length === 0 ? (
            <div className="border-[2px] border-dashed border-card-border px-6 py-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                No habits yet — add some from a domain page.
              </p>
            </div>
          ) : (
            habitsByDomain.map((group) =>
              group.habits.length > 0 ? (
                <div key={group.domain} className="mb-5">
                  <p
                    className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: DOMAIN_HEX[group.domain] }}
                  >
                    {DOMAIN_META[group.domain].label}
                  </p>
                  <div className="space-y-2">
                    {group.habits.map((habit) => (
                      <QuickLogRow
                        key={habit.id}
                        habit={habit}
                        todayLog={
                          bundle?.logsByHabit.get(habit.id)?.get(today) ?? null
                        }
                        isLoading={busyId === habit.id}
                        error={rowErrors[habit.id] ?? null}
                        onRetry={() => {
                          const patch = lastPatchRef.current[habit.id];
                          if (patch) void handleChange(habit, patch);
                        }}
                        onDismissError={() =>
                          setRowErrors((prev) => {
                            const next = { ...prev };
                            delete next[habit.id];
                            return next;
                          })
                        }
                        onChange={(patch) => void handleChange(habit, patch)}
                      />
                    ))}
                  </div>
                </div>
              ) : null,
            )
          )}
        </>
      )}
    </div>
  );
}
