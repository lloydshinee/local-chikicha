# 15: Card Ranking + Combo Utilities

## Parent

[#14: Pusoy Dos Rules & Undo Removal](./014-pusoy-dos-rules.md)

## What to build

Create the pure-function foundation for Pusoy Dos rule enforcement: a new `rules` module with no side effects that exports card ranking, suit ordering, combination detection, and comparison utilities. This module is used by the server for validation and (later) by the client for UI feedback.

### Functions to expose

- `getRankValue(rank)` → numeric value (3=0 … 2=12)
- `getSuitValue(suit)` → numeric value (♦=0, ♣=1, ♥=2, ♠=3)
- `compareCards(a, b)` → -1, 0, or 1 (rank first, suit second)
- `detectCombo(cards)` → detected combination type with primary rank/suit, or null if invalid
- `canBeat(newCombo, currentCombo)` → boolean (same type, higher; also handles bomb rule: four-of-a-kind beats single 2)

### Combination detection covers all 8 types

| Type | Cards | Detection rule |
|------|-------|----------------|
| SINGLE | 1 | Always valid |
| PAIR | 2 | Same rank |
| THREE | 3 | Same rank |
| STRAIGHT | 5 | Sequential rank order (wraps: A-2-3-4-5 through J-Q-K-A-2), any suits |
| FLUSH | 5 | All same suit, any ranks |
| FULL_HOUSE | 5 | 3 of a kind + 2 of a kind |
| FOUR | 5 | 4 of a kind + 1 kicker (any) |
| STRAIGHT_FLUSH | 5 | Sequential rank order AND all same suit |
| INVALID | any other | Returns null |

### Comparison rules

- Same type required to beat (except bomb rule)
- Compare primary rank; if tied, compare highest suit in the combo
- Bomb rule: FOUR beats SINGLE with rank 2 regardless of suits

## Acceptance criteria

- [ ] `detectCombo` correctly identifies all 8 valid combination types
- [ ] `detectCombo` returns null for invalid hands (wrong sizes, mixed types, non-sequential straights)
- [ ] Straight detection handles all 10 valid sequences including A-2-3-4-5 and J-Q-K-A-2
- [ ] Flush detection checks same-suit correctly
- [ ] Full house is distinguished from four of a kind (full house: 3+2 split, four: 4+1 split)
- [ ] `canBeat` returns true when same type, higher rank/suit
- [ ] `canBeat` returns false when different types (except bomb rule)
- [ ] `canBeat` returns true for FOUR against SINGLE with rank 2
- [ ] All pure functions have no side effects (no IO, no mutation of inputs)
- [ ] All functions are exported and typed

## Blocked by

None — can start immediately.
