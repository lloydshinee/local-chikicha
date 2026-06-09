# Issue 12: Sound effects

## Blocked by

- Issue #5 (card drop)
- Issue #6 (pass emote)
- Issue #7 (undo)
- Issue #10 (game over)

## What to build

Programmatically generated sound effects using the Web Audio API — no external audio files. Each game event triggers a corresponding tone. Sounds should be subtle, quick, and not overlap in an annoying way.

Sound definitions:
- Drop: soft thud — 200Hz sine wave, 100ms duration with quick fade-out envelope
- Pass: gentle ding — 800Hz sine wave, 200ms duration
- Countdown tick: short click — 1kHz sine, 50ms duration
- Countdown final (1): higher pitched — 1.5kHz sine, 100ms
- Undo: rising swoosh — white noise burst, 150ms with bandpass filter
- Game over: descending wah — two-note slide 400Hz → 200Hz, 600ms

Frontend:
- Create a `useSound` hook or SoundManager that exposes play functions
- Wire play calls to event handlers:
  - Drop sound triggers on incoming `card_dropped` event
  - Pass sound triggers on incoming `card_passed` event
  - Countdown ticks trigger on `countdown` event (seconds >= 1)
  - Undo sound triggers on `card_undone` event
  - Game over sound triggers on `game_over` event
- Ensure sounds don't stack (use short sounds, AudioContext management)
- Respect browser autoplay policy (init AudioContext on first user interaction)

Tests:
- No dedicated tests required — sounds are cosmetic and covered by existing integration tests

## Acceptance criteria

- [ ] Drop: soft thud sound plays when cards are dropped
- [ ] Pass: gentle ding plays when someone passes
- [ ] Countdown: tick per second, higher pitch on final "1"
- [ ] Undo: rising swoosh plays on undo
- [ ] Game over: descending wah plays on game over
- [ ] No external audio files used — all Web Audio API
- [ ] Sounds work in all major browsers (Chrome, Firefox)
- [ ] Multiple rapid drops don't cause audio glitching
