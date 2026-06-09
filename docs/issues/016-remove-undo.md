# 16: Remove Undo

## Parent

[#14: Pusoy Dos Rules & Undo Removal](./014-pusoy-dos-rules.md)

## What to build

Completely remove the undo mechanic from the entire stack: backend handler, frontend button and state, Socket.IO event contract, and all related tests. Undo was a workaround for the absence of rule enforcement — with Pusoy Dos rules enforcing valid plays, it is no longer needed.

### Backend changes

- Remove the `undo` Socket.IO event handler
- Remove `lastDropPlayerId` from the game state and all references in drop/pass/disconnect logic
- Remove `card_undone` event emission

### Frontend changes

- Remove the Undo button from the game screen
- Remove `lastDropIsMine` state and all `setLastDropIsMine()` calls
- Remove `handleUndo` function
- Remove `handleCardUndone` callback
- Remove `card_undone` socket listener registration and cleanup

### Test changes

- Remove undo-related tests: "undo returns cards to hand" and "prevents non-dropper from undoing"
- Remove any undo assertions from other tests

## Acceptance criteria

- [ ] Undo button is no longer rendered in the game screen
- [ ] `lastDropIsMine` state is removed from Game component
- [ ] Server does not handle `undo` events (no server error when a client emits `undo` — it's simply ignored)
- [ ] `card_undone` event is never emitted by the server
- [ ] `lastDropPlayerId` is removed from backend state type and all runtime usages
- [ ] All 2 undo tests are removed from the test suite
- [ ] Existing tests continue to pass (no regressions from removed undo logic)

## Blocked by

None — can start immediately.
