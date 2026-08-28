import { describe, expect, it } from "vitest";
import { computeLogPoints, difficultyWeight } from "../src/scoring";

describe("difficultyWeight", () => {
  it("maps easy/medium/hard to 10/20/30", () => {
    expect(difficultyWeight("easy")).toBe(10);
    expect(difficultyWeight("medium")).toBe(20);
    expect(difficultyWeight("hard")).toBe(30);
  });
});

describe("computeLogPoints", () => {
  it("recurring completed earns the full weight", () => {
    expect(
      computeLogPoints({ type: "recurring", difficulty: "easy", completed: true })
    ).toBe(10);
  });

  it("recurring not completed earns zero", () => {
    expect(
      computeLogPoints({ type: "recurring", difficulty: "hard", completed: false })
    ).toBe(0);
  });

  it("recurring null completion earns zero", () => {
    expect(
      computeLogPoints({ type: "recurring", difficulty: "easy", completed: null })
    ).toBe(0);
  });

  it("volume partial value scales linearly", () => {
    expect(
      computeLogPoints({
        type: "volume",
        difficulty: "medium",
        value: 5,
        targetValue: 20,
      })
    ).toBe(5);
  });

  it("volume over target caps at full weight", () => {
    expect(
      computeLogPoints({
        type: "volume",
        difficulty: "hard",
        value: 30,
        targetValue: 10,
      })
    ).toBe(30);
  });

  it("volume negative value clamps to zero", () => {
    expect(
      computeLogPoints({
        type: "volume",
        difficulty: "hard",
        value: -5,
        targetValue: 10,
      })
    ).toBe(0);
  });

  it("volume zero target earns zero", () => {
    expect(
      computeLogPoints({
        type: "volume",
        difficulty: "medium",
        value: 5,
        targetValue: 0,
      })
    ).toBe(0);
  });

  it("milestone partial value scales", () => {
    expect(
      computeLogPoints({
        type: "milestone",
        difficulty: "hard",
        checkpointsDone: 2,
        checkpointCount: 5,
      })
    ).toBe(12);
  });

  it("milestone over count caps at full weight", () => {
    expect(
      computeLogPoints({
        type: "milestone",
        difficulty: "easy",
        checkpointsDone: 9,
        checkpointCount: 3,
      })
    ).toBe(10);
  });

  it("milestone zero checkpoints earns zero", () => {
    expect(
      computeLogPoints({
        type: "milestone",
        difficulty: "easy",
        checkpointsDone: 0,
        checkpointCount: 5,
      })
    ).toBe(0);
  });

  it("honors an explicit weight override", () => {
    expect(
      computeLogPoints({
        type: "recurring",
        difficulty: "medium",
        completed: true,
        weight: 7,
      })
    ).toBe(7);
  });
});