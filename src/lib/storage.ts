"use client";

import { supabase } from "@/lib/supabase";
import { isNativePlatform } from "@/lib/platform";
import {
  ensureLocalProfile,
  getLocalProfileId,
  getLocalSnapshot,
  hasLocalData,
  isLocalImported,
  localFrom,
  setLocalImported,
} from "@/lib/local-db";

export type Mode = "cloud" | "local" | "none";

/** Session presence, mirrored synchronously by AuthProvider. */
let sessionPresent = false;

export function setSessionPresent(value: boolean): void {
  sessionPresent = value;
}

export function hasCloudSession(): boolean {
  return sessionPresent;
}

/** Resolve which backend is authoritative right now. */
export function currentMode(hasSession: boolean): Mode {
  if (hasSession) return "cloud";
  if (isNativePlatform()) return "local";
  return "none";
}

export function isLocalMode(): boolean {
  return isNativePlatform() && !sessionPresent;
}

/**
 * The active identity: Supabase user id when signed in, otherwise the
 * on-device local profile id (native only).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  if (isNativePlatform()) return ensureLocalProfile();
  return null;
}

/**
 * Dispatch point for every data query. Cloud requests go to Supabase
 * (RLS-scoped); local requests go to the on-device localStorage store.
 * Returns the raw builder type so chaining/awaiting behaves like the
 * Supabase client in cloud mode and LocalQuery in offline mode.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbFrom(table: string): any {
  if (isNativePlatform() && !sessionPresent) {
    return localFrom(table as Parameters<typeof localFrom>[0], getLocalProfileId());
  }
  return supabase.from(table);
}

/** Query-builder facade: `db.from("habits")...` in both modes. */
export const db = {
  from: (table: string) => dbFrom(table),
};

/** True when phone is in local mode and hasn't been imported to an account yet. */
export function hasPendingLocalImport(): boolean {
  const profileId = getLocalProfileId();
  if (!profileId) return false;
  return hasLocalData(profileId) && !isLocalImported(profileId);
}

/** One-time copy of on-device data up to the signed-in Supabase account. */
export async function importLocalToCloud(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return "Not signed in";
  const profileId = getLocalProfileId();
  const snapshot = profileId ? getLocalSnapshot(profileId) : null;
  if (!snapshot || !profileId) return "Nothing to import";
  const now = new Date().toISOString();

  const res: { error: string | null } = { error: null };
  const guard = (e: { message?: string } | null): boolean => {
    if (e?.message) {
      res.error = e.message;
      return true;
    }
    return false;
  };

  const habits = snapshot.habits.map((h) => ({ ...h, user_id: uid, updated_at: now }));
  const logs = snapshot.habit_logs.map((l) => ({ ...l, user_id: uid, updated_at: now }));
  const domainScores = snapshot.domain_scores.map((r) => ({ ...r, user_id: uid }));
  const totals = snapshot.total_scores.map((r) => ({ ...r, user_id: uid }));
  const settings = snapshot.user_settings.map((r) => ({ ...r, user_id: uid }));
  const domainSettings = snapshot.user_domain_settings.map((r) => ({ ...r, user_id: uid }));

  if (habits.length > 0 && guard((await supabase.from("habits").upsert(habits, { onConflict: "id" })).error)) return res.error;
  if (logs.length > 0 && guard((await supabase.from("habit_logs").upsert(logs, { onConflict: "habit_id,log_date" })).error)) return res.error;
  if (domainScores.length > 0 && guard((await supabase.from("domain_scores").upsert(domainScores, { onConflict: "user_id,domain,score_date" })).error)) return res.error;
  if (totals.length > 0 && guard((await supabase.from("total_scores").upsert(totals, { onConflict: "user_id,score_date" })).error)) return res.error;
  if (settings.length > 0 && guard((await supabase.from("user_settings").upsert(settings, { onConflict: "user_id" })).error)) return res.error;
  if (domainSettings.length > 0 && guard((await supabase.from("user_domain_settings").upsert(domainSettings, { onConflict: "user_id,domain" })).error)) return res.error;

  if (!res.error) setLocalImported(profileId, true);
  return res.error;
}