import { describe, it, expect } from "vitest";
import { calculateScores, ScoringAnswer, ScoringSelection } from "@/lib/scoring";

function makeAnswer(
  id: string,
  playerId: string | null,
  text: string,
  opts: { isHouseLie?: boolean; isRealAnswer?: boolean } = {}
): ScoringAnswer {
  return {
    id,
    playerId,
    text,
    isHouseLie: opts.isHouseLie ?? false,
    isRealAnswer: opts.isRealAnswer ?? false,
  };
}

describe("calculateScores", () => {
  const answers: ScoringAnswer[] = [
    makeAnswer("a1", "p1", "fake1"),
    makeAnswer("a2", "p2", "fake2"),
    makeAnswer("a3", null, "house lie", { isHouseLie: true }),
    makeAnswer("truth", null, "real answer", { isRealAnswer: true }),
  ];

  it("awards truth points when player selects the real answer", () => {
    const selections: ScoringSelection[] = [
      { playerId: "p1", answerId: "truth", answerText: "real answer" },
    ];
    const result = calculateScores(answers, selections, 0);
    expect(result.selectionScores.get("p1")).toBe(1000);
  });

  it("awards bullshit points when player fools another", () => {
    const selections: ScoringSelection[] = [
      { playerId: "p2", answerId: "a1", answerText: "fake1" },
    ];
    const result = calculateScores(answers, selections, 0);
    expect(result.selectionScores.get("p2")).toBe(0);
    expect(result.answerScores.get("a1")).toBe(500);
  });

  it("penalizes falling for a house lie", () => {
    const selections: ScoringSelection[] = [
      { playerId: "p1", answerId: "a3", answerText: "house lie" },
    ];
    const result = calculateScores(answers, selections, 0);
    expect(result.selectionScores.get("p1")).toBe(-500);
  });

  it("scales points by round index", () => {
    const selections: ScoringSelection[] = [
      { playerId: "p1", answerId: "truth", answerText: "real answer" },
      { playerId: "p2", answerId: "a1", answerText: "fake1" },
    ];

    const r1 = calculateScores(answers, selections, 1);
    expect(r1.selectionScores.get("p1")).toBe(1500);
    expect(r1.answerScores.get("a1")).toBe(750);

    const r2 = calculateScores(answers, selections, 2);
    expect(r2.selectionScores.get("p1")).toBe(2000);
    expect(r2.answerScores.get("a1")).toBe(1000);
  });

  it("credits multiple authors when they wrote the same text", () => {
    const dupeAnswers: ScoringAnswer[] = [
      makeAnswer("a1", "p1", "same lie"),
      makeAnswer("a2", "p2", "same lie"),
      makeAnswer("truth", null, "real answer", { isRealAnswer: true }),
    ];
    const selections: ScoringSelection[] = [
      { playerId: "p3", answerId: "a1", answerText: "same lie" },
    ];
    const result = calculateScores(dupeAnswers, selections, 0);
    expect(result.answerScores.get("a1")).toBe(500);
    expect(result.answerScores.get("a2")).toBe(500);
  });

  it("returns empty maps when no selections", () => {
    const result = calculateScores(answers, [], 0);
    expect(result.answerScores.size).toBe(0);
    expect(result.selectionScores.size).toBe(0);
  });
});
