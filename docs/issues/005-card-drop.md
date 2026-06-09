# Issue 5: Card selection & drop to central area

## Blocked by

- Issue #4 (game start & deal)

## What to build

Players can click cards in their hand to toggle selection. Selected cards lift up 10px and show a glowing border in the player's assigned color. Pressing the Drop button sends the selected cards to the central shared area. Dropped cards appear in the center grouped chronologically by round, each outlined in the dropper's color. All drops remain visible.

Backend:
- Handle `drop` event: receive card indices, remove those cards from player's hand, add to the central pile
- Track drop order (chronological), associate each drop with the player's color
- Emit `card_dropped` to all clients with player ID and dropped card data
- Validate that the dropped cards actually belong to the player

Frontend:
- Click-to-toggle selection: each card click toggles `selected` state
- Visual: selected cards lift 10px (translateY(-10px)), glow border in player color
- Drop button in the hand area (bottom-right), enabled when ≥1 card selected
- Central area: renders all drops in chronological order
- Each drop group shows cards with an outline/border in the dropper's player color
- Cards slide from hand to center with 200ms animation
- After drop, cards removed from hand, deselection cleared

Tests:
- Backend: drop removes cards from hand, adds to pile
- Backend: drop with invalid indices is rejected
- Backend: card_dropped emitted to all clients with correct data
- Frontend: clicking card toggles selection and visual state
- Frontend: drop button emits drop event with selected indices
- Frontend: central area renders dropped cards with player color outline
- Frontend: cards animate from hand to center on drop

## Acceptance criteria

- [ ] Clicking a card toggles it as selected (lifted + colored glow)
- [ ] Multiple cards can be selected simultaneously
- [ ] Drop button appears and is clickable when cards are selected
- [ ] Pressing Drop sends selected cards to the central area
- [ ] Dropped cards appear in the center with an outline in the dropper's color
- [ ] Drops are ordered chronologically in the central area
- [ ] Previous drops remain visible (don't clear on new drop)
- [ ] Cards are removed from hand after dropping
- [ ] All other players see the dropped cards appear in real-time
- [ ] Card slide animation from hand to center (~200ms)
