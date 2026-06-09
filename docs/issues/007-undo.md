# Issue 7: Undo mechanic

## Blocked by

- Issue #5 (card drop)

## What to build

After a player drops cards, an Undo button appears near the dropped cards in the central area. Only the player who made the drop can see and click it. Clicking Undo returns the cards to that player's hand and removes them from the central area. As soon as any other player drops, the undo becomes unavailable — the button disappears.

Backend:
- Track the last drop: which player, which cards, which indices they came from
- Handle `undo` event: verify the requesting player is the last dropper, verify no other player has dropped since
- Return cards to player's hand, remove from pile
- Emit `card_undone` to all clients with player ID
- Clear undo availability when a new drop occurs

Frontend:
- Undo button appears floating near the dropped cards in center, only for the dropper
- Clicking Undo emits the undo event, cards slide back to hand (200ms)
- Undo button disappears immediately when `card_dropped` event arrives for another player
- Undo button does not appear for anyone who didn't make the drop

Tests:
- Backend: undo returns cards to correct player's hand
- Backend: non-dropper cannot undo
- Backend: undo rejected after another player drops
- Backend: card_undone emitted with correct data
- Frontend: undo button visible only for last dropper
- Frontend: undo button disappears on new drop from another player
- Frontend: cards animate back to hand on undo

## Acceptance criteria

- [ ] Undo button appears in central area immediately after dropping
- [ ] Only the player who dropped can see the Undo button
- [ ] Clicking Undo returns cards to the dropper's hand
- [ ] Cards slide from central area back to hand (~200ms)
- [ ] Undo button disappears when any other player drops
- [ ] No confirmation prompt required to undo
