import { createClient } from "@supabase/supabase-js";
import { isNativePlatform } from "@/lib/platform";
import { ensureLocalProfile } from "@/lib/local-db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local",
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
);

/**
 * Active identity: the Supabase user when signed in, otherwise the on-device
 * local profile id (native/offline mode). Always non-null inside the app.
 */
export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;
  if (isNativePlatform()) return ensureLocalProfile();
  return null;
}

export interface Habit {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  type: "recurring" | "volume" | "milestone";
  frequency: "daily" | "weekly";
  difficulty: "easy" | "medium" | "hard";
  target_value: number | null;
  checkpoint_count: number | null;
  intended_time: string | null;
  intended_context: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  value: number | null;
  completed: boolean;
  checkpoints_done: number | null;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface StreakFreezeRow {
  user_id: string;
  available_count: number;
  protected_dates: string[];
  paid_milestones: number;
  last_earned_at: string | null;
  updated_at: string;
}
