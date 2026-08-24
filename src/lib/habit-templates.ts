import type { DomainId } from "@/lib/domains";

export interface HabitTemplate {
  name: string;
  type: "recurring" | "volume" | "milestone";
  frequency: "daily" | "weekly";
  difficulty: "easy" | "medium" | "hard";
  target_value: number | null;
  checkpoint_count: number | null;
}

const T = (
  name: string,
  type: HabitTemplate["type"],
  difficulty: HabitTemplate["difficulty"],
  amount?: number,
): HabitTemplate => ({
  name,
  type,
  frequency: "daily",
  difficulty,
  target_value: type === "volume" ? (amount ?? 1) : null,
  checkpoint_count: type === "milestone" ? (amount ?? 1) : null,
});

export const HABIT_TEMPLATES: Record<DomainId, HabitTemplate[]> = {
  non_negotiables: [
    T("Sleep on time", "recurring", "easy"),
    T("Wake up on time", "recurring", "easy"),
    T("Hydration", "volume", "medium", 3000),
    T("Meditation", "volume", "medium", 5),
    T("Workout", "recurring", "hard"),
    T("Screen disconnect", "recurring", "medium"),
  ],
  academia: [
    T("Study session", "recurring", "medium"),
    T("Study hours", "volume", "hard", 3),
    T("Reading (textbook/notes)", "volume", "medium", 30),
    T("Revision", "recurring", "medium"),
    T("Mock test / quiz", "volume", "medium", 80),
    T("Class attendance", "recurring", "easy"),
  ],
  physical: [
    T("Workout", "recurring", "medium"),
    T("Steps / cardio", "volume", "hard", 10000),
    T("Diet adherence", "recurring", "medium"),
    // Deviation (#1): specced as volume target 0, which would crash the
    // scoring trigger (NULLIF(0,0) → NULL points vs NOT NULL column).
    T("Weight check-in", "recurring", "easy"),
    T("Sports / activity practice", "recurring", "easy"),
  ],
  personal_growth: [
    T("Reading (non-academic)", "volume", "medium", 20),
    T("Journaling", "recurring", "medium"),
    T("New skill practice", "recurring", "medium"),
    T("Gratitude / reflection log", "recurring", "easy"),
    T("Big goal / project milestone", "milestone", "hard", 5),
  ],
};
