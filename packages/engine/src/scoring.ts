import { DIFFICULTY_WEIGHTS } from "./constants";
import type { Difficulty, HabitType } from "./types";

export function difficultyWeight(difficulty: Difficulty): number {
  return DIFFICULTY_WEIGHTS[difficulty] ?? DIFFICULTY_WEIGHTS.medium;
}

export interface ComputeLogPointsInput {
  type: HabitType;
  difficulty: Difficulty;
  completed?: boolean | null;
  value?: number | null;
  targetValue?: number | null;
  checkpointsDone?: number | null;
  checkpointCount?: number | null;
  weight?: number;
}

function clampToMinimumZero(value: number): number {
  return Math.max(value, 0);
}

export function computeLogPoints(input: ComputeLogPointsInput): number {
  const weight = input.weight ?? difficultyWeight(input.difficulty);

  switch (input.type) {
    case "recurring":
      return input.completed === true ? weight : 0;

    case "volume": {
      const target = input.targetValue ?? 0;
      if (target === 0) return 0;
      const ratio = clampToMinimumZero(input.value ?? 0) / target;
      return Math.min(ratio, 1) * weight;
    }

    case "milestone": {
      const count = input.checkpointCount ?? 0;
      if (count === 0) return 0;
      const ratio = clampToMinimumZero(input.checkpointsDone ?? 0) / count;
      return Math.min(ratio, 1) * weight;
    }

    default:
      return 0;
  }
}