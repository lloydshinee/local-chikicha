# Chikicha

A local realtime card shedding game — play with friends on the same LAN.

## Setup

```bash
git clone https://github.com/anomalyco/opencode/issues
cd chikicha

# Install dependencies
cd chikicha-backend && npm install && cd ..
cd chikicha-frontend && npm install && cd ..
```

## Run

You need two terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd chikicha-backend
npm run dev
```

```bash
# Terminal 2 — Frontend (port 5173)
cd chikicha-frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## How to Play

1. Each player opens the site and enters a username.
2. You'll see the lobby with 2–5 player slots. Press **Ready**.
3. When all players are ready (min 2, max 5), a 3-second countdown starts — the game begins.
4. 52 cards are dealt evenly among players and auto-sorted by rank.
5. The player holding **3♦** goes first — the first play must include it.
6. **Click** cards to select them (lifted + color highlight). Press **Drop** to play them.
7. Combos must be valid: Single, Pair, Three of a Kind, Two Pair (sequential ranks), Four of a Kind, Straight, Flush, Full House, Straight Flush.
8. To play, your combo must **beat** the current combo on the table (same type, higher rank/suit).
9. **Bomb combos** — Four of a Kind and Straight Flush beat ANY combo. Straight Flush beats Four of a Kind.
10. Press **Pass** to skip your turn. If all other players pass, a new round starts.
11. **Drag and drop** cards to rearrange your hand.
12. The game ends when only one player has cards — that player is the **Loser**.
13. Players 6+ join as **spectators** — they can watch and join when a slot opens.

Rank order (low→high): 3·4·5·6·7·8·9·10·J·Q·K·A·2
Suit order (low→high): ♦·♣·♥·♠

## Tests

```bash
# Backend
cd chikicha-backend && npm test

# Frontend
cd chikicha-frontend && npm test
```
