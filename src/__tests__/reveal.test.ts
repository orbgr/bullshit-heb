import { describe, it, expect } from "vitest";
import {
  generateRevealAnswers,
  RevealInput,
  RevealSelection,
} from "@/lib/reveal";

describe("generateRevealAnswers", () => {
  const answers: RevealInput[] = [
    { answerId: "a1", text: "fake1", isRealAnswer: false, isHouseLie: false, playerId: "p1", answerScore: 500 },
    { answerId: "a2", text: "fake2", isRealAnswer: false, isHouseLie: false, playerId: "p2", answerScore: 0 },
    { answerId: "a3", text: "house", isRealAnswer: false, isHouseLie: true, playerId: null, answerScore: 0 },
    { answerId: "truth", text: "real", isRealAnswer: true, isHouseLie: false, playerId: null, answerScore: 0 },
  ];

  const selections: RevealSelection[] = [
    { playerId: "p2", answerText: "fake1", selectionScore: 0 },
    { playerId: "p1", answerText: "real", selectionScore: 1000 },
  ];

  it("puts real answer last", () => {
    const result = generateRevealAnswers(answers, selections);
    const last = result[result.length - 1];
    expect(last.isRealAnswer).toBe(true);
    expect(last.answerText).toBe("real");
  });

  it("filters out answers with no selectors (except real answer)", () => {
    const result = generateRevealAnswers(answers, selections);
    const texts = result.map((r) => r.answerText);
    expect(texts).toContain("fake1");
    expect(texts).toContain("real");
    expect(texts).not.toContain("fake2");
    expect(texts).not.toContain("house");
  });

  it("correctly identifies creators", () => {
    const result = generateRevealAnswers(answers, selections);
    const fake1 = result.find((r) => r.answerText === "fake1")!;
    expect(fake1.creatorIds).toEqual(["p1"]);
  });

  it("correctly identifies selectors", () => {
    const result = generateRevealAnswers(answers, selections);
    const fake1 = result.find((r) => r.answerText === "fake1")!;
    expect(fake1.selectorIds).toEqual(["p2"]);
  });

  it("assigns sequential display order", () => {
    const result = generateRevealAnswers(answers, selections);
    result.forEach((item, i) => {
      expect(item.displayOrder).toBe(i);
    });
  });

  it("deduplicates answers with the same text", () => {
    const dupeAnswers: RevealInput[] = [
      { answerId: "a1", text: "same", isRealAnswer: false, isHouseLie: false, playerId: "p1", answerScore: 500 },
      { answerId: "a2", text: "same", isRealAnswer: false, isHouseLie: false, playerId: "p2", answerScore: 500 },
      { answerId: "truth", text: "real", isRealAnswer: true, isHouseLie: false, playerId: null, answerScore: 0 },
    ];
    const dupeSelections: RevealSelection[] = [
      { playerId: "p3", answerText: "same", selectionScore: 0 },
    ];
    const result = generateRevealAnswers(dupeAnswers, dupeSelections);
    const sameItems = result.filter((r) => r.answerText === "same");
    expect(sameItems).toHaveLength(1);
    expect(sameItems[0].creatorIds).toEqual(["p1", "p2"]);
    expect(sameItems[0].points).toBe(1000);
  });
});
