import type { Domain } from "./constants";

export type HabitType = "recurring" | "volume" | "milestone";

export type Difficulty = "easy" | "medium" | "hard";

export interface Habit {
  id: string;
  domain: Domain;
  name: string;
  type: HabitType;
  difficulty: Difficulty;
  frequency: string;
  targetValue: number | null;
  checkpointCount: number | null;
  intendedTime: string | null;
  intendedContext: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;
  value: number | null;
  completed: boolean | null;
  checkpointsDone: number | null;
  pointsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainScore {
  domain: Domain;
  scoreDate: string;
  score: number;
  updatedAt: string;
}

export interface TotalScore {
  scoreDate: string;
  score: number;
  updatedAt: string;
}

export interface UserDomainSetting {
  domain: Domain;
  isActive: boolean;
  weightOverride: number | null;
}