# Issue 2: Join flow: username entry to lobby

## Blocked by

- Issue #1 (scaffold & socket handshake)

## What to build

The full join lifecycle. A player enters a username on a simple form, clicks Join, and appears in the lobby alongside other players. The server tracks connected players, assigns them colors by join order (Red → Blue → Green → Yellow), and broadcasts lobby updates.

Backend:
- Handle `join` event — register player with username, assign color by join order, store in socket.data
- Emit `lobby_update` to all clients when roster changes
- Track max 4 players + unlimited spectators

Frontend:
- Username input screen: centered form with "chikicha" title, text input, Join button
- Lobby screen: 4 player slots showing name + color dot, spectator list below
- Transition from username screen → lobby on successful join
- Re-route to lobby automatically if already joined (page refresh)

Tests:
- Backend: join event registers player, emits lobby_update with correct player list
- Backend: 5th player joins as spectator
- Backend: duplicate usernames are rejected (or auto-disambiguated)
- Frontend: username form renders, submitting emits join event
- Frontend: lobby renders player slots from lobby_update data

## Acceptance criteria

- [ ] Opening the site shows a username entry form titled "chikicha"
- [ ] Entering a username and clicking Join transitions to the lobby screen
- [ ] The lobby shows player slots with name and color dot (Red, Blue, Green, Yellow)
- [ ] Multiple browser tabs joining show each other in the lobby
- [ ] 5th+ visitors appear in a spectator list below the 4 player slots
- [ ] Refresh of page returns to lobby (not username screen) if already joined
- [ ] Backend tests pass (join registration, lobby update)
- [ ] Frontend tests pass (form renders, lobby renders)
