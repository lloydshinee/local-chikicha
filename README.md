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
2. You'll see the lobby with up to 4 player slots. Press **Ready**.
3. When all 4 players are ready, a 3-second countdown starts — the game begins.
4. 52 cards are dealt evenly and randomly (13 each for 4 players).
5. **Click** cards to select them (lifted + color highlight). Press **Drop** to shed them into the center.
6. Press **Pass** to skip — a 🤚 bubble appears above your hand.
7. Press **Undo** to take back your most recent drop (only if nobody else has dropped since).
8. Use **left/right arrow keys** to rearrange a selected card in your hand.
9. The game ends when only one player has cards — that player is the **Loser**. The lobby resets for the next round.
10. Players 5+ join as **spectators** — they see everything and can ready up for the next round.

There are **no enforced rules** — players self-police via conversation and the undo mechanic.

## Tests

```bash
# Backend
cd chikicha-backend && npm test

# Frontend
cd chikicha-frontend && npm test
```
