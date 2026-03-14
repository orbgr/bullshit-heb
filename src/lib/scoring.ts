import { POINTS } from "./constants";

export interface ScoringAnswer {
  id: string;
  playerId: string | null;
  text: string;
  isHouseLie: boolean;
  isRealAnswer: boolean;
}

export interface ScoringSelection {
  playerId: string;
  answerId: string;
  answerText: string;
}

export interface ScoringResult {
  /** Points each answer earned (answer id -> points from fooling others) */
  answerScores: Map<string, number>;
  /** Points each voter earned/lost (selection playerId -> points) */
  selectionScores: Map<string, number>;
}

export function calculateScores(
  answers: ScoringAnswer[],
  selections: ScoringSelection[],
  roundIndex: number
): ScoringResult {
  const answerScores = new Map<string, number>();
  const selectionScores = new Map<string, number>();

  for (const selection of selections) {
    const matchingAnswers = answers.filter(
      (a) => a.text.toLowerCase() === selection.answerText.toLowerCase()
    );

    if (matchingAnswers.length === 1 && matchingAnswers[0].isRealAnswer) {
      // Voter found the truth
      selectionScores.set(selection.playerId, POINTS.truth[roundIndex]);
    } else if (matchingAnswers.length === 1 && matchingAnswers[0].isHouseLie) {
      // Voter fell for a house lie (penalty)
      selectionScores.set(selection.playerId, POINTS.houseLie[roundIndex]);
    } else {
      // Voter fell for a player's lie (or matched multiple)
      selectionScores.set(selection.playerId, 0);
      for (const answer of matchingAnswers) {
        if (!answer.isRealAnswer && !answer.isHouseLie && answer.playerId) {
          const current = answerScores.get(answer.id) ?? 0;
          answerScores.set(answer.id, current + POINTS.bullshit[roundIndex]);
        }
      }
    }
  }

  return { answerScores, selectionScores };
}
