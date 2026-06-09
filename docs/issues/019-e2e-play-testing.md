# 19: End-to-End Play Testing

## Parent

[#14: Pusoy Dos Rules & Undo Removal](./014-pusoy-dos-rules.md)

## What to build

Manual play-testing session to verify that all Pusoy Dos rules work correctly end-to-end with real clients. This is a human validation step — automated tests cover the individual behaviors, but a full play-through with 4 players catches integration issues.

### Test scenario: Full game with 4 players

1. Start the server and frontend
2. Open 4 browser clients (real or incognito windows)
3. Each player joins with a unique username
4. All 4 ready up → countdown → game starts
5. Verify 3♦ holder starts first
6. Verify 3♦ holder can only play combos containing 3♦ on first turn
7. Play through several rounds, verifying:
   - Invalid combos are rejected
   - Combos that don't beat the current hand are rejected
   - Valid combos that beat the current hand are accepted
   - Passes advance the turn
   - When all 3 others pass, the round resets and winner gets free play
   - Bomb rule: Four of a Kind beats a single 2
   - Straight wrap: A-2-3-4-5 and J-Q-K-A-2 are valid straights
8. Have players empty their hands at different times
9. Verify finish order matches the order they emptied
10. Verify game over screen shows correct 1st-4th ranking
11. Verify lobby reset after 5 seconds
12. Verify undo button is not present anywhere
13. Verify hand-to-beat is displayed prominently with combo type label
14. Verify new round indicator appears

### Test scenario: Disconnect during play

1. Start a game with 4 players
2. Have one player close their browser mid-game
3. Verify the remaining 3 players continue with turn order adjusted
4. Verify the disconnected player's cards are removed
5. Complete the game — verify finish order accounts for missing player

### Test scenario: Spectator

1. Have a 5th browser join during an active game
2. Verify spectator can see the current hand-to-beat and pile history
3. Verify spectator sees the game over screen with ranking

## Acceptance criteria

- [ ] Full 4-player game completes with correct rule enforcement
- [ ] All combo types are playable and correctly validated
- [ ] 3♦ rule enforced on first play
- [ ] Round resets when everyone passes
- [ ] Bomb rule works
- [ ] Straight wrap works
- [ ] Finish order is 100% correct
- [ ] Game over ranking display is correct
- [ ] Undo is absent from UI
- [ ] Disconnect handling works with ranked finish
- [ ] Spectator view shows correct game state
- [ ] Any bugs found are documented as new issues

## Blocked by

- [#17: Server-Side Pusoy Dos Rules](./017-server-pusoy-dos-rules.md)
- [#18: Frontend Pusoy Dos UX](./018-frontend-pusoy-dos-ux.md)
