# Issue 9: Disconnect handling

## Blocked by

- Issue #4 (game start & deal)

## What to build

When a player disconnects (closes tab, loses network), their cards are removed from the game entirely. All remaining players are notified via a `player_left` event. If removing a player leaves only one player with cards, the game ends with that player as the loser (game over logic in issue #10).

A reconnecting player joins as a spectator, not back into the active game.

Backend:
- On `disconnect` socket event: remove player from active game state
- Remove their cards from play (not redistributed)
- Emit `player_left` to all remaining clients with the departed player's ID
- Check if remaining player count triggers game over (defer to issue #10)
- If reconnecting, treat as new spectator join (issue #11)

Frontend:
- On `player_left` event: remove the player's position/display from the game screen
- Show a brief notification: "[Username] disconnected"
- Their hand and central-area drops remain visible

Tests:
- Backend: disconnect removes player and their cards
- Backend: player_left emitted to remaining clients
- Backend: reconnect joins as spectator not player
- Frontend: player_left event removes player display
- Frontend: disconnected player's dropped cards remain in central area

## Acceptance criteria

- [ ] Closing a player's browser tab removes them from the game
- [ ] Disconnected player's cards are removed from play
- [ ] Remaining players see "[Username] disconnected" notification
- [ ] Disconnected player's previously dropped cards remain visible in center
- [ ] Disconnected player's position (top/left/right) shows as empty
- [ ] Reconnecting browser joins as spectator, not back into game
- [ ] Game continues normally for remaining players
