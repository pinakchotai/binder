"use client";

import {
  DEFAULT_DOMAIN_WEIGHTS,
  DOMAINS,
  computeDomainScore,
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

/* ------------------------------------------------------------------ */
/* Local persistence (profile-scoped document in localStorage)          */
/* ------------------------------------------------------------------ */

export interface LocalProfileInfo {
  id: string;
  onboarded: boolean;
  imported: boolean;
}

interface LocalDoc {
  profile: LocalProfileInfo;
  habits: Record<string, unknown>[];
  habit_logs: Record<string, unknown>[];
  domain_scores: Record<string, unknown>[];
  total_scores: Record<string, unknown>[];
  user_settings: Record<string, unknown>[];
  user_domain_settings: Record<string, unknown>[];
  user_xp: Record<string, unknown> | null;
  user_badges: Record<string, unknown>[];
  badges: Record<string, unknown>[];
}

const docKey = (profileId: string) => `thebinder_local_v1:${profileId}`;

function emptyDoc(profile: LocalProfileInfo): LocalDoc {
  return {
    profile,
    habits: [],
    habit_logs: [],
    domain_scores: [],
    total_scores: [],
    user_settings: [],
    user_domain_settings: [],
    user_xp: null,
    user_badges: [],
    badges: [],
  };
}

function loadDoc(profileId: string): LocalDoc | null {
  try {
    const raw = localStorage.getItem(docKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDoc;
    if (!parsed || !parsed.profile) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDoc(doc: LocalDoc): void {
  try {
    localStorage.setItem(docKey(doc.profile.id), JSON.stringify(doc));
  } catch {
    // silent
  }
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/* ------------------------------------------------------------------ */
/* Profile helpers                                                      */
/* ------------------------------------------------------------------ */

export function getLocalProfileId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("thebinder_local_profile_id");
  } catch {
    return null;
  }
}

export function ensureLocalProfile(): string {
  const existing = getLocalProfileId();
  if (existing) return existing;
  const id = uuid();
  try {
    localStorage.setItem("thebinder_local_profile_id", id);
    saveDoc(emptyDoc({ id, onboarded: false, imported: false }));
  } catch {
    // silent
  }
  return id;
}

export function isLocalOnboarded(profileId?: string): boolean {
  const id = profileId ?? getLocalProfileId();
  if (!id) return false;
  const doc = loadDoc(id);
  return doc?.profile.onboarded === true;
}

export function setLocalOnboarded(profileId: string, value: boolean): void {
  const doc = loadDoc(profileId) ?? emptyDoc({ id: profileId, onboarded: false, imported: false });
  doc.profile.onboarded = value;
  saveDoc(doc);
}

export function isLocalImported(profileId?: string): boolean {
  const id = profileId ?? getLocalProfileId();
  if (!id) return false;
  const doc = loadDoc(id);
  return doc?.profile.imported === true;
}

export function setLocalImported(profileId: string, value: boolean): void {
  const doc = loadDoc(profileId) ?? emptyDoc({ id: profileId, onboarded: false, imported: value });
  doc.profile.imported = value;
  saveDoc(doc);
}

export function hasLocalData(profileId?: string): boolean {
  const id = profileId ?? getLocalProfileId();
  if (!id) return false;
  const doc = loadDoc(id);
  return Boolean(doc && (doc.habits.length > 0 || doc.habit_logs.length > 0 || doc.user_settings.length > 0));
}

/* ------------------------------------------------------------------ */
/* Engine write-through (mirrors POST /api/log)                         */
/* ------------------------------------------------------------------ */

function weightSettingsFromDoc(doc: LocalDoc): UserDomainSetting[] {
  if (doc.user_domain_settings.length === 0) {
    return DOMAINS.map((domain) => ({ domain, isActive: true, weightOverride: null }));
  }
  return doc.user_domain_settings.map((row) => ({
    domain: row.domain as Domain,
    isActive: row.is_active === true,
    weightOverride: row.weight_override == null ? null : Number(row.weight_override),
  }));
}

function recomputeDay(doc: LocalDoc, dateStr: string, userId: string): void {
  const priorStreak = computeUserStreak({
    totalScores: doc.total_scores.map((row) => ({
      scoreDate: row.score_date as string,
      score: Number(row.score),
    })),
    asOfDate: dateStr,
  });

  let weights: Record<Domain, number>;
  try {
    weights = getActiveDomainWeights(weightSettingsFromDoc(doc));
  } catch {
    weights = { ...DEFAULT_DOMAIN_WEIGHTS };
  }

  const dayLogs = doc.habit_logs.filter((l) => l.log_date === dateStr);
  const domainScores: Partial<Record<Domain, number>> = {};
  const domainRows = doc.domain_scores;

  for (const domain of DOMAINS) {
    const activeHabits = doc.habits.filter(
      (h) => h.domain === domain && h.is_template !== true,
    );
    const activeWeights = activeHabits.map((h) => ({
      difficultyWeight: difficultyWeight(h.difficulty as Difficulty),
    }));
    const earned = dayLogs
      .filter((l) => activeHabits.some((h) => h.id === l.habit_id))
      .map((l) => ({ pointsEarned: Number(l.points_earned) }));

    const score = computeDomainScore({
      dayLogs: earned,
      activeHabits: activeWeights,
      priorStreak,
    });

    const existingIdx = domainRows.findIndex(
      (r) => r.domain === domain && r.score_date === dateStr,
    );
    if (score > 0) {
      // Mirror the web triggers: only days with earned points keep a row.
      if (existingIdx >= 0) {
        domainRows[existingIdx].score = score;
      } else {
        domainRows.push({
          id: uuid(),
          user_id: userId,
          domain,
          score_date: dateStr,
          score,
        });
      }
      domainScores[domain] = score;
    } else if (existingIdx >= 0) {
      domainRows.splice(existingIdx, 1);
    }
  }

  const total = computeTotalScore({
    domainScores: domainScores as Record<Domain, number>,
    weights,
  });

  const totalIdx = doc.total_scores.findIndex((r) => r.score_date === dateStr);
  if (total > 0) {
    if (totalIdx >= 0) {
      doc.total_scores[totalIdx].score = total;
    } else {
      doc.total_scores.push({
        id: uuid(),
        user_id: userId,
        score_date: dateStr,
        score: total,
      });
    }
  } else if (totalIdx >= 0) {
    doc.total_scores.splice(totalIdx, 1);
  }
}

function recomputeXp(doc: LocalDoc, userId: string): void {
  const totalXp = doc.habit_logs.reduce(
    (sum, l) => sum + Number(l.points_earned ?? 0),
    0,
  );
  let level = 1;
  while (totalXp >= level * level * 100) level++;
  doc.user_xp = {
    user_id: userId,
    total_xp: Math.round(totalXp),
    current_level: level,
  };
}

function recomputeAfterLogWrite(doc: LocalDoc, userId: string, dateStr: string): void {
  recomputeDay(doc, dateStr, userId);
  recomputeXp(doc, userId);
}

/* ------------------------------------------------------------------ */
/* Supabase-compatible query builder (local subset)                     */
/* ------------------------------------------------------------------ */

type TableKey =
  | "habits"
  | "habit_logs"
  | "domain_scores"
  | "total_scores"
  | "user_xp"
  | "user_badges"
  | "badges"
  | "user_settings"
  | "user_domain_settings";

type FilterOp = "eq" | "gte";

interface Filter {
  op: FilterOp;
  col: string;
  val: unknown;
}

interface OrderClause {
  col: string;
  asc: boolean;
}

type WriteOp = "insert" | "upsert" | "update" | "delete";

const IGNORED_COLUMNS = new Set(["user_id", "id"]);

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const s = String(a);
  const t = String(b);
  return s < t ? -1 : s > t ? 1 : 0;
}

function matches(row: Record<string, unknown>, filter: Filter): boolean {
  const value = row[filter.col];
  switch (filter.op) {
    case "eq":
      return value === filter.val;
    case "gte":
      if (typeof value === "number" && typeof filter.val === "number") {
        return value >= (filter.val as number);
      }
      return String(value) >= String(filter.val);
  }
}

function project(row: Record<string, unknown>, cols: string | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of (cols ?? "*").split(",")) {
    const col = c.trim();
    if (col === "*") return { ...row };
    out[col] = row[col];
  }
  return out;
}

export class LocalQuery {
  private table: TableKey;
  private op: "select" | WriteOp = "select";
  private cols: string | null = null;
  private filters: Filter[] = [];
  private orders: OrderClause[] = [];
  private rows: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private conflict: string[] = [];
  private want: "all" | "single" | "maybe" = "all";
  private profileId: string;

  constructor(table: TableKey, profileId: string) {
    this.table = table;
    this.profileId = profileId;
  }

  select(cols?: string): this {
    this.cols = cols ?? "*";
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ op: "eq", col, val });
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push({ op: "gte", col, val });
    return this;
  }

  order(
    col: string,
    options?: { ascending: boolean } | { ascending?: boolean },
  ): this {
    this.orders.push({ col, asc: options?.ascending !== false });
    return this;
  }

  single(): this {
    this.want = "single";
    return this;
  }

  maybeSingle(): this {
    this.want = "maybe";
    return this;
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]): this {
    this.op = "insert";
    this.rows = rows;
    return this;
  }

  upsert(
    rows: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string },
  ): this {
    this.op = "upsert";
    this.rows = rows;
    this.conflict = (options?.onConflict ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return this;
  }

  update(row: Record<string, unknown>): this {
    this.op = "update";
    this.rows = row;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as never, onrejected as never);
  }

  async execute(): Promise<{ data: unknown; error: { message: string } | null }> {
    const profileId = this.profileId || ensureLocalProfile();
    const doc = loadDoc(profileId) ?? emptyDoc({ id: profileId, onboarded: false, imported: false });

    const tableBase = (): Record<string, unknown>[] => {
      if (this.table === "user_xp") return doc.user_xp ? [doc.user_xp] : [];
      return (doc[this.table] as Record<string, unknown>[]) ?? [];
    };

    const matchesAll = (row: Record<string, unknown>) =>
      this.filters.every((f) => {
        if (IGNORED_COLUMNS.has(f.col) && f.op === "eq") return true;
        return matches(row, f);
      });

    const sort = (list: Record<string, unknown>[]) => {
      if (this.orders.length === 0) return list;
      return [...list].sort((a, b) => {
        for (const o of this.orders) {
          const c = compareValues(a[o.col], b[o.col]);
          if (c !== 0) return o.asc ? c : -c;
        }
        return 0;
      });
    };

    const projectAll = (list: Record<string, unknown>[]) =>
      this.cols
        ? list.map((row) => project(row, this.cols))
        : list.map((row) => ({ ...row }));

    const base = tableBase();

    if (this.op === "select") {
      const filtered = base.filter(matchesAll);
      const sorted = sort(filtered);
      if (this.want === "single") {
        const row = sorted.length > 0 ? sorted[0] : null;
        const data = this.cols && row ? project(row, this.cols) : row;
        return { data: data ?? null, error: null };
      }
      if (this.want === "maybe") {
        const row = sorted.length > 0 ? sorted[0] : null;
        const data = this.cols && row ? project(row, this.cols) : row;
        return { data: data ?? null, error: null };
      }
      return { data: projectAll(sorted), error: null };
    }

    const writeRows = Array.isArray(this.rows)
      ? this.rows
      : this.rows
        ? [this.rows]
        : [];

    const returnRows: Record<string, unknown>[] = [];
    const nowIso = new Date().toISOString();

    if (this.op === "insert") {
      for (const input of writeRows) {
        const row: Record<string, unknown> = {
          id: (input.id as string) ?? uuid(),
          ...input,
        };
        if ("created_at" in row === false || row.created_at == null) row.created_at = nowIso;
        row.updated_at = nowIso;
        if (this.table === "user_xp") {
          doc.user_xp = row;
        } else {
          const list = doc[this.table] as Record<string, unknown>[];
          list.push(row);
        }
        returnRows.push(row);
      }
      if (this.table === "habit_logs") {
        for (const row of returnRows) {
          recomputeAfterLogWrite(doc, row.user_id as string, row.log_date as string);
        }
      }
    } else if (this.op === "upsert") {
      for (const input of writeRows) {
        let existing: Record<string, unknown> | undefined;
        let existingIndex = -1;
        const list = doc[this.table] as Record<string, unknown>[];
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const conflictMatches =
              this.conflict.length === 0 ||
              this.conflict.every(
                (c) => list[i][c] === input[c],
              );
            if (conflictMatches) {
              existing = list[i];
              existingIndex = i;
              break;
            }
          }
        }
        const merged: Record<string, unknown> = { ...existing, ...input };
        merged.updated_at = nowIso;
        if (existing) merged.id = existing.id;
        if (!merged.id) merged.id = uuid();
        if (this.table === "habit_logs" && merged.habit_id) {
          const habit = doc.habits.find((h) => h.id === merged.habit_id);
          if (!habit) {
            return { data: null, error: { message: "Habit not found" } };
          }
          const points = computeLogPoints({
            type: habit.type as HabitType,
            difficulty: habit.difficulty as Difficulty,
            completed: (merged.completed ?? false) as boolean,
            value: merged.value == null ? null : Number(merged.value),
            targetValue: habit.target_value == null ? null : Number(habit.target_value),
            checkpointsDone: merged.checkpoints_done == null ? null : Number(merged.checkpoints_done),
            checkpointCount: habit.checkpoint_count == null ? null : Number(habit.checkpoint_count),
          });
          merged.points_earned = points;
        }
        if (this.table === "user_xp") {
          doc.user_xp = merged;
        } else {
          const list = doc[this.table] as Record<string, unknown>[];
          const duplicate = list.findIndex(
            (r) => r !== undefined && existingIndex === -1 && this.conflict.length > 0 &&
              this.conflict.every((c) => r[c] === merged[c]),
          );
          if (existingIndex >= 0) list[existingIndex] = merged;
          else if (duplicate >= 0) list[duplicate] = merged;
          else list.push(merged);
        }
        returnRows.push(merged);
      }
      if (this.table === "habit_logs") {
        for (const row of returnRows) {
          recomputeAfterLogWrite(doc, row.user_id as string, row.log_date as string);
        }
      }
    } else if (this.op === "update") {
      const updateData = this.rows as Record<string, unknown>;
      for (let i = 0; i < base.length; i++) {
        const row = base[i];
        if (matchesAll(row)) {
          const merged: Record<string, unknown> = { ...row, ...updateData, updated_at: nowIso };
          if (this.table === "user_xp") doc.user_xp = merged;
          else (doc[this.table] as Record<string, unknown>[])[i] = merged;
          returnRows.push(merged);
        }
      }
    } else if (this.op === "delete") {
      const list = doc[this.table] as Record<string, unknown>[];
      const kept = list.filter((row, i) => {
        if (this.table === "user_xp" && i === 0) return false;
        return !matchesAll(row);
      });
      if (this.table === "user_xp") doc.user_xp = null;
      else (doc[this.table] as Record<string, unknown>[]) = kept;
      if (this.table === "habits") {
        const deletedIds = new Set(
          list.filter((row) => !kept.includes(row)).map((row) => row.id),
        );
        const removedDates = new Set(
          doc.habit_logs
            .filter((l) => deletedIds.has(l.habit_id))
            .map((l) => l.log_date as string),
        );
        doc.habit_logs = doc.habit_logs.filter((l) => !deletedIds.has(l.habit_id));
        const liveDates = new Set(doc.habit_logs.map((l) => l.log_date as string));
        for (const dateStr of new Set([...liveDates, ...removedDates])) {
          recomputeDay(doc, dateStr, this.profileId);
        }
        recomputeXp(doc, this.profileId);
      } else if (this.table === "habit_logs") {
        const deletedDates = list
          .filter((row) => !kept.includes(row))
          .map((row) => row.log_date as string);
        for (const dateStr of deletedDates) recomputeDay(doc, dateStr, this.profileId);
        recomputeXp(doc, this.profileId);
      }
    }

    saveDoc(doc);

    const projected = projectAll(returnRows);
    if (this.want === "single") {
      return { data: projected[0] ?? null, error: null };
    }
    if (this.want === "maybe") {
      return { data: projected[0] ?? null, error: null };
    }
    return { data: projected.length > 0 ? projected : null, error: null };
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

export function localFrom(table: TableKey, profileId: string | null): LocalQuery {
  return new LocalQuery(table, profileId ?? ensureLocalProfile());
}

export interface LocalSnapshot {
  habits: Record<string, unknown>[];
  habit_logs: Record<string, unknown>[];
  domain_scores: Record<string, unknown>[];
  total_scores: Record<string, unknown>[];
  user_settings: Record<string, unknown>[];
  user_domain_settings: Record<string, unknown>[];
}

export function getLocalSnapshot(profileId?: string): LocalSnapshot | null {
  const id = profileId ?? getLocalProfileId();
  if (!id) return null;
  const doc = loadDoc(id);
  if (!doc) return null;
  return {
    habits: doc.habits,
    habit_logs: doc.habit_logs,
    domain_scores: doc.domain_scores,
    total_scores: doc.total_scores,
    user_settings: doc.user_settings,
    user_domain_settings: doc.user_domain_settings,
  };
}