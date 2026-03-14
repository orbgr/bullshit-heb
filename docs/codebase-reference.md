# Bullshit.wtf — Codebase Reference

Source: [github.com/radotzki/bullshit-wtf](https://github.com/radotzki/bullshit-wtf)

**Languages:** TypeScript (70%), HTML (20.4%), SCSS (9.4%), Shell (0.2%)

---

## Top-Level Structure

```
bullshit-wtf/
├── game/                    # Angular frontend (the web app players interact with)
├── functions/               # Firebase Cloud Functions (server-side logic)
├── graphics/                # Visual assets source files
├── game-model.ts            # Shared TypeScript interfaces & enums (symlinked into both game/ and functions/)
├── database-rules.json      # Firebase Realtime Database security rules
├── firebase.json            # Firebase hosting + database config
├── symlink.sh               # Creates symlinks so game-model.ts is shared between frontend and backend
├── .firebaserc              # Firebase project binding
└── package.json             # Root-level dependencies
```

---

## Shared Model: `game-model.ts`

This file is the contract between frontend and backend. It's symlinked into both `game/src/app/` and `functions/src/`.

### `GameState` (enum) — the state machine driving the entire game

| Value | Name | Description |
|-------|------|-------------|
| 0 | `GameStaging` | Lobby — players joining, waiting to start |
| 1 | `RoundIntro` | Shows point values for the upcoming round (5s) |
| 2 | `ShowQuestion` | Players see a trivia question and type fake answers (25s) |
| 3 | `ShowAnswers` | All answers shown, players vote for the truth (20s) |
| 4 | `RevealTheTruth` | Answers revealed one-by-one with who wrote/picked each |
| 5 | `ScoreBoard` | Cumulative scores displayed (5s) |
| 6 | `ScoreBoardFinal` | Final scores after last question, with replay option |

### `GameScheme` — the full game document stored in Firebase

| Field | Type | Purpose |
|-------|------|---------|
| `state` | `{id, timestamp}` | Current game state + when it entered that state |
| `timestamp` | `number` | Game creation time |
| `roundIndex` | `number` | Current round (0, 1, or 2) — controls point values |
| `questionIndex` | `number` | Current question number (0-based) |
| `locale` | `string` | `'en'` or `'he'` |
| `currentQ` | `string` | The current question text |
| `answers` | `Answers` | Map of player ID → their submitted fake answer |
| `answerSelections` | `AnswerSelections` | Map of player ID → which answer they voted for |
| `revealAnswers` | `RevealAnswer[]` | Computed reveal data (who wrote what, who picked what) |
| `totalQ` | `number` | Total questions in the game (5, 7, or 9) |
| `players` | `GamePlayers` | Map of player ID → `{nickname, score, uid}` |
| `qids` | `{[index]: string}` | Map of question index → question ID in the database |
| `tick` | `number` | Trigger field — writing to it fires the `tick` Cloud Function |
| `presenter` | `boolean` | Whether a presenter screen is connected |
| `fork` | `string` | PIN of a forked (replayed) game |

### Other interfaces

- **`GamePlayer`** — `{nickname, score, uid}`
- **`Answer`** — `{text, houseLie, realAnswer, score?}` — a submitted answer (could be player-written, a house lie, or the real answer)
- **`AnswerSelection`** — `{text, score?}` — which answer a player voted for
- **`RevealAnswer`** — `{text, selectors[], creators[], realAnswer, houseLie, points}` — computed at reveal time
- **`Question`** — `{id, realAnswer, fakeAnswers[], questionText, citation}` — a question from the DB

---

## Frontend: `game/`

Angular 5 app using Bulma CSS framework.

### `game/src/app/` directory map

```
app/
├── app.component.ts              # Root component — just a <router-outlet>
├── app.module.ts                 # Angular module — declares all components, pipes, directives
├── game-model.ts                 # (symlink → root game-model.ts)
│
├── app-routing/
│   └── app-routing.module.ts     # All route definitions
│
├── services/
│   ├── api.service.ts            # All Firebase + HTTP calls (the data layer)
│   ├── game.service.ts           # State machine router — listens to state changes, navigates + sets timers
│   ├── session.service.ts        # Player/presenter identity management (localStorage/sessionStorage)
│   └── storage.service.ts        # localStorage wrapper with fallback to sessionStorage
│
├── components/
│   ├── game-header/              # Top bar: home button, PIN, question counter, presenter banner
│   └── game-footer/              # Bottom bar: player nickname + live score
│
├── pages/
│   ├── landing/                  # Home screen — detects mobile vs desktop, redirects
│   │   ├── landing.component.ts  # Redirects to /m (mobile) or /d (desktop) based on user agent
│   │   ├── mobile-landing/       # Mobile home: vertical menu buttons (Join/Create/Present/Learn)
│   │   └── desktop-landing/      # Desktop home: 2x2 grid menu buttons
│   ├── create-game/              # Form: pick language (en/he) + length (5/7/9) → calls newGame API
│   ├── join-game/                # Two-step form: enter PIN → enter nickname → calls join API
│   ├── present-game/             # Enter PIN to connect as presenter screen
│   ├── learn/                    # Static "How do I play?" page with rules explanation
│   ├── game-staging/             # Lobby: shows joined players, START button for creator/presenter
│   ├── round-intro/              # Displays point values for the current round
│   ├── show-question/            # Question display + answer input + countdown timer
│   ├── show-answers/             # All answers as buttons — players pick one
│   ├── reveal-the-truth/         # Animated reveal of each answer with creators + selectors
│   ├── score-board/              # Mid-game scoreboard (sorted by score)
│   └── score-board-final/        # Final scoreboard with REPLAY button
│
├── pipes/
│   ├── bs-question.pipe.ts       # Replaces `$blank$` in question text with `________`
│   └── bs-points.pipe.ts         # Formats points: positive numbers get a `+` prefix
│
├── directives/
│   └── autofocus.directive.ts    # Auto-focuses input fields on component init
│
└── sentry/
    └── sentry.module.ts          # Error tracking integration
```

### Key Services

#### `api.service.ts` — The data layer

All communication with Firebase. Two patterns:
- **HTTP POST** to Cloud Functions (via `this.http.post`): `createGame`, `join`, `answer`, `validateGameName`, `fork`
- **Direct Firebase Realtime Database** reads/writes/subscriptions: `gameState`, `getPlayers`, `chooseAnswer`, `tick`, `joinAsPresenter`

Key methods:

| Method | What it does |
|--------|-------------|
| `createGame(locale, count)` | POST to `newGame` function → returns PIN |
| `join(pin, nickname, uid)` | POST to `join` function → returns player ID |
| `answer(pin, answer)` | POST to `answer` function — submits player's fake answer |
| `chooseAnswer(pin, answer)` | Direct DB write to `answerSelections/{pid}` — player's vote |
| `getAnswers(pin)` | Reads all answers, deduplicates, removes the current player's own answer from the selection list |
| `tick(pin, gameState)` | Writes to `tick` field to trigger state transition (only if presenter, or if no presenter) |
| `gameState(pin)` | Observable subscription on `state.id` — drives the state machine |
| `playerScore(pin, pid)` | Observable on player's score — drives the footer |
| `getGameTimestamp(pin)` | Reads state timestamp + computes server time diff for timer sync |
| `fork(pin)` | POST to `fork` function — creates a new game with same players |
| `signInAnonymously(pin, nickname)` | Firebase anonymous auth for analytics tracking |

#### `game.service.ts` — The state machine router

Subscribes to `gameState` observable. On each state change:
1. Navigates to the corresponding route
2. Sets a timer to auto-advance to the next state after the duration

Durations:

| State | Duration |
|-------|----------|
| RoundIntro | 5,000ms |
| ShowQuestion | 25,000ms |
| ShowAnswers | 20,000ms |
| ScoreBoard | 5,000ms |

`RevealTheTruth` and `ScoreBoardFinal` have no auto-timer — they advance via explicit ticks.

Also serves as a route guard (`canActivate`) — redirects to home if the PIN is missing or not 4 characters.

#### `session.service.ts` — Identity management

Manages two roles:
- **Player** — stored in localStorage as `BS_PLAYER` (`{nickname, pid, uid}`)
- **Presenter** — stored in sessionStorage as `BS_PRESENTER` (boolean)

Also a route guard — blocks access to game routes if neither player nor presenter session exists.

#### `storage.service.ts` — localStorage wrapper

Tries localStorage first, falls back to sessionStorage if localStorage isn't available (e.g., private browsing on some browsers).

### Key Page Components

#### `create-game.component.ts`
- Defaults: English, 7 questions
- Calls `apiService.createGame()` → on success, redirects to `/join-game/{pin}` (creator also joins as a player)

#### `join-game.component.ts`
- Step 1: Enter PIN → validates via `validateGameName` API
- Step 2: Enter nickname (max 9 chars) → calls `signInAnonymously` + `join` API
- Stores player identity in session, navigates to `/game-staging/{pin}`

#### `present-game.component.ts`
- Enter PIN → sets `presenter = true` in session, calls `joinAsPresenter` on the game
- Then hides the form and lets the game state machine take over navigation

#### `game-staging.component.ts` (lobby)
- Subscribes to players list (live-updating as people join)
- Shows START button only if: no presenter connected, OR this is the presenter
- Plays `staging.mp3` music on the presenter
- START → calls `tick(pin, RoundIntro)` to begin the game

#### `show-question.component.ts`
- Displays question with `$blank$` → `________` via `bsQuestion` pipe
- Players get a text input (max 40 chars) + SEND button
- If player types the actual correct answer → shows error "You entered the correct answer! Try something else"
- Countdown progress bar (25s), turns red at 5s with warning sound
- Presenter just sees the question (no input), plays background music

#### `show-answers.component.ts`
- Fetches all answers (player lies + house lies + real answer), deduped and alphabetically sorted
- Players see buttons for each answer (their own answer is excluded from the list)
- Players can tap "WHAT WAS THE QUESTION AGAIN?" to review
- After selecting: "Let's wait for your friends"
- Countdown progress bar (20s)

#### `reveal-the-truth.component.ts`
- Builds a display sequence from `revealAnswers`
- Shows only answers that had at least one selector, plus the real answer (always shown)
- Cycles through answers at 7-second intervals:
  - First 3 seconds: shows just the answer text
  - Then reveals: who wrote it (above) + who picked it (below) + points
  - Labels: player lie → creator avatars, real answer → "THE TRUTH", house lie → "Home Grown Bullshit"
- Real answer is sorted to be shown last
- Sound effects per answer type (presenter only)

#### `score-board.component.ts` / `score-board-final.component.ts`
- Fetches players, sorts by score descending, shows avatar + nickname + score
- Final board adds a REPLAY button that calls `fork()` — creates a new game with same players, new questions, reset scores
- Forked game auto-redirects all connected clients via Firebase subscription

### Pipes

- **`bsQuestion`** — `$blank$` → `________` (regex: `/\$\s?blank\s?\$/gi`)
- **`bsPoints`** — formats scores: `0` stays `0`, `500` becomes `+500`, `-500` stays `-500`

---

## Backend: `functions/`

Firebase Cloud Functions (Node.js). All functions are defined in `functions/src/index.ts`.

### `functions/src/` directory map

```
functions/src/
├── index.ts                          # Function exports (HTTP endpoints + DB triggers)
├── firebase.ts                       # Firebase Admin SDK init + DB reference helpers
├── game-model.ts                     # (symlink → root game-model.ts)
└── controllers/
    ├── new-game.ts                   # Create a new game
    ├── join.ts                       # Add a player to a game
    ├── validate-game-name.ts         # Check if a PIN is valid and game isn't full
    ├── answer.ts                     # Submit a player's fake answer
    ├── tick.ts                       # THE BIG ONE — state machine transitions + scoring
    ├── on-answer-selection.ts        # Check if all players voted → trigger reveal
    ├── fork.ts                       # Create a replay game with same players
    ├── questions.ts                  # Fetch random questions from the DB
    └── analytics.ts                  # BigQuery logging (game open/close, joins, forks)
```

### HTTP Endpoints (Cloud Functions)

| Endpoint | Trigger | Controller | Purpose |
|----------|---------|------------|---------|
| `time` | HTTP POST | inline | Returns `{now: Date.now()}` for client-server clock sync |
| `newGame` | HTTP POST | `new-game.ts` | Creates game in DB with PIN, returns `{pin}` |
| `join` | HTTP POST | `join.ts` | Adds player to game, returns `{pid}` |
| `validateGameName` | HTTP POST | `validate-game-name.ts` | Checks PIN exists and game not full (max 8 players) |
| `answer` | HTTP POST | `answer.ts` | Saves player's fake answer; rejects if it matches the real answer |
| `fork` | HTTP POST | `fork.ts` | Creates new game with same players + settings, fresh questions |
| `onJoinGame` | HTTP POST | `analytics.ts` | Logs join event to BigQuery (uid, IP, user agent, pin, nickname) |

### Database Triggers

| Trigger | Path | Controller | Purpose |
|---------|------|------------|---------|
| `tick` | `games/{pin}/tick` | `tick.ts` | Main state machine — handles ALL state transitions |
| `onAnswerSelection` | `games/{pin}/answerSelections` | `on-answer-selection.ts` | Auto-advances to RevealTheTruth when all players voted |
| `gameState` | `games/{pin}/state` | `analytics.ts` | Logs game open/close events to BigQuery |
| `onFork` | `games/{pin}/fork` | `analytics.ts` | Logs fork events to BigQuery |

### Controller Details

#### `new-game.ts` — Game creation

1. Increments a global `gameCounter` (atomic transaction)
2. Generates a 4-letter PIN from the counter (base-26 encoding → letters, left-padded with `Q`)
3. Picks random questions from the DB for the chosen language and count
4. Creates the game document with initial state `GameStaging`

#### `join.ts` — Player joining

- Max 8 players per game (rejects with `GAME_IS_FULL`)
- Creates a player entry with `{nickname, uid, score: 0}`
- Returns the generated player ID

#### `answer.ts` — Answer submission

- Compares player's answer to the real answer (case-insensitive)
- If it matches → rejects with `CORRECT_ANSWER` code (player must try again)
- Otherwise saves `{text, houseLie: false, realAnswer: false}`
- If all players have answered → auto-advances to ShowAnswers by writing to `tick`

#### `tick.ts` — The state machine (most important file)

This is the brain of the game. Triggered by writes to `games/{pin}/tick`. Reads current state and transitions:

| From State | To State | What happens |
|------------|----------|-------------|
| GameStaging | RoundIntro | Sets state |
| RoundIntro | ShowQuestion | Populates `currentQ` with question text, clears answers |
| ShowQuestion | ShowAnswers | Adds **house lies** (fake answers from DB to fill the pool) + the **real answer** to the answers map |
| ShowAnswers | RevealTheTruth | Calculates scores, generates `revealAnswers` array |
| RevealTheTruth | ScoreBoard | Updates player cumulative scores |
| ScoreBoard | *(varies)* | Next question, next round intro, or final scoreboard |

**Scoring logic** (in `calcAnswersScore`):
- For each player's vote (`answerSelection`):
  - If they picked the **real answer** → `+pointsForCorrectAnswer[roundIndex]`
  - If they picked a **house lie** → `pointsForHouseLie[roundIndex]` (negative!)
  - If they picked a **player's lie** → 0 for the voter, `+pointsForBullshitting[roundIndex]` added to the lie's author
- Multiple players writing the same lie all get credit

**House lie filling** (in `populateFakeAnswers`):
- Counts unique player answers vs. total players
- Adds `(players - uniqueAnswers)` house lies from the question's `fakeAnswers` array
- This ensures there are always enough options to choose from

**Round transitions** (in `handleScoreBoardState`):
- Second round starts at question index `floor(totalQ/2)`
- Third round starts at second-to-last question
- Game over after the last question → ScoreBoardFinal

#### `fork.ts` — Replay

Creates a brand new game with:
- Same players (scores reset to 0)
- Same locale and question count
- New random questions
- Same presenter setting
- Writes the new PIN to `fork` field on the old game → all clients auto-redirect

#### `on-answer-selection.ts` — Vote completion check

On every write to `answerSelections`: checks if all players have voted. If yes → writes to `tick` to advance to RevealTheTruth.

#### `questions.ts` — Question fetching

- `randomQuestions(lang, count)` — fetches all questions for a language, shuffles, picks N
- `getQuestion(id)` — fetches a single question by ID

#### `analytics.ts` — BigQuery logging

Logs to a `analytics` BigQuery dataset:
- `users` table: join events (uid, IP, user agent, pin, nickname)
- `opened_games` table: when a game starts (players count, question count, locale, has presenter)
- `closed_games` table: when a game reaches final scoreboard
- `forks` table: replay events (origin PIN → forked PIN)

---

## Firebase Configuration

### `database-rules.json`

- All **reads** are public (any client can read game state, players, answers, etc.)
- Most **writes** are restricted to `bl-service-worker` (the Cloud Functions service account)
- Three exceptions with public write access:
  - `answerSelections` — players write their votes directly (no Cloud Function intermediary)
  - `tick` — clients can trigger state transitions
  - `presenter` — presenter screen sets this flag directly

### `firebase.json`

- Hosting serves from `game/dist` (Angular build output)
- All routes rewrite to `/index.html` (SPA)
- Database rules point to `database-rules.json`

### Firebase Realtime Database Collections

| Path | Purpose |
|------|---------|
| `games/{pin}` | Active game data (one document per game) |
| `questions/{id}` | Question bank (indexed by `lang`) |
| `gameCounter` | Auto-incrementing counter for PIN generation |
| `qHistory` | Archive of played questions + answers |

---

## Sound Effects

All played by the **presenter** only (via Howler.js):

| Sound file | When played |
|-----------|-------------|
| `staging.mp3` | Lobby (looped) |
| `during-game.mp3` | During ShowQuestion and ShowAnswers phases |
| `time-warning.mp3` | Last 5 seconds of a timed phase |
| `player-lie-0.mp3` / `player-lie-1.mp3` | Revealing a player's lie |
| `house-lie-0.mp3` / `house-lie-1.mp3` | Revealing a house lie |
| `the-truth.mp3` | Revealing the real answer |
| `final.mp3` | Final scoreboard (looped) |
