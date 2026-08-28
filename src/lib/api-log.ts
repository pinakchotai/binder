import { supabase } from "@/lib/supabase";
import { db } from "@/lib/storage";
import { isNativePlatform } from "@/lib/platform";
import type { HabitLog } from "@/lib/supabase";

export interface WriteHabitLogPayload {
  habit_id: string;
  log_date: string;
  value?: number | null;
  completed?: boolean | null;
  checkpoints_done?: number | null;
}

/**
 * Write a habit log and get the authoritative row back.
 * Cloud: POST /api/log (server-side engine compute).
 * Local (native/offline): on-device engine write-through.
 */
export async function writeHabitLog(
  payload: WriteHabitLogPayload,
): Promise<{ data: HabitLog | null; error: { message: string } | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session && isNativePlatform()) {
    const { data, error } = await db
      .from("habit_logs")
      .upsert(
        {
          habit_id: payload.habit_id,
          log_date: payload.log_date,
          value: payload.value,
          completed: payload.completed,
          checkpoints_done: payload.checkpoints_done,
        },
        { onConflict: "habit_id,log_date" },
      )
      .select("*")
      .single();
    if (error) return { data: null, error: { message: error.message } };
    return { data: (data as HabitLog) ?? null, error: null };
  }
  if (!session) return { data: null, error: { message: "Not signed in" } };

  try {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const json: { data?: HabitLog; error?: string } = await res
      .json()
      .catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json.error ?? `HTTP ${res.status}` } };
    return { data: json.data ?? null, error: null };
  } catch (e) {
    return {
      data: null,
      error: { message: e instanceof Error ? e.message : "Network error" },
    };
  }
}