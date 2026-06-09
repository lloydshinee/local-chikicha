# Issue 8: Hand arrangement via arrow keys

## Blocked by

- Issue #4 (game start & deal)

## What to build

Players can reorder cards in their hand using the left and right arrow keys. Select a card (click to toggle selection), then press left/right to shift it one position. Adjacent cards are pushed aside (not swapped). The new arrangement is broadcast to the server and other clients so everyone sees the updated hand (count stays the same, only order changes).

Backend:
- Handle `arrange` event: validate indices, update player's hand array order
- Emit `card_arranged` to all clients with player ID, fromIndex, toIndex
- No card data needed in broadcast — just indices

Frontend:
- Arrow key listener: when a card is selected, left arrow shifts it left, right arrow shifts it right
- Card shifts one position, pushing adjacent cards aside (array splice)
- After arrangement, the selected card stays selected
- Visual: cards re-sort in the fan with 150ms transition
- Arrow keys should not interfere with other keyboard interactions

Tests:
- Backend: arrange shifts card in hand array correctly
- Backend: invalid indices are rejected
- Frontend: left arrow shifts selected card left, pushing others right
- Frontend: right arrow shifts selected card right, pushing others left
- Frontend: arrangement persists after multiple arrow presses
- Frontend: arrow keys do nothing when no card is selected

## Acceptance criteria

- [ ] Select a card, press left arrow → card shifts left one position
- [ ] Select a card, press right arrow → card shifts right one position
- [ ] Adjacent cards are pushed aside (not swapped)
- [ ] Selected card remains selected after shifting
- [ ] Card positions animate smoothly during rearrangement
- [ ] Arrow keys have no effect when no card is selected
- [ ] Arrangement changes are visible to all players
