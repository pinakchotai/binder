import { createClient } from "@supabase/supabase-js";

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

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export interface StudySession {
  id: string;
  user_id: string;
  topic_name: string;
  hours_spent: number;
  created_at: string;
}

export interface PracticeQuestion {
  id: string;
  user_id: string;
  question_name: string;
  marks: number | null;
  actual_time_minutes: number | null;
  target_time_minutes: number;
  variance_minutes: number | null;
  created_at: string;
}

export interface WaterIntake {
  id: string;
  user_id: string;
  amount_ml: number;
  created_at: string;
}

export interface DailyNonNegotiable {
  id: string;
  user_id: string;
  log_date: string;
  wake_on_time: boolean;
  hydrated: boolean;
  meditation_minutes: number;
  meditation_target_met: boolean;
  workout_completed: boolean;
  screen_disconnect: boolean;
  sleep_on_time: boolean;
  daily_score: number;
  created_at: string;
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
