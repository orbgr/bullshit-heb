import { GameState } from "./types";

export const POINTS = {
  truth: [1000, 1500, 2000],
  bullshit: [500, 750, 1000],
  houseLie: [-500, -750, -1000],
} as const;

export const DURATIONS: Partial<Record<GameState, number>> = {
  [GameState.RoundIntro]: 5000,
  [GameState.ShowQuestion]: 10000,
  [GameState.ShowAnswers]: 10000,
  [GameState.ScoreBoard]: 5000,
};

export const REVEAL_INTERVAL_MS = 7000;
export const REVEAL_SHOW_CREATORS_DELAY_MS = 3000;

export const MAX_PLAYERS = 8;
export const MAX_NICKNAME_LEN = 9;
export const MAX_ANSWER_LEN = 40;
export const PIN_LENGTH = 4;
export const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
