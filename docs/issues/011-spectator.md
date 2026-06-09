# Issue 11: Spectator flow

## Blocked by

- Issue #2 (join flow)
- Issue #4 (game start & deal)
- Issue #10 (game over & lobby reset)

## What to build

Visitors beyond the 4th are spectators. They see the lobby with ready states, and can watch the game in progress (all cards visible — both hand cards and central area, all face-up to spectators). When a game ends and the lobby resets, spectators can ready up alongside returning players — first 4 to ready become the next round's players.

Backend:
- Track spectators separately from players
- On game in progress: send game state to new spectator on join (emit `spectate` with full game state)
- On lobby reset after game over: clear spectator/player distinction for ready purposes
- First 4 clients to emit `ready: true` after reset become players

Frontend:
- Spectator badge/label on lobby spectator list
- Game view for spectators: same layout as players but no hand (they see everything)
- All hands visible to spectator (face-up), central area visible
- No Drop/Pass/Undo buttons for spectators
- Ready button appears for spectators when lobby resets after game over

Tests:
- Backend: 5th join becomes spectator, not player
- Backend: spectate event sends full game state
- Backend: lobby reset allows any client (including spectators) to ready as player
- Frontend: spectator sees full game state
- Frontend: spectator has no game action buttons
- Frontend: spectator can ready after game over reset

## Acceptance criteria

- [ ] 5th+ visitor labeled as "Spectator" in lobby
- [ ] Spectators see all player ready states in lobby
- [ ] Spectators see the full game (all hands face-up) during play
- [ ] Spectators cannot drop, pass, undo, or arrange
- [ ] When game ends and lobby resets, spectators can click Ready
- [ ] First 4 to ready in the reset lobby become the next players
- [ ] Previous players have no priority — it's first-to-ready
- [ ] Spectator joining mid-game receives current game state immediately
