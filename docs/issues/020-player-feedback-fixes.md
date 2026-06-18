# 20: Player Feedback Fixes — Handbook, Queue, Turn UX, Spectator Bug, Hide Cards, Ace Rules

## Problem Statement

After real play-testing, players reported six issues that degrade the game experience:

1. **Spectator bug**: When a spectator joins a game in progress, all active players are forcefully kicked back to the lobby screen, leaving only the spectator watching an empty game.
2. **Queue positioning is wrong**: Opponent positions on screen don't follow counter-clockwise turn order, making the turn flow visually confusing and unintuitive.
3. **Turn indicators are too subtle**: The small `▶ Your turn` text and yellow ring around the player label aren't obvious enough — players routinely miss when it's their turn.
4. **No rules reference**: Players have no in-game way to look up card hierarchy, valid combos, or how to play — they have to leave the game to check the README.
5. **No "hide my cards" feature**: When playing on a PC at a shared table, other players can see your screen. Players need a way to hide their hand.
6. **Ace/straight rules are wrong**: The straight detection allows invalid wraps (J-Q-K-A-2, Q-K-A-2-3, 2-3-4-5-6), the wheel straight (A-2-3-4-5) incorrectly uses 2 as its primary rank making it appear to beat all other straights, and Two Pair A-A-2-2 is incorrectly accepted.

## Solution

Six fixes addressing each piece of player feedback:

1. Fix the spectator join flow so `SPECTATE` and `lobby_update` events only go to the joining spectator, not all connected clients.
2. Remap opponent screen positions to follow counter-clockwise turn order and add numbered seat badges for visual clarity.
3. Add three new turn indicators: a pulsing screen-edge glow, a lifted/glowing card hand animation, and a large animated banner with a distinct chime sound on turn change.
4. Add a handbook/rules book modal accessible from both Lobby and Game screens with four tabs: Card Hierarchy, Combo Types (with visual diagrams), How to Play, and Tips & Strategy.
5. Add a "hide my cards" toggle (eye button + `H` key) that renders the player's hand as face-down card backs, disabling selection and Drop/Pass while hidden.
6. Fix the straight detection engine to only allow valid Pusoy Dos straights (8 non-wrapping plus wheel), fix the wheel's primary rank, and reject Two Pair A-A-2-2.

## User Stories

### Spectator Bug
1. As an active player in a game, I want spectators to join without disrupting my game, so that late-arriving friends can watch without ending the current round.

### Queue Positioning
2. As a player, I want opponents positioned counter-clockwise around the screen matching the actual turn order, so that I can intuitively predict whose turn is next.
3. As a player, I want visible seat numbers or turn-order badges on each opponent, so that the direction of play is obvious at a glance.

### Turn Indicators
4. As a player, I want an unmistakable visual signal when it's my turn, so that I never accidentally hold up the game.
5. As a player, I want the entire screen edge to glow in my player color when it's my turn, so that the turn change is visible even when I'm not looking directly at my hand.
6. As a player, I want my hand of cards to lift and glow when it's my turn, so that my cards feel "active" and ready to play.
7. As a player, I want a large animated banner and a distinct chime sound to announce my turn, so that I'm alerted both visually and audibly.

### Handbook / Rules Book
8. As a player, I want to see a complete card hierarchy (ranks and suits in order) inside the game, so that I don't have to memorize or look elsewhere for the ordering.
9. As a player, I want to see all 9 valid combo types with visual card examples, so that I know what combinations I can play.
10. As a player, I want a step-by-step how-to-play guide inside the game, so that new players can learn without leaving the table.
11. As a player, I want strategy tips (e.g., save bombs, hold high cards), so that I can improve my gameplay.

### Hide My Cards
12. As a PC player sharing a screen, I want to hide my cards with a button or keyboard shortcut, so that other players at the table can't see my hand.
13. As a player with hidden cards, I want them to display as card backs (not blank or blurred), so that the card count is still visible but the content is secret.
14. As a player with hidden cards, I want the Drop and Pass buttons disabled until I reveal my hand, so that I don't accidentally play hidden cards.
15. As a player, I want to press `H` on my keyboard to quickly toggle card visibility, so that I can peek and hide rapidly.

### Ace / Straight Rules Fix
16. As a player, I want the Ace to function as both the highest card (10-J-Q-K-A) and the lowest (A-2-3-4-5) in straights, so that the core Pusoy Dos straights are correctly recognized.
17. As a player, I want the A-2-3-4-5 wheel straight to be treated as the lowest possible straight, so that it correctly loses to higher straights.
18. As a player, I want invalid straights like J-Q-K-A-2, Q-K-A-2-3, K-A-2-3-4, and 2-3-4-5-6 to be rejected, so that players can only play legitimate combinations.
19. As a player, I want the Two Pair A-A-2-2 to be rejected, so that 2's special status as the highest card is respected.

## Implementation Decisions

### Spectator Bug Fix

- The root cause is in the effect execution system: both `SPECTATE` and `BROADCAST_LOBBY` effects use `io.emit()` which broadcasts to all connected sockets. When a spectator joins during non-LOBBY phase, both effects hit every client — `lobby_update` causes `useGameLogic.handleLobbyUpdate` to call `onGameOver()`, instantly kicking active players to the lobby screen.
- Add an optional `socketId` field to the `TableEffect` type. When set, `executeEffects` uses `io.to(effect.socketId).emit(...)` instead of `io.emit(...)` for `SPECTATE` and `BROADCAST_LOBBY` effects.
- In `handleJoin`, when the joiner becomes a spectator during PLAYING or GAME_OVER phase, set `socketId: playerId` on both the `SPECTATE` and `BROADCAST_LOBBY` effects so they target only the joining spectator.
- No frontend changes required — the fix is purely server-side.

### Counter-Clockwise Queue Positioning

- The `getOpponentPosition` function currently maps opponents by array index linearly (0→top, 1→left, 2→right), which doesn't match counter-clockwise turn order.
- Counter-clockwise from the player at bottom means: index 0 → right (next in turn), then top, then left.
- Remap all position assignments for 2, 3, and 4 opponents to follow this counter-clockwise order. Single opponent remains at top.
- Add numbered turn-order badges (①, ②, ③, ④) on each opponent's label so the direction of play is visually explicit.
- The `opponents` array from the server is in join/seat order, which matches the turn advance order. The visual mapping must match this order.

### Turn Indicators (Three New)

- **Screen-edge glow**: Apply a colored, pulsing box-shadow to the game container div when `isMyTurn` is true. Use the player's color via a CSS keyframe animation (`pulse`). Implemented as a Framer Motion `animate` prop with `boxShadow` cycling.
- **Hand lift + glow**: Add a Framer Motion `animate` prop to `PlayerHand` (self-hand only) that lifts the hand by 8px, scales to 1.02, and applies a colored glow shadow when `isMyTurn` is true. On turn end, animate back to normal position.
- **Big animated banner + sound**: Replace the small `▶ Your turn` pill with a larger `motion.div` that slides down from the top of the screen with a bounce spring animation. Add a new `playTurnAlert` sound to `useSound` — a distinct ascending chime (different from the existing pass ding and drop thud).
- Existing yellow ring on player labels remains as a fourth indicator.
- All three indicators are only active when `isMyTurn` is true — opponents see their own glow/lift/banner.

### Handbook / Rules Book

- Add a book emoji icon button (📖) to the top-right corner of both Lobby and Game screens.
- Clicking opens a full-screen modal overlay with a dark backdrop.
- The modal has four tabs across the top: **Card Hierarchy**, **Combo Types**, **How to Play**, **Tips & Strategy**.
- **Card Hierarchy tab**: Shows rank order (3→2) and suit order (diamonds→spades) with small card component renders for visual clarity.
- **Combo Types tab**: Lists all 9 combo types with the card count, a description, and a visual example using small card renders arranged in the combo layout. Hover/active states highlight the current selection.
- **How to Play tab**: Step-by-step numbered guide covering joining, readying, countdown, turns, dropping, passing, new rounds, bombs, and game over.
- **Tips & Strategy tab**: Bullet points with strategic advice (hold high cards for late-game, save bombs, watch opponent card counts, etc.)
- Content is a static React component with no external dependencies. Uses existing `<CardComponent>` for visual card examples.
- The modal respects scroll if content overflows and closes with an X button, clicking the backdrop, or pressing Escape.

### Hide My Cards

- Add a small eye icon toggle button next to the self-hand label ("You (N) · Turn" area).
- State managed via `useState(false)` in the Game screen component — defaults to visible.
- When hidden, the `PlayerHand` component receives a `faceDown={true}` prop, which renders all self-cards using `CardComponent`'s existing `faceDown` rendering (shows card back image).
- While hidden: `onCardClick` is a no-op (toggling selection is disabled), Drop and Pass buttons are disabled with a "Reveal cards to play" tooltip/hint text.
- Keyboard shortcut: `useEffect` with a `keydown` listener for the `h` key. Only active when the Game screen is mounted (not when typing in the handbook or other inputs). Ignores the event if `event.target` is an input/textarea.
- A small help text appears below the hand when hidden: "Press H to reveal cards".

### Ace / Straight Rules Fix

- The current `isStraight` function uses modulo-13 wrapping to detect any 5-card sequence, which allows 13 possible straights including several invalid ones (J-Q-K-A-2, Q-K-A-2-3, K-A-2-3-4, 2-3-4-5-6).
- Replace the modulo-13 approach with explicit valid patterns:
  - Eight non-wrapping straights: rank values starting at 0 through 7 (3-4-5-6-7 up to 10-J-Q-K-A).
  - One wheel straight: rank values [11, 12, 0, 1, 2] representing A-2-3-4-5.
- For the wheel straight, the `primaryRank` must be `'5'` (rank value 2), NOT `'2'` (rank value 12). This ensures the wheel is correctly ranked as the lowest straight. The `primarySuit` should be the suit of the 5 card.
- For Two Pair validation, add a check that the higher rank is not 2 (`rankVals[1] !== getRankValue('2')`). This rejects A-A-2-2 while still allowing K-K-A-A and all other valid Two Pairs.
- Both `chikicha-backend/src/rules.ts` and `chikicha-frontend/src/rules.ts` must be updated identically — the backend is authoritative, but the frontend copy provides pre-validation feedback before emitting.

## Testing Decisions

### What makes a good test
- Tests assert externally observable behavior, not implementation details.
- Backend rules tests verify the pure functions (`detectCombo`, `canBeat`) return correct combos and comparison results.
- Backend table tests verify state transitions and effect generation for join/scenario handling.
- Backend Socket.IO integration tests verify the full socket event flow: connect clients, emit events, assert responses.
- Frontend component tests render with mock socket, assert correct positioning classes, toggle states, and modal visibility.
- No tests depend on animation timing, real network latency, or exact pixel positions.

### Seams (highest to lowest)

1. **Pure rules functions** (`rules.ts`) — highest seam. `detectCombo`, `canBeat`, `isStraight` are pure functions testable without any IO. The Ace/straight fixes are tested here.
2. **Table state transitions** (`table.ts`) — pure functions taking `(GameState, action) → TableEffect[]`. The spectator join fix is tested here by asserting correct `socketId` on effects.
3. **Socket.IO integration** (`index.test.ts`) — full server test. The spectator bug end-to-end flow is verified here: start game, connect spectator, assert active players don't receive `lobby_update`.
4. **Positioning utility functions** (`getOpponentPosition`) — pure functions testable with given index/total. Queue positioning verification.
5. **React components** (`Game.test.tsx`, `PlayerHand.test.tsx`, `Handbook.test.tsx`) — render with mock socket context, assert UI state changes for turn indicators, hide cards toggle, handbook open/close.
6. **Hooks** (`useSound.test.ts`, `useComboValidator.test.ts`) — test sound trigger on turn change, combo validation with new Ace rules.

### Prior art
- Backend rules tests (`rules.test.ts`, 494 lines) — exhaustive combo detection and comparison tests. Ace/straight fixes follow this pattern: update 4 existing tests, add 5 new ones.
- Backend integration tests (`index.test.ts`, 725 lines) — full socket flow tests with `socket.io-client`. Spectator fix tests follow this pattern.
- Frontend hook tests (`useComboValidator.test.ts`) — mock socket tests for combo validation. New Ace behavior is validated here.

## Out of Scope

- Timer enforcement for turns (a visible countdown forcing players to act)
- Reconnection flow improvements beyond the spectator fix
- Mobile-specific "peek" gesture for hiding cards
- Handbook translations / localization
- Full combat log / replay of previous rounds in the handbook
- Changing the Two Pair rule to allow non-sequential pairs
- J-Q-K-A-2 as a valid straight (explicitly rejected per player feedback)

## Further Notes

- The Ace rules fix is a **breaking change** to existing gameplay — players who previously relied on invalid straights (J-Q-K-A-2, etc.) will find those combos rejected. This should be communicated to players.
- The `handleLobbyUpdate` callback in `useGameLogic.ts` currently has no guard against calling `onGameOver()` during an active game. While the backend fix prevents the problematic broadcast, a defensive frontend guard is worth considering as a belt-and-suspenders measure.
- The handbook content is static and can be iterated on by the players themselves as they discover more strategy tips.
