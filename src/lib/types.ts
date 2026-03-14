export enum GameState {
  GameStaging = 0,
  RoundIntro = 1,
  ShowQuestion = 2,
  ShowAnswers = 3,
  RevealTheTruth = 4,
  ScoreBoard = 5,
  ScoreBoardFinal = 6,
}

export interface GameRow {
  pin: string;
  locale: string;
  state: number;
  state_ts: number;
  round_index: number;
  question_index: number;
  total_q: number;
  current_q: string | null;
  has_presenter: boolean;
  time_to_answer: number;
  time_to_choose: number;
  fork_pin: string | null;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  game_pin: string;
  nickname: string;
  score: number;
  join_order: number;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  lang: string;
  question_text: string;
  real_answer: string;
  fake_answers: string[];
  citation: string | null;
}

export interface AnswerRow {
  id: string;
  game_pin: string;
  question_index: number;
  player_id: string | null;
  answer_text: string;
  is_house_lie: boolean;
  is_real_answer: boolean;
  score: number;
}

export interface AnswerSelectionRow {
  id: string;
  game_pin: string;
  question_index: number;
  player_id: string;
  selected_answer_id: string;
  score: number;
}

export interface RevealAnswerRow {
  id: string;
  game_pin: string;
  question_index: number;
  answer_text: string;
  is_real_answer: boolean;
  is_house_lie: boolean;
  creator_ids: string[];
  selector_ids: string[];
  points: number;
  display_order: number;
}
