# Issue 13: Visual polish & poker table layout (HITL)

## Blocked by

- Issues #1 through #12 (all AFK slices must be complete)

## What to build

Final visual pass on the entire application. Refine the poker table layout, ensure consistent theme (light), smooth out animations with framer-motion, and polish all screens: username entry, lobby, game, and game over.

This is a HITL (human-in-the-loop) ticket — requires design review before it can be marked done.

Frontend:
- Refined poker table: green felt background / appropriate table texture
- Player position cards/avatars with clean typography
- Card fan animation on deal (cards spread from a stack into the hand)
- Smooth card slide animations (hand → center, center → hand)
- Central area layout: dropped cards nicely spaced, not cluttered
- Countdown overlay: zoom/fade animation with larger typography
- Game over overlay: dramatic entrance, confetti timing refined
- Lobby: polished player slots with ready animations
- Consistent spacing, shadows, and border-radius throughout
- Responsive layout: works at 1366×768 minimum, looks good at 1920×1080

Testing:
- Manual review: open 4 browser windows, play through a full game
- Verify no visual glitches, layout breaks, or z-index issues
- Verify animations are smooth at 60fps

## Acceptance criteria

- [ ] Poker table has a cohesive theme (green felt or similar)
- [ ] All screens have consistent typography and spacing
- [ ] Card deal animation plays when game starts
- [ ] Card slide animations are smooth (60fps)
- [ ] Central area remains readable even with many drops
- [ ] Countdown overlay has engaging animation
- [ ] Game over overlay has dramatic entrance
- [ ] Lobby slots animate on join/ready state changes
- [ ] Layout works at 1366×768 minimum resolution
- [ ] No z-index issues, overlapping elements stack correctly
- [ ] Human design review approves the visual result
