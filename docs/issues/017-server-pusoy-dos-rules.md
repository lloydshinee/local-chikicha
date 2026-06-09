# 17: Server-Side Pusoy Dos Rules

## Parent

[#14: Pusoy Dos Rules & Undo Removal](./014-pusoy-dos-rules.md)

## What to build

Implement the full Pusoy Dos game loop on the server: every drop is validated as a legal combination that beats the current hand-to-beat, the 3♦ opener is enforced, pass counting triggers round resets, and player elimination tracks a ranked finish order.

### Game state additions

```typescript
currentTopCombo: { type: ComboType; primaryRank: Rank; primarySuit: Suit; cards: Card[] } | null
passCount: number           // consecutive passes since last drop
firstPlayMade: boolean      // false until 3♦ is played
finishOrder: { position: number; playerId: string; username: string; color: string }[]
```

Remove `lastDropPlayerId` (if not already removed by issue #16).

### Drop handler — full validation

1. Verify it is the player's turn
2. Detect the combination using `detectCombo(cards)` from the rules module — reject if invalid
3. If `firstPlayMade` is false, the drop must include the 3♦ — reject if missing; set `firstPlayMade = true` on success
4. If `currentTopCombo` is set, the drop must beat it (same type, higher via `canBeat`) — reject if it doesn't
5. On success: set `currentTopCombo`, reset `passCount = 0`, remove cards from player's hand
6. If the player's hand is now empty, push them to `finishOrder` with their position, and remove them from the turn rotation
7. Emit `card_dropped` with `{ playerId, cards, comboType, isFirstPlay }`
8. Check game over — or advance turn (skipping eliminated players)

### Pass handler — round tracking

1. Verify it is the player's turn
2. Increment `passCount`
3. If `passCount >= activePlayers - 1`, the round resets: `currentTopCombo = null`, `passCount = 0`. The next `turn_change` carries `isNewRound: true`.
4. Emit `card_passed` with playerId
5. Advance turn (skipping eliminated players)

### 3♦ opening rule

The player holding 3♦ starts (existing behavior via `findThreeOfDiamonds`). The first player to drop MUST include 3♦. If they pass, `firstPlayMade` remains false, and the next player's first drop is also required to include 3♦. This repeats until someone plays it.

### Player elimination

When a player empties their hand, they are recorded in `finishOrder` (1st, 2nd, etc.) and removed from the active turn rotation. The turn index adjusts to skip finished players. If all but one player has finished, the game ends.

### Game over

The `game_over` event now carries the full `finishOrder` array plus the loser's ID, username, color, and remaining cards. The game resets to lobby after 5 seconds as before.

### Socket.IO event contract updates

- `card_dropped`: adds `comboType: string` and `isFirstPlay: boolean`
- `turn_change`: adds `isNewRound: boolean` and `currentCombo: { type, primaryRank, primarySuit } | null`
- `game_over`: adds `finishOrder: { position, playerId, username, color }[]`
- `card_undone`: removed entirely

## Acceptance criteria

- [ ] Valid combo drops are accepted and cards removed from player's hand
- [ ] Invalid combos are rejected (no cards removed, no event emitted)
- [ ] Drops that don't beat the current `currentTopCombo` are rejected
- [ ] First play without 3♦ is rejected; first play WITH 3♦ succeeds and sets `firstPlayMade = true`
- [ ] After `firstPlayMade` is true, subsequent drops no longer require 3♦
- [ ] Passing increments `passCount`; when all other active players pass, round resets and `currentTopCombo` becomes null
- [ ] Round winner can play any combination in the new round (no beat requirement when `currentTopCombo` is null)
- [ ] Four of a kind beats a single 2 (bomb rule)
- [ ] Higher-ranked same-type combos beat lower-ranked ones
- [ ] Player who empties hand is added to `finishOrder` and removed from turn rotation
- [ ] Turn advancing skips players with empty hands
- [ ] Game over triggers when exactly 1 player has cards, emitting ranked `finishOrder`
- [ ] Disconnected players' cards are removed and game continues
- [ ] All new server behavior is covered by integration tests (extend existing `index.test.ts` pattern)

## Blocked by

- [#15: Card Ranking + Combo Utilities](./015-card-ranking-combo-utils.md)
