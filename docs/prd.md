# Chikicha — Local Multiplayer Card Shedding Game

## Problem Statement

Players want to play a real-time card-shedding game together on the same local network, where the software provides card manipulation tools (drops, passes, undo, hand arrangement) without enforcing game rules. Players self-regulate through conversation and undo, with the app tracking game state, turns, and declaring a loser when only one player has cards left.

## Solution

A browser-based multiplayer game accessible over LAN. Players enter a username, join the shared lobby room, ready up, and play. The app distributes 52 cards evenly among up to 4 players, provides drag-free card selection and dropping, pass indication via emote bubbles, undo for recently dropped cards, keyboard-based hand arrangement, and a game-over sequence that reveals the loser and transitions back to lobby.

## User Stories

1. As a player, I want to open a browser on my device and see a name entry screen titled "chikicha", so that I can join the game with a username.
2. As a player, I want to enter my username and click Join, so that I appear in the lobby.
3. As a player, I want to see the lobby with my name and up to 3 other player slots, so that I know who is in the room.
4. As a player, I want to see each player assigned a unique color (Red, Blue, Green, Yellow by join order), so that I can identify actions by color throughout the game.
5. As a player, I want to toggle a Ready/Unready button in the lobby, so that I signal I'm prepared for the game to start.
6. As a player, I want the game to begin a 5-second countdown when all 4 players are ready, so that we have a moment to settle before the game starts.
7. As a player, I want the countdown to abort if any player unreadies, so that the game doesn't start prematurely.
8. As a spectator (5th+ visitor), I want to see the lobby, ready states, and in-game action, so that I can watch the game.
9. As a spectator, I want the chance to become a player when the game resets to lobby (first 4 to ready), so that I can join future rounds.
10. As a player, I want 52 cards dealt randomly and evenly (13 each if 4 players) at game start, so that we begin on equal footing.
11. As a player, I want my hand displayed as a loose flat overlapping fan of face-up cards at the bottom of the screen, so that I can see and manage my cards.
12. As a player, I want to click individual cards to toggle them as selected (lifted + color-highlighted), so that I can choose which cards to drop.
13. As a player, I want selected cards to show a lifted position and a glowing border in my player color, so that I can clearly see my selection.
14. As a player, I want to press a Drop button to commit my selected cards to the central play area, so that I shed cards from my hand.
15. As a player, I want dropped cards to appear in a central area grouped chronologically by round with an outline in my player color, so that everyone can see who dropped what and in what order.
16. As a player, I want previously dropped cards to remain visible in the central area, so that players can reference them if a dispute arises.
17. As a player, I want to press a Pass button instead of dropping cards, so that I can skip contributing to that round.
18. As a player, I want a 🤚 emoji speech bubble to appear above my hand when I pass, fading after a few seconds, so that everyone knows I passed.
19. As a player, I want an Undo button to appear near my dropped cards immediately after I drop, so that I can take back a mistaken play.
20. As a player, I want the Undo button to disappear once another player drops, so that undo is only available for the most recent drop.
21. As a player, I want only the original dropper to be able to undo their own drop, so that other players can't interfere with my cards.
22. As a player, I want to select a card and use left/right arrow keys to shift its position within my hand (pushing others aside), so that I can organize my hand manually.
23. As a player, I want to see other players' hands as a row of card backs when they have 10 or fewer cards, so that I can gauge their card count.
24. As a player, I want other players' hands to collapse into a stack with a count badge when they have more than 10 cards, so that large hands don't overflow the screen.
25. As a player, I want to see myself at the bottom and opponents at top, left, and right (poker-table layout), so that I have a clear spatial sense of the game.
26. As a player, I want soft audible feedback (drop thud, pass chime, countdown tick, undo swoosh, game-over wah) generated via the browser, so that actions feel tactile without needing external sound files.
27. As a player, I want the game to end when only one player has cards remaining, so that a loser is determined.
28. As a player, I want the loser's remaining cards flipped face-up and a "Loser: [username]" overlay displayed, so that everyone sees who lost.
29. As a player, I want confetti for non-loser players on the game-over screen, so that there's a celebratory moment.
30. As a player, I want the game to automatically reset to the lobby after the game-over screen, so that we can play another round.
31. As a player, I want the game to continue if someone disconnects (their cards removed), so that a dropped connection doesn't ruin the session.

## Implementation Decisions

### Architecture

- **Two-package monorepo**: `chikicha-frontend/` (React + Vite + Tailwind CSS v4) and `chikicha-backend/` (Node.js + Express + Socket.IO).
- **Single room only** — all visitors join the same room. No room codes or multiple rooms.
- **In-memory state** on the backend — no database, no persistence across server restarts.
- The backend serves the frontend's production build in production for single-origin simplicity.

### Player Model

- Max 4 active players. Visitors 5+ are spectators.
- Players are assigned colors by join order: Red `#EF4444`, Blue `#3B82F6`, Green `#22C55E`, Yellow `#EAB308`.
- When the game resets to lobby, all 4 slots open — first 4 who ready become players for the next round. No priority for previous players.

### Game State Machine

```
LOBBY → (all 4 ready) → COUNTDOWN → (5s elapsed) → PLAYING → (1 player has cards) → GAME_OVER → (5s) → LOBBY
         ↑ abort if unready ↓
```

### Card Mechanics

- **No game rules enforcement** — any cards can be dropped at any time. Players self-police.
- **Free-for-all turns** — no turn enforcement. Anyone can drop or pass at any time.
- **Selection**: click-to-toggle on each card. Selected cards lift 10px upward and display a glowing border in the player's color.
- **Drop**: selected cards animate (200ms slide) from hand to the central area. Cards are outlined in the dropper's color.
- **Central area**: cards grouped chronologically by round (not by player). All drops remain visible for the game's duration.
- **Pass**: 🤚 emoji speech bubble appears above the passing player's hand area, fades after 3 seconds.
- **Undo**: visible only for the most recent dropper, only until another player drops. Clicking undo returns cards to that player's hand and removes them from the central area.
- **Hand arrangement**: select a card, press left/right arrow keys — the card shifts one position, pushing adjacent cards aside.

### Card Display

- Card images from `playing-cards/` — 242×340 PNGs, displayed at 60% scale (~145×204 px).
- Light card back (`back_light.png`) for face-down cards on opponents' hands.
- Own hand: loose flat overlapping fan, face-up.
- Other players' hands: row of card backs when ≤10 cards; collapsed stack with count badge when >10 cards.
- The central area uses the same 60% scale as hands.

### UI Layout

- Poker-table style with self at bottom, opponents at top/left/right.
- Lobby screen: title "chikicha" centered at top, 4 player slots with name + color dot + ready indicator, spectator list below.
- Username entry: simple centered form with title, text input, and Join button.
- Buttons: Drop, Pass, Undo in the player's hand area.
- Arrow keys: keyboard-only for card arrangement (no on-screen buttons).

### Sound Effects (Web Audio API)

All generated programmatically — no external audio files.

| Event | Sound |
|-------|-------|
| Card drop | Soft thud (200Hz sine, 100ms, slight envelope) |
| Pass | Gentle ding (800Hz sine, 200ms) |
| Countdown tick | Short click (1kHz, 50ms) |
| Countdown final | Higher pitched (1.5kHz, 100ms) |
| Undo | Rising swoosh (white noise burst, 150ms) |
| Game over | Descending two-note slide (~400Hz → ~200Hz) |

### Socket.IO Event Contract

**Client → Server:**

```typescript
interface ClientToServerEvents {
  join: (data: { username: string }) => void;
  ready: (data: { ready: boolean }) => void;
  drop: (data: { cardIndices: number[] }) => void;
  pass: () => void;
  undo: () => void;
  arrange: (data: { fromIndex: number; toIndex: number }) => void;
}
```

**Server → Client:**

```typescript
interface ServerToClientEvents {
  lobby_update: (data: {
    players: { id: string; username: string; color: string; ready: boolean }[];
    spectators: { id: string; username: string }[];
  }) => void;
  countdown: (data: { seconds: number }) => void;
  countdown_aborted: () => void;
  game_start: (data: {
    hand: { suit: string; rank: string }[];
    players: { id: string; username: string; color: string; position: string; cardCount: number }[];
  }) => void;
  card_dropped: (data: {
    playerId: string;
    cards: { suit: string; rank: string }[];
  }) => void;
  card_passed: (data: { playerId: string }) => void;
  card_undone: (data: { playerId: string }) => void;
  card_arranged: (data: { playerId: string; fromIndex: number; toIndex: number }) => void;
  player_left: (data: { playerId: string }) => void;
  game_over: (data: { loserId: string; loserUsername: string; cards: { suit: string; rank: string }[] }) => void;
  spectate: (data: { players: [...]; hands: [...] }) => void;
}
```

### Game Over & Reset

- Triggered server-side when `player.cards.length > 0` is true for exactly one player.
- Server emits `game_over` with the loser's ID, username, and remaining cards (flipped face-up).
- Client shows a full-screen overlay with "Loser: [username]", confetti for non-loser positions, and the loser's cards displayed face-up.
- After 5 seconds, the server transitions state back to LOBBY, clears all hands, and emits `lobby_update`.
- Spectators can then ready up in the newly open slots.

### Disconnect Handling

- On disconnect, the player's cards are removed from the game entirely (not redistributed).
- Other players receive `player_left` with the departed player's ID.
- If this reduces active players to 1, the game ends with that player as loser.
- A disconnected player who reconnects joins as a spectator.

## Testing Decisions

Since this is a greenfield project with **no existing test infrastructure**, we define our testing approach from scratch.

### What makes a good test
- Tests assert **externally observable behavior**, not implementation details.
- Backend tests send Socket.IO events from a test client and assert the events emitted in response and the resulting game state.
- Frontend tests render components with a mock Socket.IO client and assert the rendered UI and emitted events match expectations.
- No tests should depend on animation timing, real network latency, or DOM layout pixels.

### Modules tested

| Layer | What | Tool |
|-------|------|------|
| Backend game state | The game reducer (pure functions for lobby/ready/deal/drop/pass/undo/game-over transitions) | Vitest unit tests |
| Backend Socket.IO | Full server: start Express+Socket.IO in test, connect a client, exercise the event flow end-to-end | Vitest + `socket.io-client` |
| Frontend components | Each screen (UsernameInput, Lobby, Game) and key subcomponents (Hand, CentralArea, PlayerSlot) | Vitest + React Testing Library |
| Frontend integration | Hook tests for `useSocket` and game state management | Vitest + React Testing Library |

### Testing seams
- **Backend game reducer** — highest seam. Test game state transitions without Socket.IO. A pure function that takes `(state, action) → state` can be tested exhaustively.
- **Socket.IO server** — next seam. Test that event handlers call the reducer correctly and emit the right responses.
- **React components** — mock the Socket.IO client at the hook/context level. Components receive game state as props or context and render accordingly.
- **End-to-end** (stretch): Start backend, serve frontend via Vite preview, run Playwright tests against the full stack.

### Prior art
None — the project has no existing tests. This proposal establishes the testing conventions.

## Out of Scope

- Persistent storage (scores, history, player profiles)
- Multiple rooms / room codes
- Internet hosting — local LAN only
- Mobile-exclusive layout (works on desktop browsers; mobile is accidental)
- Accessibility (screen readers, ARIA)
- Spectator chat or interaction
- Player-elected card back themes
- Drag-and-drop card interactions
- Timer enforcement for turns
- AI/bot players
- Rule validation or card legality checking
- Localization / i18n

## Further Notes

- The card asset repository (`playing-cards/`) is a cloned git sub-repo. The frontend build should copy or reference these assets without committing them directly into the new project's git history. Consider adding `playing-cards/` to `.gitignore` at the root and documenting the clone step in a setup guide.
- The project root (`chikicha/`) is not currently a git repository. One should be initialized and both `chikicha-frontend/` and `chikicha-backend/` committed as part of it.
