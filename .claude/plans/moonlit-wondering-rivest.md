# Plan: Bullshit Hebrew — Full Multiplayer Game

## Context

Rebuild the bullshit.wtf party trivia game as a modern Hebrew-first web app. The original (Angular 4 + Firebase, 2018) is documented in `docs/`. The new app will be Next.js 15 + Supabase + Tailwind, deployed to Vercel. 300 Hebrew trivia questions will be hardcoded as seed data. Full multiplayer: phones + optional presenter screen, real-time sync.

---

## Phase 1: Project Skeleton

Create Next.js 15 app with Tailwind, Supabase client, RTL Hebrew layout.

**Files:**
- `package.json` — deps: next, react, @supabase/supabase-js, @supabase/ssr, zustand, howler, tailwindcss, vitest
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`
- `src/app/layout.tsx` — `<html lang="he" dir="rtl">`, dark theme, Hebrew font (Heebo from Google Fonts)
- `src/app/globals.css` — Tailwind imports + dark arcade theme variables
- `src/app/page.tsx` — placeholder
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server-side client (service role key)
- `.env.example`

## Phase 2: Types, Constants, Pure Logic

All shared types and testable functions — no DB needed yet.

**Files:**
- `src/lib/types.ts` — `GameState` enum (0-6), row types: `GameRow`, `PlayerRow`, `AnswerRow`, `AnswerSelectionRow`, `RevealAnswerRow`, `QuestionRow`
- `src/lib/constants.ts` — point tables, durations, MAX_PLAYERS=8, PIN_CHARS (no I/O)
- `src/lib/scoring.ts` — pure function: answers + selections + roundIndex → score maps
- `src/lib/reveal.ts` — pure function: generates ordered reveal sequence
- `src/lib/pin.ts` — `generatePin()` random 4-letter code
- `src/lib/questions.ts` — `formatQuestion()` replaces `$blank$` with `________`
- `src/lib/i18n.ts` — Hebrew UI strings dictionary
- `src/__tests__/scoring.test.ts`, `pin.test.ts`, `reveal.test.ts`

## Phase 3: Database Schema + 300 Questions

**Files:**
- `supabase/migrations/00001_schema.sql` — all tables:
  - `questions` (id, lang, question_text with `$blank$`, real_answer, fake_answers[], citation)
  - `games` (pin PK, state, state_ts, round_index, question_index, total_q, current_q, has_presenter, fork_pin)
  - `game_questions` (game_pin, q_index, question_id)
  - `players` (id, game_pin, nickname, score, join_order)
  - `answers` (id, game_pin, question_index, player_id nullable, answer_text, is_house_lie, is_real_answer, score)
  - `answer_selections` (id, game_pin, question_index, player_id, selected_answer_id, score)
  - `reveal_answers` (id, game_pin, question_index, answer_text, is_real_answer, is_house_lie, creator_ids[], selector_ids[], points, display_order)
- `supabase/migrations/00002_rls.sql` — all reads public, all writes service_role only (except questions table: reads also service_role only to prevent cheating)
- `supabase/migrations/00003_realtime.sql` — enable realtime on games, players, answers, answer_selections, reveal_answers
- `supabase/seed.sql` — **300 Hebrew trivia questions** hardcoded as INSERT statements. Categories: science, history, geography, animals, food, records, pop culture, tech, sports, language. Each with 4 fake answers.

## Phase 4: Zustand Store + Hooks

**Files:**
- `src/stores/sessionStore.ts` — Zustand + persist: role (player|presenter|null), nickname, playerId, currentPin
- `src/hooks/useGameSubscription.ts` — Supabase Realtime on `games` table, returns GameRow
- `src/hooks/usePlayersSubscription.ts` — Realtime on `players` table, returns PlayerRow[]
- `src/hooks/useTimer.ts` — countdown from state_ts, returns { remaining, progress, panic, expired }
- `src/hooks/useSound.ts` — Howler.js wrapper, only plays for presenter role

## Phase 5: Landing + Create + Join + Present Pages

**Files:**
- `src/app/page.tsx` — landing: 4 menu buttons (Join/Create/Present/Learn), responsive grid, dark arcade style
- `src/components/layout/MenuButton.tsx`
- `src/app/create/page.tsx` — question count radio (5/7/9), POST to `/api/create-game`, redirect to join
- `src/app/join/page.tsx` — two-step: PIN → nickname, calls validate-pin then join API
- `src/app/present/page.tsx` — PIN entry, sets presenter role
- `src/app/learn/page.tsx` — static Hebrew rules page
- `src/components/ui/Button.tsx`, `Input.tsx`, `Modal.tsx`

**API routes:**
- `src/app/api/create-game/route.ts` — generate PIN, pick random questions, insert game + game_questions
- `src/app/api/validate-pin/route.ts` — check game exists, not full
- `src/app/api/join/route.ts` — validate, insert player, return playerId

## Phase 6: Game Page + Lobby

**Files:**
- `src/app/game/[pin]/layout.tsx` — auth guard, GameHeader + GameFooter wrapper
- `src/app/game/[pin]/page.tsx` — switch on game.state, renders phase component
- `src/components/game/GameHeader.tsx` — home button, PIN, action button, presenter banner
- `src/components/game/GameFooter.tsx` — nickname + live score
- `src/components/game/LeaveGameModal.tsx`
- `src/components/game/GameStaging.tsx` — player grid, START button, staging music
- `src/components/game/PlayerAvatar.tsx`
- `src/components/game/RoundIntro.tsx` — shows point values for current round

## Phase 7: State Machine (tick API)

The core engine. Single file, handles ALL transitions.

**File:** `src/app/api/tick/route.ts`

Transitions (server-side, using Supabase service role):
- GameStaging → RoundIntro
- RoundIntro → ShowQuestion (populate current_q)
- ShowQuestion → ShowAnswers (add house lies + real answer to answers table)
- ShowAnswers → RevealTheTruth (calculate scores, generate reveal_answers)
- RevealTheTruth → ScoreBoard (update player cumulative scores)
- ScoreBoard → next question / RoundIntro / ScoreBoardFinal

Key: uses transaction to prevent race conditions. Validates transition is legal. Client timers fire the tick, server validates timing via state_ts.

## Phase 8: ShowQuestion + ShowAnswers

**Files:**
- `src/components/game/ShowQuestion.tsx` — question display, answer input (max 40 chars), countdown (25s), correct-answer rejection
- `src/components/game/ShowAnswers.tsx` — answer buttons (own answer excluded), vote, countdown (20s), "what was the question?" toggle
- `src/components/ui/ProgressBar.tsx` — green bar, red when panic
- `src/app/api/answer/route.ts` — validate, check not real answer, insert, auto-advance if all answered
- `src/app/api/choose-answer/route.ts` — insert selection, auto-advance if all voted

## Phase 9: Reveal + ScoreBoard

**Files:**
- `src/components/game/RevealTheTruth.tsx` — animated reveal: 7s per answer (3s show, then reveal creators/selectors/points). Real answer last. Sound effects per type.
- `src/components/game/ScoreBoard.tsx` — ranked players by score, auto-advance 5s
- `src/components/game/ScoreBoardFinal.tsx` — final scores, REPLAY button

## Phase 10: Fork (Replay)

**File:** `src/app/api/fork/route.ts` — create new game with same players (scores reset), new questions. Set fork_pin on old game → clients auto-redirect via subscription.

## Phase 11: Sound + Avatars + Polish

- Copy sound files to `public/sounds/`
- Create/copy avatar PNGs to `public/avatars/`
- Wire up `useSound` hook in all game phase components
- Dark arcade visual theme polish
- Mobile responsiveness pass

## Phase 12: Deploy

1. Create Supabase project, run migrations, seed 300 questions
2. Enable Realtime on tables via Supabase dashboard
3. Connect repo to Vercel, set env vars (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
4. Deploy, add custom domain later

---

## Verification

- **Unit tests:** `npx vitest` — scoring, reveal, pin generation
- **Manual E2E:** Open 3 browser tabs (2 players + 1 presenter), play full game through all rounds
- **Check:** RTL layout, Hebrew text, scores correct, sounds on presenter, timer sync, replay works
- **Edge cases:** player refreshes mid-game, duplicate answers, all players submit same lie, 8-player max enforced
