# 14: Pusoy Dos Rules & Undo Removal

## Problem Statement

Players currently play on an honor system with no rule enforcement. Any cards can be dropped at any time — players must self-police through conversation and the undo button. This makes gameplay imprecise and creates friction: disputes arise over whether a play was legal, and undo is used as a crutch to correct mistaken (illegal) plays. The game needs to enforce Pusoy Dos (Chikicha) rules so that the app validates card plays, tracks rounds, and determines a ranked finish order at game end.

## Solution

Implement full Pusoy Dos rule enforcement on the backend. The server validates every dropped hand as a legal combination, checks that it beats the current hand-to-beat, enforces the 3♦ opening rule, tracks round ownership when all others pass, records player elimination order, and displays a 1st-through-4th ranking on game over. The undo button is removed entirely — it was a workaround for the absence of rule enforcement and is no longer needed.

## User Stories

1. As a player, I want the game to validate my dropped cards as a legal Pusoy Dos combination (single, pair, three of a kind, straight, flush, full house, four of a kind, or straight flush), so that I cannot accidentally play an invalid hand.

2. As a player, I want the game to enforce that my play beats the current hand-to-beat in the round, so that I must play a higher combination of the same type.

3. As a player holding the 3♦, I want the game to require that my first play includes the 3♦, so that the traditional opening rule is enforced.

4. As a player, I want to see the current hand-to-beat displayed prominently in the center of the table with its combination type labeled, so that I know exactly what I need to beat.

5. As a player, I want previously played hands to appear faded or smaller in the center area, so that I can reference past plays without them distracting from the current hand-to-beat.

6. As a player, I want my Drop button disabled with an explanation message when I select an invalid combination or one that cannot beat the current hand, so that I understand why I cannot play.

7. As a player, I want to pass during my turn, so that I can skip playing when I cannot or choose not to beat the current hand.

8. As a player, I want a pass emote bubble to appear when I pass, fading after a few seconds, so that everyone knows I skipped.

9. As a player, I want passing to advance the turn to the next player as before, so that the game proceeds smoothly.

10. As a player who just played a hand, I want all other players to pass before I get to start a fresh round, so that I maintain the round-winner advantage.

11. As a player who wins a round (all others passed), I want a fresh round to begin automatically on my next turn where I can play any combination freely, so that I don't have to match the previous hand.

12. As a player, I want to see an indicator when it's a "new round" and I can play any combination, so that I know the round has reset.

13. As a player, I want the 2 to be the highest-ranked card in singles, pairs, and threes, so that the Pusoy Dos card hierarchy is respected.

14. As a player, I want to be able to beat any single 2 with a four of a kind (bomb rule), so that even the highest single card has a counter.

15. As a player, I want straights to wrap around with 2 following A (J-Q-K-A-2 is the highest straight, A-2-3-4-5 is valid), so that the full range of straight combinations is available.

16. As a player, I want diamonds to be the lowest suit, followed by clubs, hearts, then spades highest, so that suit tie-breaking follows the agreed convention.

17. As a player who empties my hand, I want to be removed from the turn rotation and recorded in the finish order, so that I'm credited for finishing and the remaining players continue.

18. As a player, I want to see the final ranking (1st, 2nd, 3rd, Loser) on the game-over screen, so that everyone knows where they placed.

19. As a player, I want confetti on the game-over screen if I did not lose, so that there's a celebratory moment for non-losers.

20. As a player, I want the game-over screen to show the loser's remaining cards face-up with their color indicator, so that the outcome is clear and reviewable.

21. As a player, I no longer need an undo button, because rule enforcement means I cannot make an illegal play that needs to be undone.

22. As a player who disconnects mid-game, I want my cards removed and the game to continue, with the finish order adjusted as if I finished in the position corresponding to when I left.

23. As a player, I want the turn indicator to accurately reflect whose turn it is, skipping eliminated players in the rotation.

24. As a spectator, I want to see the current hand-to-beat, pile history, and round state, so that I can follow the game as a viewer.

## Implementation Decisions

### Card Hierarchy

- **Rank order** (lowest to highest): 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2
- **Suit order** (lowest to highest): Diamonds (♦) → Clubs (♣) → Hearts (♥) → Spades (♠)
- For comparing cards of the same rank, the higher suit wins.
- For comparing straights of the same high rank, the suit of the highest card breaks the tie.

### Valid Combinations (ranked lowest to highest)

| Type | Cards | Description |
|------|-------|-------------|
| Single | 1 card | One card of any rank/suit |
| Pair | 2 cards | Two cards of the same rank |
| Three of a Kind | 3 cards | Three cards of the same rank |
| Straight | 5 cards | Five cards in sequential rank order (any suits). Wraps: A-2-3-4-5 through J-Q-K-A-2 |
| Flush | 5 cards | Five cards all of the same suit (any ranks) |
| Full House | 5 cards | Three of a kind + a pair (e.g., 7-7-7 + J-J) |
| Four of a Kind | 5 cards | Four cards of the same rank + one kicker card (any) |
| Straight Flush | 5 cards | Five cards in sequential rank order, all of the same suit |

To beat the current hand in a round, a player must play the **same combination type** with a higher primary rank (and suit, if tied).

### Bomb Rule

A **Four of a Kind** beats any **Single 2**, regardless of the 2's suit. A Four of a Kind does NOT beat a Pair of 2s, Three of a Kind with 2s, or any other combination — it only trumps a single 2.

### 3♦ Opening Rule

The player who holds the 3♦ starts the game. Their first play of the game **must include the 3♦**, either as a single or as part of a valid combination (pair of 3s, straight containing 3♦, etc.). If the player passes on their first turn, the 3♦ remains unplayed and the first-play requirement persists for the next player in turn order. This repeats until someone plays the 3♦.

### Round Mechanics

- A **round** begins when someone plays a hand and sets the "hand to beat."
- Each subsequent player must either play a higher hand of the same type or pass.
- When **all active players besides the last dropper have passed** since the last drop, the round ends. The last dropper wins the round.
- On the round winner's next turn, a **fresh round** begins — `currentTopCombo` is reset to null, and they may play any combination.
- The `turn_change` event will carry an `isNewRound: boolean` flag so the client can display "New round — play anything!"

### Player Elimination & Finish Order

- When a player empties their hand, they are removed from the turn rotation. The `finishOrder` array records their position (1st, 2nd, etc.).
- The turn index adjusts when players are removed (skip forward if needed, or wrap).
- Game over triggers when exactly one player still has cards. That player is the loser (last place).
- The `game_over` event emits the full `finishOrder` array: `[{position, playerId, username, color}]` plus the loser's remaining cards.

### Backend State Shape

New fields added to the existing `GameState`:

```typescript
// In-memory state additions
currentTopCombo: { type: ComboType; primaryRank: Rank; primarySuit: Suit; cards: Card[] } | null
passCount: number           // consecutive passes since last drop
firstPlayMade: boolean      // false until 3♦ is played
finishOrder: { position: number; playerId: string; username: string; color: string }[]
```

Fields removed:

```typescript
lastDropPlayerId: string | null   // was for undo — no longer needed
```

### Socket.IO Event Contract Changes

**`card_dropped` event (server → client)**: Now includes the combination type and whether this was the first play:
```typescript
{
  playerId: string;
  cards: Card[];
  comboType: string;          // e.g. "STRAIGHT", "SINGLE"
  isFirstPlay: boolean;        // true if this was the 3♦ opener
}
```

**`turn_change` event (server → client)**: Now includes round state:
```typescript
{
  playerId: string;
  isNewRound: boolean;
  currentCombo: { type: string; primaryRank: string; primarySuit: string } | null;
}
```

**`game_over` event (server → client)**: Now includes ranking:
```typescript
{
  loserId: string;
  loserUsername: string;
  loserColor: string;
  cards: Card[];
  finishOrder: { position: number; playerId: string; username: string; color: string }[];
}
```

**`card_undone` (removed)**: No longer emitted. Client-side listener removed.

**Client → Server events:**
- `drop`: unchanged signature. Server now validates combo internally.
- `undo`: **removed**. Server no longer handles this event.
- `pass`, `arrange`, `join`, `ready`: unchanged.

**`undo` event (removed)**: Deleted from both client emit and server handler.

### Module Architecture

- **New module** for Pusoy Dos rules (`rules.ts`): Pure functions for `detectCombo(cards)`, `canBeat(new, current)`, `getRankValue(rank)`, `getSuitValue(suit)`, `compareCards(a, b)`, `isStraight(cards, rankOrder)`, `isFlush(cards)`. No side effects.
- **New module** for game state management (`state.ts`): Pure reducer and helper functions for round tracking, pass counting, finish order, turn queue management with player elimination.
- **Existing `index.ts`**: Becomes the Socket.IO wiring layer only. Calls into `rules.ts` for validation and `state.ts` for state transitions. Drops from ~380 lines to ~250 lines.
- **Existing `game.ts`**: Types and deck utilities. Remove `lastDropPlayerId` from `GameState`. Add `ComboType` enum.

### Frontend UI Changes

- **Undo button**: Removed entirely from the game screen.
- **Validation state**: The game screen tracks whether the selected cards form a valid combo and whether they can beat the current hand. Drop button is disabled with an inline message when invalid.
- **Current hand-to-beat**: Displayed prominently in the center. Shows combo type label (e.g., "STRAIGHT — Beat this!"). The previously played hand fades behind it (reduced opacity, smaller scale). Only the last 2 entries in pile are shown.
- **New round indicator**: When `currentTopCombo` is null and it's the player's turn, display "New round — play any combination!" above the hand area.
- **Game over ranking**: Show positions 1st through Loser with player names and color dots. Loser's cards displayed face-up. Confetti for non-loser positions.
- **Pass button**: Always visible when it's the player's turn (Drop requires valid selection).

## Testing Decisions

### What Makes a Good Test

- Tests assert externally observable behavior, not implementation details.
- Backend rule tests call pure functions and assert return values.
- Backend socket tests send events from a test client and assert emitted responses and final game state.
- Frontend tests render components with mocked socket and assert rendered UI matches expected behavior.

### Test Seams

| Seam | Technique | Coverage |
|------|-----------|----------|
| `rules.ts` (new) | Vitest unit tests — pure functions | Combo detection (valid/invalid for all 8 types), canBeat (rank, suit, bomb rule), 3♦ detection, straight wrap cases, full house vs four of a kind distinction |
| `state.ts` (new) | Vitest unit tests — pure reducer | Round tracking, pass counting with reset, finish order, turn queue with player elimination, firstPlayMade flag, game-over trigger |
| `index.test.ts` (existing, modified) | Vitest + `socket.io-client` | Full event flow: valid combo accepted, invalid combo rejected, weaker combo rejected, pass resets round after full cycle, 3♦ enforcement on first play, 3♦ override when other plays first, game-over with ranking, disconnect with finish order |
| `Game.test.tsx` (existing, modified) | Vitest + React Testing Library | Drop disabled + validation message, hand-to-beat display with combo label, new round indicator, pass button availability, game-over ranking display, no undo button rendered |

### Prior Art

- `game.test.ts` (8 tests) — established pattern for pure function unit tests on card operations. The new `rules.test.ts` follows this same pattern.
- `index.test.ts` (23 pass, 1 skip) — established pattern for Socket.IO integration tests using inline server setup. The undo tests (lines 584-622) will be removed; new drop/pass validation and round tracking tests will be added.
- `Game.test.tsx` (6 tests) — established pattern for component tests with mocked socket context. Will be extended to cover new UI states.

## Out of Scope

- AI/bot players
- Timer enforcement for turns
- Drag-and-drop card selection (click-to-toggle remains)
- Multiple rooms or room codes
- Internet hosting (LAN only)
- Mobile-exclusive layout
- Player-elected card back themes
- Spectator chat or interaction
- Persistent storage (scores, history)
- Accessibility (screen readers, ARIA)
- Localization / i18n
- Rule variant configuration (single variant hardcoded per decisions above)
