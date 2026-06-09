# 18: Frontend Pusoy Dos UX

## Parent

[#14: Pusoy Dos Rules & Undo Removal](./014-pusoy-dos-rules.md)

## What to build

Update the game screen to give players visibility into Pusoy Dos rule enforcement: show what hand they must beat, validate their selection before they try to drop, and display a ranked finish order on game over.

### Hand-to-beat display

The center pile area now distinguishes between:
- **Current hand-to-beat**: displayed prominently (full opacity, larger scale) with a colored border matching the dropper and a combo type label above it (e.g., "PAIR — Beat this!", "STRAIGHT — Beat this!")
- **History**: previously played hands shown behind/around the current one at reduced opacity and smaller scale. Still limited to last 2 entries.

The current hand-to-beat card group pulses or has a subtle attention-drawing animation.

### New round indicator

When `turn_change` arrives with `isNewRound: true` (or `currentCombo` is null), and it is the local player's turn, display a "New round — play any combination!" indicator above the player's hand area. This persists until the player drops something and the next `card_dropped` event arrives.

### Drop validation UI

- The game client imports the combo detection function from the shared rules module
- As the player selects cards, the client detects whether they form a valid combination
- The Drop button is **disabled** when:
  - No cards are selected
  - The selected cards do not form a valid combo ("Invalid combination")
  - The selected combo cannot beat the current hand-to-beat ("Must beat [combo type] ([description])")
- A small inline message below the Drop/Pass buttons explains why the drop is blocked
- The Pass button is always available when it's the player's turn

### Game over ranking UI

Replace the simple "Loser: [name]" overlay with a ranked leaderboard:

- Title: "Game Over!"
- Positions listed vertically: 1st, 2nd, 3rd (with player name, color dot, confetti) and "Loser: [name]" at the bottom
- Loser's remaining cards displayed face-up below their entry
- Confetti animation for non-loser positions only
- "Returning to lobby..." countdown as before

### Cleanup

With undo removed, ensure no undo references remain in the Game component:
- No undo button, no `lastDropIsMine` state, no `handleUndo` function, no `card_undone` listener

## Acceptance criteria

- [ ] Current hand-to-beat is displayed prominently in the center with combo type label and dropper's color border
- [ ] Previous hands are visible but faded/smaller behind the current one
- [ ] "New round — play any combination!" appears when `isNewRound` is true and it's the player's turn
- [ ] Drop button is disabled with explanation message when selection is invalid or can't beat current hand
- [ ] Drop button is enabled when selection forms a valid combo that beats the current hand
- [ ] Drop button is enabled when it's a new round and selection forms any valid combo
- [ ] Pass button is always enabled during the player's turn
- [ ] Game over screen shows ranked 1st, 2nd, 3rd, Loser with names, colors, and confetti
- [ ] Loser's remaining cards are displayed face-up
- [ ] No undo button, state, or listeners remain in the Game component
- [ ] Spectator view shows the current hand-to-beat and pile history (read-only)
- [ ] Component tests cover the new UI states

## Blocked by

- [#15: Card Ranking + Combo Utilities](./015-card-ranking-combo-utils.md)
- [#16: Remove Undo](./016-remove-undo.md)
