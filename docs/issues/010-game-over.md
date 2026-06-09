# Issue 10: Game over: loser reveal & lobby reset

## Blocked by

- Issue #5 (card drop)
- Issue #6 (pass emote)

## What to build

When only one player has cards remaining (detected after every drop and disconnect), the game ends. The loser's remaining cards are flipped face-up for all to see. A full-screen overlay announces "Loser: [username]" with confetti for the other players. After 5 seconds, the server resets to the lobby state and everyone returns to the lobby.

Backend:
- After each `drop` or `disconnect`, check if only 1 player has cards
- If game over: emit `game_over` to all with loserId, loserUsername, and the loser's remaining card data (face-up)
- Start 5-second timer, then reset state to LOBBY
- Emit `lobby_update` with all players back in lobby (not ready)

Frontend:
- On `game_over` event: show full-screen overlay
- Overlay: "Loser: [username]" in large text, loser's face-up cards displayed below
- Confetti animation for non-loser positions (using canvas-confetti library)
- After 5 seconds: overlay fades, transition to lobby screen
- Lobby shows all previous players + spectators, all unready, all slots open

Tests:
- Backend: game over detected when 1 player has cards
- Backend: game_over payload includes loser cards face-up
- Backend: state resets to LOBBY after 5 seconds
- Frontend: game_over overlay renders with loser name and cards
- Frontend: confetti renders for non-loser positions
- Frontend: transition to lobby after 5 seconds

## Acceptance criteria

- [ ] Game ends when only one player has cards
- [ ] Loser's remaining cards flip face-up and are visible to all
- [ ] Full-screen overlay shows "Loser: [username]"
- [ ] Confetti animation plays for non-loser players
- [ ] After ~5 seconds, everyone transitions back to lobby
- [ ] All slots open in lobby for next round (spectators can now ready)
- [ ] All ready states reset in lobby
- [ ] Game over triggers from both drops and disconnects reducing to 1 player
