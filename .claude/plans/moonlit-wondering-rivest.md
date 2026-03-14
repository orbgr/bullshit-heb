# Plan: Fix Timer Reset + Answer Display + Early Advance

## Context

Two bugs and one enhancement found during testing:
1. **Answer display bug**: ShowAnswers shows the same constant answers (house lies + real) — player-submitted fake answers don't appear because the client filters them out incorrectly
2. **Timer not resetting**: Between questions, the timer doesn't restart because `useTimer` only resets when `durationMs` changes, but it's always 10000ms
3. **Enhancement**: If all players have answered/voted, skip the remaining timer and advance immediately

## Bug 1: Answer display — player answers not shown

**Root cause**: `ShowAnswers.tsx` lines 84-86 filter out the current player's own answer from the displayed list. This is correct behavior (you shouldn't vote for your own lie). The answers ARE in the DB correctly — house lies + real answer + player answers.

**But**: The user reports "answers are constant". This means: the answer display should show OTHER players' fake answers too, plus house lies, plus real answer. The current flow works correctly for multiplayer (player A sees player B's lies but not their own). For SOLO play (1 player), the player only sees house lies + real answer, which looks "constant".

**Fix**: No change needed to the filtering logic — it's correct. The real issue was house lie count. Already fixed with `MIN_FAKE_ANSWERS = 3`. The answers will vary because:
- Each player's fake answer appears for OTHER players
- House lies fill the gap to ensure minimum 4 answers
- Solo play: 1 player answer (hidden from self) + 3 house lies + 1 real = 4 visible

**No code change needed for Bug 1.**

## Bug 2: Timer not resetting between questions

**Root cause**: `src/hooks/useTimer.ts` — the `useEffect` depends only on `[durationMs]`. Since duration is always 10000ms for both ShowQuestion and ShowAnswers, the timer never resets when moving between questions.

**Fix**: Add a `key` prop to force re-mount, OR add a reset trigger parameter.

Best approach: Pass `questionIndex` (or a `key`) to force the hook to reset. Add a `resetKey` param:

**File: `src/hooks/useTimer.ts`**
- Change signature: `useTimer(durationMs: number, resetKey: string | number)`
- Add `resetKey` to the useEffect dependency array
- This forces a fresh timer whenever the question changes

**File: `src/components/game/ShowQuestion.tsx`**
- Pass `questionIndex` as resetKey: `useTimer(duration, questionIndex)`

**File: `src/components/game/ShowAnswers.tsx`**
- Pass `questionIndex` as resetKey: `useTimer(duration, questionIndex)`

**File: `src/components/game/RoundIntro.tsx`**
- Pass `roundIndex` as resetKey: `useTimer(duration, roundIndex)`

**File: `src/components/game/ScoreBoard.tsx`**
- Pass `game.question_index` as resetKey (need to add prop): `useTimer(duration, questionIndex)`

## Enhancement: Early advance when all players done

Already partially implemented — `/api/answer` and `/api/choose-answer` both check if all players answered/voted and call `/api/tick` to advance. But verify this works correctly:

**File: `src/app/api/answer/route.ts`** — line 72-80 already checks `answerCount >= playerCount` and calls tick. OK.

**File: `src/app/api/choose-answer/route.ts`** — line 42-50 already checks `selectionCount >= playerCount` and calls tick. OK.

The early-advance logic exists. It should work if the timer bug is fixed (currently the timer fires expired=true immediately on the second question, which races with the auto-advance).

## Files to modify

| File | Change |
|------|--------|
| `src/hooks/useTimer.ts` | Add `resetKey` parameter to dependency array |
| `src/components/game/ShowQuestion.tsx` | Pass `questionIndex` as resetKey |
| `src/components/game/ShowAnswers.tsx` | Pass `questionIndex` as resetKey |
| `src/components/game/RoundIntro.tsx` | Pass `roundIndex` as resetKey |
| `src/components/game/ScoreBoard.tsx` | Add `questionIndex` prop, pass as resetKey |
| `src/app/game/[pin]/page.tsx` | Pass `questionIndex` to ScoreBoard |

## Verification

1. `pnpm dev` — start local server
2. Create game, join as 1 player, press Start
3. Verify: RoundIntro shows 5 seconds, then ShowQuestion shows countdown 10→0
4. Submit an answer — verify timer keeps counting OR game advances immediately (solo = all answered)
5. ShowAnswers: verify 4+ answers visible, countdown 10→0
6. Play through multiple questions — verify timer resets each time
7. `pnpm test` — existing tests still pass
