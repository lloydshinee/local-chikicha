# Issue 3: Ready flow: toggle, countdown, abort

## Blocked by

- Issue #2 (join flow)

## What to build

Players in the lobby can toggle a Ready/Unready button. When all 4 players are ready, a 5-second countdown begins. The countdown is displayed as a large overlay (3... 2... 1...). If any player unreadies during the countdown, it aborts and resets.

Backend:
- Handle `ready` event — set player.ready, check if all 4 are ready
- If all 4 ready, start a 5-second timer, emit `countdown` each second
- On unready during countdown, cancel timer, emit `countdown_aborted`
- On countdown reaching 0, transition to PLAYING state

Frontend:
- Ready/Unready toggle button on each player's own slot
- Non-interactive ready indicator (checkmark) on other players' slots
- Countdown overlay: big centered text "3", "2", "1" with fade/scale animation
- On abort, remove overlay and reset

Tests:
- Backend: ready event toggles state, all-ready triggers countdown
- Backend: countdown emits correct seconds values
- Backend: unready during countdown aborts and emits countdown_aborted
- Frontend: ready button renders, clicking emits ready event
- Frontend: countdown overlay displays and animates
- Frontend: countdown disappears on abort

## Acceptance criteria

- [ ] Each player sees a Ready/Unready toggle button on their own slot
- [ ] Other players see a checkmark/green indicator when someone is ready
- [ ] All 4 players ready triggers a 5-second countdown overlay
- [ ] Countdown shows "3", "2", "1" with visible countdown animation
- [ ] Unready during countdown aborts it and overlay disappears
- [ ] Countdown completes (not blocked — game start is issue #4)
