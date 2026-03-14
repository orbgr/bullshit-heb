# Plan: Fix Reveal/Scoring Bugs, Lobby Sync, Custom Timers + Tests

## Context

Three issues found during multiplayer testing:
1. **RevealTheTruth/ScoreBoard broken** — duplicates in reveal, scores not updating
2. **Lobby doesn't update in real-time** — player 1 only sees themselves, not new joiners
3. **Feature**: custom timer settings when creating a game

---

## Fix 1: RevealTheTruth + Scoring (4 sub-fixes)

### 1a. Add tickedRef guard to RevealTheTruth
**File:** `src/components/game/RevealTheTruth.tsx`
- Add `tickedRef = useRef(false)` guard before the tick fetch call (line ~75)
- Prevents duplicate tick calls from timer re-fires

### 1b. Fix Supabase join — don't use FK join, look up answer_text manually
**File:** `src/app/api/tick/route.ts` (ShowAnswers case, ~line 170)
- Remove the fragile `answers!answer_selections_selected_answer_id_fkey(answer_text)` join
- Instead: fetch answer_selections plain, then for each selection, find the matching answer from the already-fetched answers array by `selected_answer_id`
- This eliminates the silent join failure that causes empty answerText → all scores = 0

### 1c. Fix score persistence — falsy 0 bug
**File:** `src/app/api/tick/route.ts` (RevealTheTruth case, ~line 279-287)
- `if (a.score)` and `if (s.score)` both skip score=0 because 0 is falsy in JS
- Change to: always add to delta map, remove the truthy guards
- Also: `if (delta !== 0)` is fine to keep (no update needed if truly 0)

### 1d. Make tick idempotent — clean before insert
**File:** `src/app/api/tick/route.ts` (ShowAnswers case)
- Before inserting reveal_answers, delete existing for this game_pin + question_index
- Prevents duplicates if tick fires twice

---

## Fix 2: Lobby Real-Time Updates

**File:** `src/hooks/usePlayersSubscription.ts`
- Replace the merge-state approach with a simpler pattern: on ANY Realtime event (INSERT or UPDATE), **re-fetch the full player list**
- Max 8 players so the query is trivial
- Eliminates all race conditions between initial fetch and subscription

```typescript
const refetch = async () => {
  const { data } = await supabase.from("players").select("*")
    .eq("game_pin", pin).order("join_order");
  if (data) setPlayers(data);
};
// Initial fetch
refetch();
// On any change, re-fetch
channel.on("postgres_changes", { event: "*", ... }, () => refetch());
```

---

## Feature: Custom Timer Settings

### 3a. New migration
**File:** `supabase/migrations/00004_custom_timers.sql`
- `ALTER TABLE games ADD COLUMN time_to_answer smallint NOT NULL DEFAULT 15;`
- `ALTER TABLE games ADD COLUMN time_to_choose smallint NOT NULL DEFAULT 10;`

### 3b. Update types
**File:** `src/lib/types.ts` — add `time_to_answer` and `time_to_choose` to GameRow

### 3c. Update create game UI
**File:** `src/app/create/page.tsx`
- Add two free-form number inputs with defaults 15 and 10

### 3d. Update create-game API
**File:** `src/app/api/create-game/route.ts`
- Accept + validate (min 5, max 60)

### 3e. Use game-specific timers
**Files:** `ShowQuestion.tsx`, `ShowAnswers.tsx`, `game/[pin]/page.tsx`
- Pass `game.time_to_answer * 1000` and `game.time_to_choose * 1000` as duration instead of reading DURATIONS constant

---

## Tests

### New: `src/__tests__/tick-scoring.test.ts`
- Player selects real answer → truth points
- Player selects house lie → negative points
- Player selects player lie → author gets bullshit points, selector gets 0
- Score of 0 is correctly tracked (regression for falsy bug)
- Negative scores are correctly tracked

### Update: `src/__tests__/scoring.test.ts`
- Add: score=0 not lost
- Add: negative house lie score tracked

---

## Files to modify

| File | Change |
|------|--------|
| `src/components/game/RevealTheTruth.tsx` | Add tickedRef guard |
| `src/app/api/tick/route.ts` | Fix join, fix score persistence, idempotent inserts |
| `src/hooks/usePlayersSubscription.ts` | Re-fetch on every event |
| `src/app/create/page.tsx` | Add timer inputs |
| `src/app/api/create-game/route.ts` | Accept timer params |
| `src/lib/types.ts` | Add timer fields to GameRow |
| `src/components/game/ShowQuestion.tsx` | Accept duration prop |
| `src/components/game/ShowAnswers.tsx` | Accept duration prop |
| `src/app/game/[pin]/page.tsx` | Pass timer values to components |
| `supabase/migrations/00004_custom_timers.sql` | New migration |
| `src/__tests__/tick-scoring.test.ts` | New test file |
| `src/__tests__/scoring.test.ts` | Add edge case tests |

## Verification

1. Run new migration in Supabase SQL Editor
2. `pnpm test` — all tests pass
3. `pnpm dev` — start local
4. Create game with custom timers (e.g., 20s/15s)
5. Join with 2 browser tabs — verify BOTH see each other in lobby immediately
6. Play through: answer → vote → reveal (no duplicates) → scoreboard (scores update)
7. Play multiple questions — scores accumulate correctly
