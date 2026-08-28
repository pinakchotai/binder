"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconCheckSquareBold, IconAltArrowRightBold, IconCpuBold, IconRefreshBold, IconAddCircleBold } from "@ninzapp/solar-icons/bold";
import { supabase, getUserId, type Habit } from "@/lib/supabase";
import { db } from "@/lib/storage";
import { useAuth, notifyLocalAuthChanged } from "@/lib/auth";
import { setLocalOnboarded } from "@/lib/local-db";
import { useSettings } from "@/lib/settings";
import { DOMAIN_IDS, DOMAIN_META, type DomainId } from "@/lib/domains";
import { HABIT_TEMPLATES, type HabitTemplate } from "@/lib/habit-templates";
import CustomHabitModal, {
  type CustomHabitInput,
} from "@/components/custom-habit-modal";
import { Card, Button, Badge } from "@/components/lithos";

type Selections = Record<DomainId, Set<string>>;
type CustomsByDomain = Record<DomainId, Habit[]>;

interface TemplateInsertRow extends HabitTemplate {
  user_id: string;
  domain: DomainId;
  is_template: boolean;
}

type BasicsState = "pending" | "done" | "skipped";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export default function OnboardingWizard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { settings, updateSetting, saveAll } = useSettings();

  // Offline (native, no account): the profile is synthetic and starts
  // without sign-in. Offline users get a short "basics" step first.
  const offline = user?.user_metadata?.is_local_profile === true;

  const [step, setStep] = useState(-1); // -1 welcome · basics(offline) · 4 domains · summary
  const [basics, setBasics] = useState<BasicsState>("pending");
  const [selected, setSelected] = useState<Selections>(() => {
    const init = {} as Selections;
    for (const d of DOMAIN_IDS)
      init[d] = new Set(HABIT_TEMPLATES[d].slice(0, 3).map((t) => t.name));
    return init;
  });
  const [customs, setCustoms] = useState<CustomsByDomain>(() => {
    const init = {} as CustomsByDomain;
    for (const d of DOMAIN_IDS) init[d] = [];
    return init;
  });

  const [modalDomain, setModalDomain] = useState<DomainId | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [savingBasics, setSavingBasics] = useState(false);

  // Step offsets: offline flows insert the basics step before the domains.
  const top = offline ? 1 : 0;
  const summaryStep = top + 4;

  /* Guards: kick logged-out/no-profile users home; skip if already onboarded. */
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.user_metadata?.onboarding_completed) router.replace("/");
  }, [loading, user, router]);

  /* Auto-dismiss toast */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const setBasicsDone = useCallback(
    async (skip: boolean) => {
      setSavingBasics(true);
      try {
        if (!skip) await saveAll();
        setBasics(skip ? "skipped" : "done");
        setStep(top + 1);
      } finally {
        setSavingBasics(false);
      }
    },
    [saveAll, top],
  );

  const totalHabits = useMemo(
    () =>
      DOMAIN_IDS.reduce(
        (sum, d) => sum + selected[d].size + customs[d].length,
        0,
      ),
    [selected, customs],
  );

  const toggleTemplate = useCallback((d: DomainId, name: string) => {
    setSelected((prev) => {
      const next = new Set(prev[d]);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...prev, [d]: next };
    });
  }, []);

  const handleCreateCustom = useCallback(
    async (input: CustomHabitInput) => {
      if (!modalDomain) return;
      const uid = await getUserId();
      if (!uid) {
        setCreateError("Session expired — sign in again.");
        return;
      }
      setCreating(true);
      setCreateError(null);
      const { data, error } = await db
        .from("habits")
        .insert({
          user_id: uid,
          domain: modalDomain,
          is_template: false,
          ...input,
        })
        .select()
        .single();
      setCreating(false);
      if (error || !data) {
        setCreateError(error?.message ?? "Failed to create habit.");
        return;
      }
      const habit = data as Habit;
      setCustoms((prev) => ({
        ...prev,
        [modalDomain]: [...prev[modalDomain], habit],
      }));
      setModalDomain(null);
      setToast("Habit created");
    },
    [modalDomain],
  );

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    setFinishError(null);
    try {
      const uid = await getUserId();
      if (!uid) throw new Error(offline ? "Local profile missing" : "Not signed in");

      // Volume templates inherit the user's water/meditation targets from
      // user_settings (set during the basics step when offline).
      const { data: srow } = await db
        .from("user_settings")
        .select("water_target_ml, meditation_target_min")
        .eq("user_id", uid)
        .maybeSingle();
      const targetOverrides: Partial<Record<string, number>> = {};
      if (srow) {
        if (srow.water_target_ml != null) targetOverrides["Hydration"] = srow.water_target_ml;
        if (srow.meditation_target_min != null) targetOverrides["Meditation"] = srow.meditation_target_min;
      }

      const rows: TemplateInsertRow[] = [];
      for (const d of DOMAIN_IDS) {
        const customNames = new Set(customs[d].map((h) => h.name));
        for (const tpl of HABIT_TEMPLATES[d]) {
          if (!selected[d].has(tpl.name) || customNames.has(tpl.name)) continue;
          rows.push({
            user_id: uid,
            domain: d,
            is_template: false,
            ...tpl,
            ...(tpl.type === "volume" && targetOverrides[tpl.name] !== undefined
              ? { target_value: targetOverrides[tpl.name] }
              : {}),
          });
        }
      }
      if (rows.length > 0) {
        const { error } = await db.from("habits").insert(rows);
        if (error) throw new Error(error.message);
      }

      if (offline) {
        // Local-only finish: mark the on-device profile completed.
        setLocalOnboarded(uid, true);
        notifyLocalAuthChanged();
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
        if (updateError) throw new Error(updateError.message);
      }

      router.replace("/");
    } catch (err) {
      setFinishError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setFinishing(false);
    }
  }, [customs, selected, offline, router]);

  if (loading || !user) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <IconRefreshBold className="h-5 w-5 animate-spin text-muted" />
        </div>
      </Shell>
    );
  }

  /* ---------------- Welcome ---------------- */
  if (step === -1) {
    return (
      <Shell>
        <Card className="flex flex-col items-center gap-6 px-8 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center border border-accent/30 bg-accent/15">
            <IconCpuBold className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
              The Binder
            </h1>
            <p className="mt-3 font-mono text-sm text-muted">
              Track habits across 4 life domains and level up
            </p>
            {offline && (
              <p className="mt-4 border border-accent/30 bg-accent/[0.06] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-accent">
                Offline mode — everything stays on this phone
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={() => setStep(top)}
            className="mt-2 px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] btn-primary"
          >
            Get Started
          </Button>
        </Card>
      </Shell>
    );
  }

  /* ---------------- Basics (offline only) ---------------- */
  if (offline && basics === "pending" && step === top) {
    return (
      <Shell>
        <Card className="px-8 py-10">
          <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">
            Quick setup
          </h1>
          <p className="mt-1 font-mono text-[11px] text-muted">
            A few details make your habits smarter. You can skip and change
            these later.
          </p>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Your name
              </span>
              <input
                type="text"
                value={settings.userName}
                onChange={(e) => updateSetting("userName", e.target.value)}
                className="mt-1 w-full border border-input-border bg-input-bg px-3 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
                placeholder="Champion"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Water target · ml / day
              </span>
              <input
                type="number"
                value={settings.waterTargetMl}
                onChange={(e) =>
                  updateSetting("waterTargetMl", Number(e.target.value) || 0)
                }
                className="mt-1 w-full border border-input-border bg-input-bg px-3 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                Meditation target · minutes / day
              </span>
              <input
                type="number"
                value={settings.meditationTargetMin}
                onChange={(e) =>
                  updateSetting("meditationTargetMin", Number(e.target.value) || 0)
                }
                className="mt-1 w-full border border-input-border bg-input-bg px-3 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  Wake up
                </span>
                <div className="mt-1 flex gap-2">
                  <select
                    value={settings.wakeUpHour}
                    onChange={(e) => updateSetting("wakeUpHour", Number(e.target.value))}
                    className="flex-1 border border-input-border bg-input-bg px-2 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={settings.wakeUpMinute}
                    onChange={(e) => updateSetting("wakeUpMinute", Number(e.target.value))}
                    className="flex-1 border border-input-border bg-input-bg px-2 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                  Sleep
                </span>
                <div className="mt-1 flex gap-2">
                  <select
                    value={settings.sleepHour}
                    onChange={(e) => updateSetting("sleepHour", Number(e.target.value))}
                    className="flex-1 border border-input-border bg-input-bg px-2 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={settings.sleepMinute}
                    onChange={(e) => updateSetting("sleepMinute", Number(e.target.value))}
                    className="flex-1 border border-input-border bg-input-bg px-2 py-2 font-mono text-sm text-foreground focus:border-input-focus focus:outline-none"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void setBasicsDone(true)}
              disabled={savingBasics}
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={() => void setBasicsDone(false)}
              disabled={savingBasics}
              className="ml-auto inline-flex items-center gap-2 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingBasics && <IconRefreshBold className="h-3.5 w-3.5 animate-spin" />}
              Save &amp; continue
              <IconAltArrowRightBold className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  /* ---------------- Summary ---------------- */
  if (step === summaryStep) {
    return (
      <Shell>
        {toast && <Toast msg={toast} />}
        <Card className="px-8 py-10 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Setup Complete
          </p>
          <h1 className="mt-4 font-mono text-2xl font-bold tracking-tight text-foreground">
            You&apos;re tracking {totalHabits}{" "}
            {totalHabits === 1 ? "habit" : "habits"} across 4 domains
          </h1>

          <div className="mx-auto mt-8 max-w-sm space-y-2 text-left">
            {DOMAIN_IDS.map((d) => (
              <div
                key={d}
                className="flex items-center justify-between border border-card-border bg-background px-4 py-2.5"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                  {DOMAIN_META[d].label}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-accent">
                  {selected[d].size + customs[d].length}
                </span>
              </div>
            ))}
          </div>

          {finishError && (
            <p className="mx-auto mt-6 max-w-sm border-l-[3px] border-red-500 bg-red-500/10 px-3 py-2 text-left font-mono text-[11px] text-red-300">
              {finishError}
            </p>
          )}

          <Button
            type="button"
            onClick={() => void handleFinish()}
            disabled={finishing}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finishing && <IconRefreshBold className="h-3.5 w-3.5 animate-spin" />}
            Start Tracking
          </Button>
        </Card>
      </Shell>
    );
  }

  /* ---------------- Domain screens ---------------- */
  const domainIndex = step - top;
  if (domainIndex < 0 || domainIndex >= DOMAIN_IDS.length) {
    return (
      <Shell>
        <div />
      </Shell>
    );
  }
  const d = DOMAIN_IDS[domainIndex];
  const meta = DOMAIN_META[d];
  const templates = HABIT_TEMPLATES[d];
  const domainCustoms = customs[d];
  const picked = selected[d].size + domainCustoms.length;

  return (
    <Shell>
      {modalDomain && (
        <CustomHabitModal
          isOpen
          domain={modalDomain}
          onClose={() => setModalDomain(null)}
          onSubmit={handleCreateCustom}
          isLoading={creating}
          error={createError}
        />
      )}
      {toast && <Toast msg={toast} />}

      <Card>
        {/* Progress header */}
        <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
            Domain {domainIndex + 1} of 4
          </span>
          <div className="flex gap-1.5">
            {DOMAIN_IDS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 ${i <= domainIndex ? "bg-accent" : "bg-input-border"}`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          <h1 className="font-mono text-xl font-bold tracking-tight text-foreground">
            {meta.label}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {meta.description}
          </p>

          {/* Template checklist */}
          <div className="mt-6 space-y-2">
            {templates.map((tpl) => {
              const checked = selected[d].has(tpl.name);
              return (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => toggleTemplate(d, tpl.name)}
                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
                    checked
                      ? "border-accent/40 bg-accent/[0.06]"
                      : "border-card-border hover:border-accent/20"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      checked
                        ? "border-accent bg-accent text-button-text"
                        : "border-input-border"
                    }`}
                  >
                    {checked && <IconCheckSquareBold className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    {tpl.name}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                    {tpl.type}
                    {tpl.type === "volume" && tpl.target_value !== null
                      ? ` ×${tpl.target_value}`
                      : ""}
                    {tpl.type === "milestone" && tpl.checkpoint_count !== null
                      ? ` · ${tpl.checkpoint_count} steps`
                      : ""}{" "}
                    · {tpl.difficulty}
                  </span>
                </button>
              );
            })}

            {/* Habits created mid-onboarding */}
            {domainCustoms.map((h) => (
              <div
                key={h.id}
                className="flex w-full items-center gap-3 border border-dashed border-accent/40 bg-accent/[0.04] px-4 py-3"
              >
                <IconCheckSquareBold className="h-4 w-4 shrink-0 text-accent" />
                <span className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  {h.name}
                </span>
                <Badge size="sm" className="tracking-wider">
                  Custom
                </Badge>
              </div>
            ))}
          </div>

          {picked === 0 && (
            <p className="mt-4 border-l-[3px] border-yellow-500/60 bg-yellow-500/[0.07] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-yellow-400/90">
              No habits selected for this domain — you can continue without any.
            </p>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setModalDomain(d);
              }}
              className="inline-flex items-center gap-1.5 border border-input-border px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              <IconAddCircleBold className="h-3 w-3" />
              Add custom habit
            </button>
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                className="ml-auto inline-flex items-center gap-2 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.2em] btn-primary"
              >
              {step === summaryStep - 1 ? "Review" : "Next"}
              <IconAltArrowRightBold className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </Shell>
  );
}

/* Shared page scaffolding */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-10">
        {children}
      </div>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 border border-accent/40 bg-card-bg px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-accent shadow-lg">
      {msg}
    </div>
  );
}