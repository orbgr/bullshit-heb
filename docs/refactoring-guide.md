# Bullshit.wtf — Refactoring Guide

How to rebuild this game with a modern stack. The original codebase (circa 2018) uses Angular 4, Firebase Realtime Database, and Firebase Cloud Functions on Node 14. Everything here is about replacing those pieces while keeping the same game logic.

---

## Current Stack vs. Proposed Stack

| Layer | Current (2018) | Proposed (2026) |
|-------|---------------|-----------------|
| **Frontend framework** | Angular 4 (RxJS 5, `@angular/http`) | React 18+ with Next.js (or Vite + React) |
| **Language** | TypeScript ~4.5, target ES5 | TypeScript 5.x, target ES2022+ |
| **CSS** | Bulma 0.9 + SCSS, custom overrides | Tailwind CSS 4 |
| **State management** | Implicit (Firebase subscriptions in services) | Zustand or Jotai (lightweight, fits the real-time model) |
| **Realtime data** | Firebase Realtime Database (direct SDK in browser) | Supabase Realtime (Postgres + WebSocket channels) or Firebase Firestore |
| **Backend** | Firebase Cloud Functions (Node 14, HTTP + DB triggers) | Supabase Edge Functions (Deno) or Next.js API routes + Supabase DB triggers |
| **Auth** | Firebase Anonymous Auth | Supabase Anonymous Auth or session tokens |
| **Analytics** | BigQuery (via Cloud Functions) | PostHog or Supabase + any warehouse |
| **Sound** | Howler.js | Howler.js (still fine) or Web Audio API via `use-sound` React hook |
| **Error tracking** | Sentry (legacy module, gutted) | Sentry (modern SDK) |
| **Hosting** | Firebase Hosting | Vercel (if Next.js) or Cloudflare Pages |
| **Build tooling** | Angular CLI 1.7, Webpack | Vite or Next.js built-in |

---

## Why These Choices

**React over Angular:** The app is simple — 11 pages, no deep component trees, no complex forms. React with hooks is a better fit. Angular's module/service/DI system is overkill here.

**Supabase over Firebase Realtime Database:** The game's data model is relational (games → players → answers → selections). Postgres handles this more naturally than a JSON tree. Supabase also gives you Realtime subscriptions, Row Level Security, Edge Functions, and auth — all in one place. If you prefer staying in the Firebase ecosystem, Firestore is the modern replacement for the Realtime Database.

**Tailwind over Bulma:** The current SCSS is mostly overriding Bulma defaults anyway. Tailwind gives you the same utility-first approach without fighting the framework.

**Zustand over Redux/Context:** The game state is a single object that changes through well-defined transitions. Zustand is minimal, supports subscriptions, and pairs well with real-time data feeds.

---

## Architecture Overview

```
bullshit-heb/
├── src/
│   ├── app/                    # Next.js App Router (or Vite pages)
│   │   ├── page.tsx            # Landing page (replaces mobile/desktop split)
│   │   ├── create/page.tsx     # Create game
│   │   ├── join/[pin]/page.tsx # Join game
│   │   ├── present/page.tsx    # Present game
│   │   ├── learn/page.tsx      # How to play
│   │   └── game/[pin]/         # All in-game screens
│   │       ├── layout.tsx      # Game layout (header + footer + guards)
│   │       └── page.tsx        # Single page, renders current state
│   │
│   ├── components/
│   │   ├── GameHeader.tsx
│   │   ├── GameFooter.tsx
│   │   ├── ProgressBar.tsx
│   │   └── PlayerAvatar.tsx
│   │
│   ├── hooks/
│   │   ├── useGameState.ts     # Subscribe to game state changes
│   │   ├── usePlayers.ts       # Subscribe to player list
│   │   ├── useTimer.ts         # Countdown timer logic
│   │   └── useSound.ts         # Sound effect wrapper
│   │
│   ├── stores/
│   │   └── gameStore.ts        # Zustand store (session, current game, role)
│   │
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client init
│   │   ├── types.ts            # Shared types (replaces game-model.ts)
│   │   ├── scoring.ts          # Scoring logic (extracted from tick.ts)
│   │   └── constants.ts        # Durations, point tables, max players
│   │
│   └── api/                    # Server-side logic
│       ├── create-game.ts
│       ├── join.ts
│       ├── answer.ts
│       ├── tick.ts
│       └── fork.ts
│
├── supabase/
│   ├── migrations/             # SQL migrations for the schema
│   └── functions/              # Edge Functions (if using Supabase Functions)
│
├── public/
│   └── sounds/                 # Audio files
│
└── docs/                       # You're here
```

---

## Refactoring by Layer

### 1. Data Model: JSON Tree → Postgres Tables

The original stores everything as a nested JSON tree under `games/{pin}`. This flattens naturally into tables:

```sql
-- Games table
create table games (
    pin         text primary key,
    locale      text not null default 'he',
    state       smallint not null default 0,
    state_ts    timestamptz not null default now(),
    round_index smallint not null default 0,
    question_index smallint not null default 0,
    total_q     smallint not null,
    current_q   text,
    has_presenter boolean not null default false,
    fork_pin    text references games(pin),
    created_at  timestamptz not null default now()
);

-- Question bank
create table questions (
    id          uuid primary key default gen_random_uuid(),
    lang        text not null,
    question_text text not null,
    real_answer text not null,
    fake_answers text[] not null default '{}',
    citation    text
);
create index idx_questions_lang on questions(lang);

-- Questions assigned to a game
create table game_questions (
    game_pin    text references games(pin) on delete cascade,
    q_index     smallint not null,
    question_id uuid references questions(id),
    primary key (game_pin, q_index)
);

-- Players
create table players (
    id          uuid primary key default gen_random_uuid(),
    game_pin    text references games(pin) on delete cascade,
    nickname    text not null,
    score       integer not null default 0,
    join_order  smallint not null,
    created_at  timestamptz not null default now()
);

-- Player answers (the lies they write)
create table answers (
    id          uuid primary key default gen_random_uuid(),
    game_pin    text not null,
    question_index smallint not null,
    player_id   uuid references players(id),
    answer_text text not null,
    is_house_lie boolean not null default false,
    is_real_answer boolean not null default false,
    score       integer not null default 0
);

-- Answer selections (which answer each player voted for)
create table answer_selections (
    game_pin    text not null,
    question_index smallint not null,
    player_id   uuid references players(id),
    selected_text text not null,
    score       integer not null default 0,
    primary key (game_pin, question_index, player_id)
);
```

**Realtime subscriptions** replace Firebase's `.on('value')`:

```typescript
// Subscribe to game state changes
supabase
  .channel(`game:${pin}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'games',
    filter: `pin=eq.${pin}`,
  }, (payload) => {
    handleStateChange(payload.new.state);
  })
  .subscribe();

// Subscribe to players joining
supabase
  .channel(`players:${pin}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'players',
    filter: `game_pin=eq.${pin}`,
  }, (payload) => {
    addPlayer(payload.new);
  })
  .subscribe();
```

### 2. State Machine: DB Trigger → Server Function

The original `tick.ts` is a Firebase DB trigger that fires when the `tick` field is written. This pattern maps to either:

**Option A: Supabase Edge Function** (called by the client, same as the original HTTP POST pattern)

```typescript
// supabase/functions/tick/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { pin } = await req.json();
  const supabase = createClient(/* ... */);

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('pin', pin)
    .single();

  // Same state machine logic as original tick.ts
  switch (game.state) {
    case GameState.GameStaging:
      await transitionTo(supabase, pin, GameState.RoundIntro);
      break;
    case GameState.RoundIntro:
      await prepareQuestion(supabase, pin, game);
      await transitionTo(supabase, pin, GameState.ShowQuestion);
      break;
    // ... etc
  }
});
```

**Option B: Postgres function + trigger** (if you want DB-level automation)

```sql
create or replace function on_game_tick()
returns trigger as $$
begin
  -- state machine logic in PL/pgSQL or call an Edge Function
  return new;
end;
$$ language plpgsql;

create trigger game_tick_trigger
after update of state on games
for each row execute function on_game_tick();
```

**Recommendation:** Option A (Edge Function). The scoring logic is complex enough that TypeScript is better than PL/pgSQL. Keep the DB for storage and subscriptions, keep the logic in application code.

### 3. Frontend: Angular → React

#### State machine routing

The original uses `GameService` to listen to state changes and call `router.navigate()`. In React, this becomes a single game page that renders different components based on state:

```typescript
// src/app/game/[pin]/page.tsx
'use client';

import { useGameState } from '@/hooks/useGameState';
import { GameState } from '@/lib/types';

export default function GamePage({ params }: { params: { pin: string } }) {
  const { state, game } = useGameState(params.pin);

  switch (state) {
    case GameState.GameStaging:
      return <GameStaging pin={params.pin} />;
    case GameState.RoundIntro:
      return <RoundIntro roundIndex={game.round_index} />;
    case GameState.ShowQuestion:
      return <ShowQuestion pin={params.pin} />;
    case GameState.ShowAnswers:
      return <ShowAnswers pin={params.pin} />;
    case GameState.RevealTheTruth:
      return <RevealTheTruth pin={params.pin} />;
    case GameState.ScoreBoard:
      return <ScoreBoard pin={params.pin} />;
    case GameState.ScoreBoardFinal:
      return <ScoreBoardFinal pin={params.pin} />;
  }
}
```

No more route-per-state. One URL (`/game/{pin}`), the component switches internally. This is simpler and avoids the URL-state-sync bugs the original has.

#### Timer hook (replaces duplicated timer logic in 3 components)

```typescript
// src/hooks/useTimer.ts
export function useTimer(durationMs: number, startTimestamp: number) {
  const [elapsed, setElapsed] = useState(Date.now() - startTimestamp);
  const remaining = Math.max(0, durationMs - elapsed);
  const panic = remaining < 5000 && remaining > 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimestamp);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTimestamp]);

  return { elapsed, remaining, progress: elapsed / durationMs, panic };
}
```

#### Session management

Replace `SessionService` + `StorageService` with Zustand:

```typescript
// src/stores/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore {
  role: 'player' | 'presenter' | null;
  nickname: string | null;
  playerId: string | null;
  setPlayer: (nickname: string, playerId: string) => void;
  setPresenter: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      role: null,
      nickname: null,
      playerId: null,
      setPlayer: (nickname, playerId) =>
        set({ role: 'player', nickname, playerId }),
      setPresenter: () =>
        set({ role: 'presenter', nickname: null, playerId: null }),
      reset: () =>
        set({ role: null, nickname: null, playerId: null }),
    }),
    { name: 'bs-session' }
  )
);
```

### 4. Scoring Logic: Extract and Unit Test

The original scoring logic is buried inside `tick.ts` with no tests. Extract it into a pure function:

```typescript
// src/lib/scoring.ts
const POINTS = {
  truth:    [1000, 1500, 2000],
  bullshit: [500,  750,  1000],
  houseLie: [-500, -750, -1000],
} as const;

export interface ScoringInput {
  roundIndex: number;
  answers: Array<{ playerId: string; text: string; isHouseLie: boolean; isRealAnswer: boolean }>;
  selections: Array<{ playerId: string; selectedText: string }>;
}

export interface ScoringResult {
  answerScores: Map<string, number>;      // playerId → points earned from others picking their lie
  selectionScores: Map<string, number>;   // playerId → points earned/lost from their vote
}

export function calculateScores(input: ScoringInput): ScoringResult {
  const { roundIndex, answers, selections } = input;
  const answerScores = new Map<string, number>();
  const selectionScores = new Map<string, number>();

  for (const selection of selections) {
    const matchingAnswers = answers.filter(a => a.text === selection.selectedText);

    if (matchingAnswers.length === 1 && matchingAnswers[0].isRealAnswer) {
      selectionScores.set(selection.playerId, POINTS.truth[roundIndex]);
    } else if (matchingAnswers.length === 1 && matchingAnswers[0].isHouseLie) {
      selectionScores.set(selection.playerId, POINTS.houseLie[roundIndex]);
    } else {
      selectionScores.set(selection.playerId, 0);
      for (const answer of matchingAnswers) {
        if (!answer.isRealAnswer && !answer.isHouseLie) {
          const current = answerScores.get(answer.playerId) ?? 0;
          answerScores.set(answer.playerId, current + POINTS.bullshit[roundIndex]);
        }
      }
    }
  }

  return { answerScores, selectionScores };
}
```

This is now testable independently — no database, no Firebase, pure inputs and outputs.

### 5. Mobile/Desktop Split: Delete It

The original has separate `MobileLandingComponent` and `DesktopLandingComponent` with a user-agent regex to route between them. This is a 2018 pattern. Use responsive CSS instead:

```tsx
// One landing page, responsive by default
export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-5xl font-bold">Bullshit</h1>
      <p className="text-lg text-gray-400">Because the truth is overrated</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-md">
        <MenuButton href="/join" icon={Gamepad} label="Join Game" />
        <MenuButton href="/create" icon={Plus} label="Create Game" />
        <MenuButton href="/present" icon={Monitor} label="Present Game" />
        <MenuButton href="/learn" icon={GraduationCap} label="How to Play" />
      </div>
    </div>
  );
}
```

### 6. RTL Support

The original checks `locale === 'he'` and toggles a `.rtl` CSS class. Modern approach:

```tsx
// Set dir attribute at the layout level
<html dir={locale === 'he' ? 'rtl' : 'ltr'}>
```

Combined with Tailwind's `rtl:` variant:

```tsx
<p className="text-left rtl:text-right">{questionText}</p>
```

No manual `.rtl` class needed on every element.

### 7. Symlink Hack: Delete It

The original uses `symlink.sh` to share `game-model.ts` between frontend and backend. In a monorepo this is unnecessary:

- **If using Next.js API routes:** frontend and backend are in the same project. Import `types.ts` directly.
- **If splitting frontend/backend:** use a shared package in a monorepo (pnpm workspaces or Turborepo).

### 8. PIN Generation

The original generates PINs from a global counter with base-26 encoding. This is fragile (counter is a single point of failure) and predictable. Replace with random 4-letter codes:

```typescript
function generatePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O (avoid confusion)
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}
```

Check for collisions against active games before accepting.

---

## Migration Order

Suggested order to rebuild incrementally:

| Phase | What | Why first |
|-------|------|-----------|
| **1** | Set up project skeleton (Next.js + Tailwind + Supabase) | Foundation |
| **2** | Define Postgres schema + seed question bank | Everything depends on data |
| **3** | Build landing, create-game, join-game pages | Playable lobby |
| **4** | Implement the state machine (tick Edge Function) | Core game engine |
| **5** | Build ShowQuestion + ShowAnswers pages | Players can play a round |
| **6** | Build RevealTheTruth + ScoreBoard | Players can see results |
| **7** | Add scoring logic (extracted, with tests) | Correctness before polish |
| **8** | Add sound, timer, presenter mode | Polish |
| **9** | Add replay (fork) | Nice to have |
| **10** | Hebrew translations + RTL | Locale support |

---

## Things to Fix Along the Way

These are issues in the original codebase worth addressing during the rewrite:

### No tests
The original has zero tests. The rewrite should have:
- Unit tests for `scoring.ts` (pure function, easy to test)
- Unit tests for PIN generation and collision handling
- Integration tests for the state machine (tick function with a test DB)

### No input validation on the backend
The original Cloud Functions trust all inputs. `answer.ts` accepts any string, `join.ts` doesn't validate nickname content. Add:
- PIN format validation (4 uppercase letters)
- Nickname sanitization (trim, length check, profanity filter if needed)
- Answer text sanitization (trim, max length, strip HTML)
- Rate limiting on all endpoints

### Race conditions in scoring
The original `calcAnswersScore` reads and mutates `game.answers` and `game.answerSelections` in-place without transactions. Two concurrent writes to `tick` could corrupt scores. Fix by:
- Using Postgres transactions for score calculation
- Using `SELECT ... FOR UPDATE` to lock the game row during state transitions

### Answer deduplication gap
If two players submit the exact same fake answer, both entries exist in `answers`. The `getAnswers` API deduplicates for display, but scoring credits both authors when someone picks that text. This is arguably a feature, but should be an explicit design choice, not an accident.

### No game expiry
Games are never cleaned up. Add a `created_at` column and a scheduled job to delete games older than 24 hours.

### Exposed Firebase config
The original commits Firebase API keys and Sentry DSNs to the repo. Use environment variables.

### Max 8 players is hardcoded
The limit is buried in `join.ts` line 8. Make it a constant, or better, a per-game setting.

### The `tick` field is world-writable
Any client can write any `GameState` value to `tick`, potentially skipping states or corrupting the game. The rewrite should authenticate tick requests and validate that the requested transition is legal from the current state.

### Presenter has too much power
The presenter controls state transitions (timers tick from presenter). If the presenter closes their browser, the game stalls. The rewrite should run timers server-side (e.g., Supabase `pg_cron` or a scheduled Edge Function).
