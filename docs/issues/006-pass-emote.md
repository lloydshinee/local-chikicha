# Issue 6: Pass with emote bubble

## Blocked by

- Issue #4 (game start & deal)

## What to build

A Pass button in the player's hand area, next to the Drop button. When clicked, it emits a pass event and a 🤚 emoji speech bubble appears above the passing player's hand area on all clients, fading out after 3 seconds.

Backend:
- Handle `pass` event — record the pass, emit `card_passed` to all clients with player ID
- No state change needed beyond broadcasting

Frontend:
- Pass button in hand area, next to Drop button
- On `card_passed` event received: render a speech bubble with 🤚 emoji above the passing player's hand
- Bubble fades out after 3 seconds (CSS animation or framer-motion)
- Bubble should be positioned relative to the player's hand area, not the center

Tests:
- Backend: pass event broadcasts card_passed to all clients
- Frontend: pass button renders and emits pass event on click
- Frontend: card_passed event triggers speech bubble with 🤚
- Frontend: speech bubble fades after 3 seconds

## Acceptance criteria

- [ ] Pass button visible in hand area, next to Drop button
- [ ] Clicking Pass emits the pass event to the server
- [ ] All players see a 🤚 emoji speech bubble above the passing player's hand
- [ ] Speech bubble fades out automatically after 3 seconds
- [ ] Pass does not affect hand or central area cards
