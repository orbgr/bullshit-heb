# Bullshit.wtf — Game Overview

**Tagline:** "Because the truth is overrated"

**Source:** [github.com/radotzki/bullshit-wtf](https://github.com/radotzki/bullshit-wtf)

**Tech stack:** Angular frontend, Firebase backend (Realtime Database + Cloud Functions), TypeScript, Bulma CSS, Howler.js for sound effects.

**Languages supported:** English, Hebrew (RTL support built in).

---

## What Is It?

Bullshit.wtf is a **multiplayer party trivia game** played on smartphones, inspired by the board game *Balderdash*. Players are shown strange-but-true facts with a key detail blanked out. Everyone makes up a fake answer (a "bullshit"), and then all answers — including the real one — are shown. Players must pick which answer they think is the truth.

It's a social/party game designed to be played in the same room. One person creates the game, everyone else joins via a 4-letter PIN on their phone, and optionally a separate screen acts as a "presenter" (like a TV or laptop).

---

## Game Setup

### Roles

| Role | What they do |
|------|-------------|
| **Creator** | Sets up the game: picks language (English/Hebrew) and length (5, 7, or 9 questions). Gets a 4-letter game PIN. |
| **Players** | Join via the PIN, enter a nickname (max 9 chars). Play on their smartphones. |
| **Presenter** | A separate screen (TV/laptop) that mirrors the game for everyone to see. Enters the game PIN. Plays sound effects. Optional but recommended. |

### Landing Page (Home Screen)

**Mobile view** — four vertically stacked menu buttons:
- **Join Game** — "Join a game by entering its PIN"
- **Create Game** — "Set up a new game for you and your friends"
- **Present Game** — "Click here from the device you wish to use as a presenter"
- **How Do I Play?** — "Click here to learn the rules"

**Desktop view** — same four options in a 2x2 grid layout with icons (gamepad, plus-square, share, graduation cap).

### Create Game Screen

A form with:
- **Language** radio buttons: English / Hebrew
- **Length** radio buttons: 5 / 7 / 9 questions
- **CREATE** button

After creation, a 4-letter PIN is generated (e.g., `QRST`).

### Join Game Screen

Two-step form:
1. Enter the **Game PIN** → click NEXT
2. Enter a **Nickname** (max 9 characters) → click JOIN

### Game Staging (Lobby)

- Shows all joined players with **avatar icons** (`avatar0.png`, `avatar1.png`, etc.) and nicknames
- Header displays the PIN and (on presenter) shows: "Join at **bullshit.wtf** with Game PIN: **XXXX**"
- The creator sees a **START** button in the header
- If no players yet: "Waiting for players.."

---

## Game Flow

The game progresses through a state machine with 7 states:

```
GameStaging → RoundIntro → ShowQuestion → ShowAnswers → RevealTheTruth → ScoreBoard → [loop or ScoreBoardFinal]
```

### State 1: Round Intro (5 seconds)

Displays the **point values** for the current round:

| Round | Points for finding the truth | Points for each player you bullshit |
|-------|------------------------------|--------------------------------------|
| Round 1 | 1,000 | 500 |
| Round 2 | 1,500 | 750 |
| Round 3 | 2,000 | 1,000 |

The game is divided into 3 rounds with escalating point values. Round boundaries depend on the total question count (round 2 starts at the halfway mark, round 3 starts at the second-to-last question).

### State 2: Show Question (25 seconds)

- A **trivia question** is displayed with a blank (`________`) where the key fact is missing
  - Example: "The world's oldest ________ was found in Egypt" → the blank is the answer
- **Players** see the question + a text input field (max 40 chars) to type their fake answer + a SEND button
- **Presenter** sees only the question (no input)
- A **progress bar** counts down the 25 seconds (turns red in the last 5 seconds with a warning sound)
- If a player accidentally types the **real answer**, they get an error: "You entered the correct answer! Try something else"
- If **all players** submit before time runs out, the game advances immediately
- After submitting: "Your answer has been submitted"

### State 3: Show Answers (20 seconds)

All possible answers are displayed as buttons, shuffled together:
- Each player's fake answer(s)
- **"House lies"** — pre-written fake answers from the question bank, added to fill the list so total answers = number of players + house lies + real answer. House lies are added when players submit duplicate answers.
- The **real answer**

**Players** tap the answer they think is the truth. **Presenter** sees all answers displayed (no interaction).

A "WHAT WAS THE QUESTION AGAIN?" button lets players review the question.

If all players select before time runs out, the game advances immediately. After selecting: "Let's wait for your friends"

### State 4: Reveal the Truth (variable duration)

Answers are revealed **one by one** with a 7-second interval per answer (3 seconds to show the answer, then reveal who wrote/selected it):

For each answer, the screen shows:
- The **answer text** in a green button
- **Below:** avatars + nicknames of players who **selected** this answer (fell for it)
- **Above:** who **created** the answer:
  - If a player lie → avatar(s) + nickname(s) of the author(s), plus points earned (e.g., "+500")
  - If the real answer → label: **"THE TRUTH"**, plus points for selectors
  - If a house lie → label: **"Home Grown Bullshit"**

**Sound effects** (presenter only):
- Player lie revealed → `player-lie-X.mp3`
- House lie revealed → `house-lie-X.mp3`
- Truth revealed → `the-truth.mp3`

The real answer is always shown **last** (sorted to the end).

### State 5: Score Board (5 seconds)

Shows all players ranked by score:
- Avatar icon + nickname + cumulative score
- Auto-advances after 5 seconds

### State 6: Loop or Final

After the scoreboard:
- If more questions remain in the current round → go to **ShowQuestion** (next question)
- If at a round boundary (halfway point or second-to-last question) → go to **RoundIntro** (show new point values)
- If all questions are done → go to **ScoreBoardFinal**

### State 7: Score Board Final

Same as the regular scoreboard but:
- No auto-advance
- A **REPLAY** button appears in the header to start a new game

---

## Scoring System

### How to earn points

| Action | Points (Round 1 / 2 / 3) |
|--------|--------------------------|
| **Selecting the real answer** (finding the truth) | +1,000 / +1,500 / +2,000 |
| **Each player who selects YOUR fake answer** (bullshitting someone) | +500 / +750 / +1,000 per fooled player |
| **Selecting a house lie** (falling for a system-generated fake) | -500 / -750 / -1,000 |
| **Selecting another player's lie** | 0 points for selector, points go to the lie's author |

### Key scoring details

- You earn points both for **identifying the truth** and for **fooling others** — both strategies matter
- Falling for a **house lie** is penalized (negative points) — it's worse than falling for a player's lie
- If multiple players write the same fake answer, they all get credit when someone selects it
- You don't lose points for having your lie go unselected

---

## UI Components

### Game Header
- **Home button** (house icon) — triggers a confirmation modal: "Don't leave us :( Do you want to leave this awesome game?" with KEEP PLAYING / BACK HOME buttons
- **PIN display** — shows the game PIN in uppercase
- **Presenter registration banner** — "Join at bullshit.wtf with Game PIN: XXXX"
- Optional **action button** (START, REPLAY, etc.)

### Game Footer (players only)
- Player's **nickname** (uppercase)
- Player's current **score** (live-updating)

### Progress Bar
- Green during normal time
- Turns **red** in the last 5 seconds with a time-warning sound

### Visual Style
- Dark arcade/retro aesthetic with the Bulma CSS framework
- Diamond separator (`♦`) between title and subtitle
- Full-screen layout, centered content
- Avatars are pre-made PNG images assigned by join order

---

## Question Format

Each question in the database has:
- `questionText` — the trivia text with `$blank$` as placeholder for the missing answer
- `realAnswer` — the actual correct answer
- `fakeAnswers` — array of pre-written decoy answers ("house lies")
- `citation` — source for the fact

The `$blank$` placeholder is rendered as `________` in the UI.

---

## Game PIN System

- PINs are 4-character alphabetic codes (e.g., `QRST`, `QUAB`)
- Generated from a global counter using base-26 encoding with letter substitution
- Left-padded with `Q` if shorter than 4 characters
