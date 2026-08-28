import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  DOMAINS,
  applyStreakFreezes,
  computeBestStreak,
  computeDomainScore,
  computeFreezeGrant,
  computeLogPoints,
  computeTotalScore,
  computeUserStreak,
  difficultyWeight,
  getActiveDomainWeights,
} from "@binder/engine";
import type {
  Difficulty,
  Domain,
  HabitType,
  UserDomainSetting,
} from "@binder/engine";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const DEFAULT_WEIGHTS: Record<Domain, number> = {
  non_negotiables: 40,
  academia: 20,
  physical: 20,
  personal_growth: 20,
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const body: Record<string, unknown> | null = await request
    .json()
    .catch(() => null);
  if (!body) return json({ error: "Invalid JSON body" }, 400);

  const habit_id = body.habit_id;
  const log_date = body.log_date;
  if (typeof habit_id !== "string" || typeof log_date !== "string") {
    return json({ error: "habit_id and log_date are required" }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log_date)) {
    return json({ error: "log_date must be YYYY-MM-DD" }, 400);
  }

  const rawValue = body.value;
  const rawCompleted = body.completed;
  const rawCheckpoints = body.checkpoints_done;

  let value: number | null = null;
  let completed = false;
  let checkpointsDone: number | null = null;

  if (rawValue != null) {
    value = Number(rawValue);
    if (!Number.isFinite(value)) return json({ error: "value must be a number" }, 400);
  }
  if (rawCompleted != null) {
    if (typeof rawCompleted !== "boolean") {
      return json({ error: "completed must be a boolean" }, 400);
    }
    completed = rawCompleted;
  }
  if (rawCheckpoints != null) {
    checkpointsDone = Number(rawCheckpoints);
    if (!Number.isFinite(checkpointsDone)) {
      return json({ error: "checkpoints_done must be a number" }, 400);
    }
  }

  const { data: habits, error: habitsErr } = await supabase
    .from("habits")
    .select(
      "id, user_id, domain, type, difficulty, target_value, checkpoint_count, is_template",
    );
  if (habitsErr) return json({ error: habitsErr.message }, 500);
  if (!habits) return json({ error: "No habits loaded" }, 500);

  const habit = habits.find((h: (typeof habits)[number]) => h.id === habit_id);
  if (!habit) return json({ error: "Habit not found" }, 404);
  if (habit.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  const domain = habit.domain as Domain;
  const pointsEarned = computeLogPoints({
    type: habit.type as HabitType,
    difficulty: habit.difficulty as Difficulty,
    completed,
    value,
    targetValue: habit.target_value,
    checkpointsDone,
    checkpointCount: habit.checkpoint_count,
  });

  const { data: logRow, error: logErr } = await supabase
    .from("habit_logs")
    .upsert(
      {
        user_id: user.id,
        habit_id,
        log_date,
        value,
        completed,
        checkpoints_done: checkpointsDone,
        points_earned: pointsEarned,
      },
      { onConflict: "habit_id,log_date" },
    )
    .select("*")
    .single();

  if (logErr || !logRow) {
    return json({ error: logErr?.message ?? "Failed to save log" }, 500);
  }

  const { data: totalHistory } = await supabase
    .from("total_scores")
    .select("score_date, score")
    .eq("user_id", user.id);
  const history = (totalHistory ?? []).map((r) => ({
    scoreDate: r.score_date,
    score: Number(r.score),
  }));

  // Phase D: bridge the live streak boundary with held freezes first so the
  // day's own scoring sees the rescued streak. Milestone grants happen after
  // today's total exists (see below) so a 7-day run pays out the same write.
  const { data: freezeRow } = await supabase
    .from("user_streak_freezes")
    .select("available_count, protected_dates, paid_milestones, last_earned_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const freezeAvailable = Number(freezeRow?.available_count ?? 0);
  const freezePaidMilestones = Number(freezeRow?.paid_milestones ?? 0);
  const existingProtected = ((freezeRow?.protected_dates as unknown[]) ?? []).map((d) =>
    String(d).slice(0, 10),
  );

  const appliedFreezes = applyStreakFreezes({
    totalScores: history,
    asOfDate: log_date,
    availableCount: freezeAvailable,
    protectedDates: existingProtected,
  });
  const remainingFreezes = Math.max(0, freezeAvailable - appliedFreezes.consumed);

  const { error: freezeErr } = await supabase
    .from("user_streak_freezes")
    .upsert(
      {
        user_id: user.id,
        available_count: remainingFreezes,
        protected_dates: appliedFreezes.protectedDates,
        paid_milestones: freezePaidMilestones,
        last_earned_at: (freezeRow?.last_earned_at as string | null) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (freezeErr) return json({ error: freezeErr.message }, 500);

  const priorStreak = computeUserStreak({
    totalScores: history,
    asOfDate: log_date,
    protectedFreezeDates: appliedFreezes.protectedDates,
  });

  const { data: settingsRows } = await supabase
    .from("user_domain_settings")
    .select("domain, is_active, weight_override")
    .eq("user_id", user.id);
  const settings = mergeDomainSettings(settingsRows ?? []);

  let weights: Record<Domain, number>;
  try {
    weights = getActiveDomainWeights(settings);
  } catch {
    weights = { ...DEFAULT_WEIGHTS };
  }

  const { data: dayLogs } = await supabase
    .from("habit_logs")
    .select("habit_id, points_earned")
    .eq("user_id", user.id)
    .eq("log_date", log_date);

  const domainIdByHabit: Record<string, string> = {};
  for (const h of habits) domainIdByHabit[h.id] = h.domain;

  const activeWeights = habits
    .filter((h) => h.domain === domain && !h.is_template)
    .map((h) => ({ difficultyWeight: difficultyWeight(h.difficulty as Difficulty) }));

  const dayLogsForDomain = (dayLogs ?? [])
    .filter((l) => domainIdByHabit[l.habit_id] === domain)
    .map((l) => ({ pointsEarned: Number(l.points_earned) }));

  const domainScore = computeDomainScore({
    dayLogs: dayLogsForDomain,
    activeHabits: activeWeights,
    priorStreak,
  });

  const { error: domainErr } = await supabase
    .from("domain_scores")
    .upsert(
      { user_id: user.id, domain, score_date: log_date, score: domainScore },
      { onConflict: "user_id,domain,score_date" },
    );
  if (domainErr) return json({ error: domainErr.message }, 500);

  const { data: dayDomainRows } = await supabase
    .from("domain_scores")
    .select("domain, score")
    .eq("user_id", user.id)
    .eq("score_date", log_date);

  const domainScores: Record<string, number> = {};
  for (const row of dayDomainRows ?? []) domainScores[row.domain] = Number(row.score);

  const totalScore = computeTotalScore({ domainScores, weights });

  const { error: totalErr } = await supabase
    .from("total_scores")
    .upsert(
      { user_id: user.id, score_date: log_date, score: totalScore },
      { onConflict: "user_id,score_date" },
    );
  if (totalErr) return json({ error: totalErr.message }, 500);

  // Phase D grant: completed 7-day run rewards a freeze this same write
  // (today's total is now part of the run being counted).
  const freezeGrant = computeFreezeGrant({
    bestStreak: computeBestStreak([
      ...history,
      { scoreDate: log_date, score: totalScore },
    ]),
    paidMilestones: freezePaidMilestones,
    availableCount: remainingFreezes,
  });
  if (freezeGrant.added > 0 || freezeGrant.paidMilestones > freezePaidMilestones) {
    const { error: grantErr } = await supabase
      .from("user_streak_freezes")
      .upsert(
        {
          user_id: user.id,
          available_count: remainingFreezes + freezeGrant.added,
          protected_dates: appliedFreezes.protectedDates,
          paid_milestones: freezeGrant.paidMilestones,
          last_earned_at:
            freezeGrant.added > 0
              ? log_date
              : ((freezeRow?.last_earned_at as string | null) ?? null),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (grantErr) return json({ error: grantErr.message }, 500);
  }

  return json({ data: logRow });
}

function mergeDomainSettings(
  rows: Array<{
    domain: string;
    is_active: boolean;
    weight_override: number | null;
  }>,
): UserDomainSetting[] {
  const map = new Map<Domain, UserDomainSetting>();
  for (const domain of DOMAINS) {
    map.set(domain, { domain, isActive: true, weightOverride: null });
  }
  for (const row of rows) {
    if (!map.has(row.domain as Domain)) continue;
    map.set(row.domain as Domain, {
      domain: row.domain as Domain,
      isActive: row.is_active,
      weightOverride: row.weight_override == null ? null : Number(row.weight_override),
    });
  }
  return DOMAINS.map((domain) => map.get(domain)!);
}