"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBoltBold, IconRefreshBold, IconShieldBold, IconShieldCheckBold, IconStarBold } from "@ninzapp/solar-icons/bold";
import AuthScreen from "@/components/auth-screen";
import DomainScoreCard, { DOMAIN_HEX } from "@/components/domain-score-card";
import QuickLogRow from "@/components/quick-log-row";
import { writeHabitLog } from "@/lib/api-log";
import type { Habit, HabitLog } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { hasPendingLocalImport, importLocalToCloud } from "@/lib/storage";
import {
  computeStreaks,
  getTodayDateString,
  isCompleted,
  useDashboardData,
} from "@/lib/dashboard-data";
import { DOMAIN_IDS, DOMAIN_META } from "@/lib/domains";
import { Card, Badge, Button } from "@/components/lithos";

type LogPatch = Partial<
  Pick<HabitLog, "completed" | "value" | "checkpoints_done">
>;

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-24">
      <IconRefreshBold className="h-4 w-4 animate-spin text-muted" />
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
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);
  const [importState, setImportState] = useState<
    "idle" | "prompt" | "busy" | "done" | "error"
  >("idle");
  const prevLevelRef = useRef<number | null>(null);
  const lastPatchRef = useRef<Record<string, LogPatch>>({});

  const xpLevel = bundle?.userXp?.current_level ?? 1;

  useEffect(() => {
    if (prevLevelRef.current !== null && xpLevel > prevLevelRef.current) {
      setLevelUpToast(xpLevel);
    }
    prevLevelRef.current = xpLevel;
  }, [xpLevel]);

  useEffect(() => {
    if (!levelUpToast) return;
    const id = setTimeout(() => setLevelUpToast(null), 3000);
    return () => clearTimeout(id);
  }, [levelUpToast]);

  const today = getTodayDateString();

  const isCloudUser = user?.user_metadata?.is_local_profile !== true;
  useEffect(() => {
    if (isCloudUser && hasPendingLocalImport() && importState === "idle") {
      setImportState("prompt");
    }
  }, [isCloudUser, importState]);

  useEffect(() => {
    if (importState !== "done") return;
    const id = setTimeout(() => setImportState("idle"), 3500);
    return () => clearTimeout(id);
  }, [importState]);

  const runImport = async () => {
    if (importState !== "prompt" && importState !== "error") return;
    setImportState("busy");
    const err = await importLocalToCloud();
    if (err) setImportState("error");
    else {
      setImportState("done");
      await reload();
    }
  };

  const streaks = useMemo(
    () =>
      computeStreaks(
        bundle?.trackedDates ?? new Set<string>(),
        new Set(bundle?.freezeRow?.protected_dates ?? []),
      ),
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
      const { data, error: upsertError } = await writeHabitLog({
        habit_id: habit.id,
        log_date: today,
        value: optimistic.value,
        completed: optimistic.completed,
        checkpoints_done: optimistic.checkpoints_done,
      });
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
  const userXp = bundle?.userXp;
  const xpTotal = userXp?.total_xp ?? 0;
  const levelXpFor = (lvl: number) => (lvl - 1) * (lvl - 1) * 100;
  const currentLevelXp = levelXpFor(xpLevel);
  const nextLevelXp = levelXpFor(xpLevel + 1);
  const xpProgress = nextLevelXp > currentLevelXp
    ? Math.min(((xpTotal - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 100)
    : 100;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10" id="main-content">
      {importState === "prompt" && (
        <div className="mb-6 flex items-center justify-between gap-3 border border-accent/40 bg-accent/[0.06] px-4 py-3">
          <p className="min-w-0 font-mono text-[11px] text-accent">
            This device has offline data — import it into this account?
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="text"
              onClick={() => setImportState("idle")}
              className="shrink-0 font-mono text-[10px] font-bold uppercase text-muted hover:text-foreground"
            >
              Dismiss
            </Button>
            <Button
              variant="primary"
              onClick={() => void runImport()}
              className="shrink-0 border border-button-bg bg-button-bg px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-button-text btn-primary"
            >
              Import
            </Button>
          </div>
        </div>
      )}

      {importState === "busy" && (
        <div className="mb-6 flex items-center gap-3 border border-accent/40 bg-accent/[0.06] px-4 py-3">
          <IconRefreshBold className="h-3.5 w-3.5 animate-spin text-accent" />
          <p className="font-mono text-[11px] text-accent">
            Importing offline data…
          </p>
        </div>
      )}

      {importState === "error" && (
        <div className="mb-6 flex items-center justify-between gap-3 border border-red-500/40 bg-red-500/[0.07] px-4 py-3">
          <p className="min-w-0 truncate font-mono text-[11px] text-red-300">
            Import failed — check your connection and try again.
          </p>
          <Button
            variant="text"
            onClick={() => void runImport()}
            className="shrink-0 font-mono text-[10px] font-bold uppercase text-accent hover:underline"
          >
            Retry
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 border border-red-500/40 bg-red-500/[0.07] px-4 py-3">
          <p className="min-w-0 truncate font-mono text-[11px] text-red-300">
            {error}
          </p>
          <Button
            variant="text"
            onClick={() => void reload()}
            className="shrink-0 font-mono text-[10px] font-bold uppercase text-accent hover:underline"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {busyId && (
            <IconRefreshBold className="h-3.5 w-3.5 animate-spin text-muted" />
          )}
          <IconBoltBold className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs font-bold tabular-nums text-foreground">
            {streaks.current}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            day streak
          </span>
          {bundle?.freezeRow && bundle.freezeRow.available_count > 0 && (
            <span
              className="inline-flex items-center gap-1 border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent"
              title="Streak freezes protect a missed day from breaking your streak"
            >
              <IconShieldBold className="h-3 w-3" />
              ×{bundle.freezeRow.available_count}
            </span>
          )}
          {streaks.protectedNow && streaks.current > 0 && (
            <span
              className="inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400"
              title="A freeze saved your streak today"
            >
              <IconShieldCheckBold className="h-3 w-3" />
              protected
            </span>
          )}
        </div>
      </div>

      <Card className="mb-6 border border-card-border bg-card-bg p-6 card-depth-lg">
        <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
          Total Score
        </p>
        <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-accent">
          {totalScore == null ? "--" : totalScore}
          <span className="text-base font-normal text-muted">/100</span>
        </p>
        <div className="mt-3 h-1.5 w-full bg-input-bg">
          <div
            className="h-full bg-accent progress-animate transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, totalScore ?? 0))}%` }}
          />
        </div>
      </Card>

      <Card className="mb-6 border border-card-border bg-card-bg p-6 card-depth">
        <div className="flex items-center gap-2">
          <IconStarBold className="h-3.5 w-3.5 text-accent" />
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
            Level {xpLevel}
          </p>
          <p className="ml-auto font-mono text-[10px] tabular-nums text-muted">
            {xpTotal} XP
          </p>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted">
            {currentLevelXp}
          </span>
          <div className="flex-1 h-1.5 bg-input-bg">
            <div
              className="h-full bg-accent progress-animate transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted">
            {nextLevelXp}
          </span>
        </div>
      </Card>

      {bundle && bundle.earnedBadges.length > 0 && (
        <Card className="mb-6 border border-card-border bg-card-bg p-4 card-depth">
          <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
            Badges
          </p>
          <div className="flex flex-wrap gap-3">
            {bundle.earnedBadges.map((ub, i) => (
              <Badge
                key={ub.id}
                intent="accent"
                className="flex items-center gap-2 px-3 py-2 badge-enter"
                style={{ animationDelay: `${i * 60}ms` }}
                title={ub.badges?.description}
              >
                <span className="text-lg">{ub.badges?.icon}</span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {ub.badges?.name}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-wider text-muted">
                    {new Date(ub.earned_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {loading && !bundle ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-input-bg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            <div className="border border-dashed border-card-border px-6 py-10 text-center">
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
      {levelUpToast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 border border-accent/40 bg-card-bg px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-accent shadow-lg toast-animate">
          Level Up! You&apos;re now Level {levelUpToast}
        </div>
      )}
    </div>
  );
}
