export interface RevealInput {
  answerId: string;
  text: string;
  isRealAnswer: boolean;
  isHouseLie: boolean;
  playerId: string | null;
  answerScore: number;
}

export interface RevealSelection {
  playerId: string;
  answerText: string;
  selectionScore: number;
}

export interface RevealItem {
  answerText: string;
  isRealAnswer: boolean;
  isHouseLie: boolean;
  creatorIds: string[];
  selectorIds: string[];
  points: number;
  displayOrder: number;
}

export function generateRevealAnswers(
  answers: RevealInput[],
  selections: RevealSelection[]
): RevealItem[] {
  const seen = new Set<string>();
  const items: RevealItem[] = [];

  for (const answer of answers) {
    const textKey = answer.text.toLowerCase();
    if (seen.has(textKey)) continue;
    seen.add(textKey);

    const matchingSelections = selections.filter(
      (s) => s.answerText.toLowerCase() === textKey
    );
    const selectorIds = matchingSelections.map((s) => s.playerId);

    // Only include if someone selected it, or it's the real answer
    if (selectorIds.length === 0 && !answer.isRealAnswer) continue;

    const creators = answers
      .filter((a) => a.text.toLowerCase() === textKey)
      .filter((a) => !a.isHouseLie && !a.isRealAnswer && a.playerId)
      .map((a) => a.playerId!);

    let points = 0;
    if (answer.isRealAnswer || answer.isHouseLie) {
      points = matchingSelections[0]?.selectionScore ?? 0;
    } else {
      // Sum up answer scores for all matching answers
      points = answers
        .filter((a) => a.text.toLowerCase() === textKey)
        .reduce((sum, a) => sum + a.answerScore, 0);
    }

    items.push({
      answerText: answer.text,
      isRealAnswer: answer.isRealAnswer,
      isHouseLie: answer.isHouseLie,
      creatorIds: creators,
      selectorIds,
      points,
      displayOrder: 0,
    });
  }

  // Sort: real answer last, rest alphabetically
  items.sort((a, b) => {
    if (a.isRealAnswer) return 1;
    if (b.isRealAnswer) return -1;
    return a.answerText.localeCompare(b.answerText);
  });

  items.forEach((item, i) => {
    item.displayOrder = i;
  });

  return items;
}
