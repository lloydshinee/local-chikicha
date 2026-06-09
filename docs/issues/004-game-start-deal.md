# Issue 4: Game start: deal cards & display hands

## Blocked by

- Issue #3 (ready flow & countdown)

## What to build

When the countdown completes (from issue #3), the server deals all 52 cards randomly and evenly among the 4 players (13 each). Each client receives its own hand and the card counts of all opponents. The poker-table layout emerges: self at bottom with fanned face-up cards, opponents at top/left/right with face-down card backs.

Backend:
- Shuffle 52-card deck (suits: spades, hearts, diamonds, clubs; ranks: A,2-10,J,Q,K)
- Deal evenly among active players
- Transition state to PLAYING
- Emit `game_start` to each player with: their hand array, all players' positions + card counts

Frontend:
- Poker-table layout: self at bottom, 3 opponents at fixed top/left/right positions
- Own hand: loose flat overlapping fan of face-up cards at 60% scale (~145×204 px)
- Opponent hand ≤10 cards: row of card backs at 60% scale
- Opponent hand >10 cards: single stack with count badge ("13")
- Card images served from `playing-cards/` assets, using naming convention `{suit}_{rank}.png`

Tests:
- Backend: deal produces correct total cards (52), correct count per player
- Backend: no duplicate cards across players
- Backend: game_start payload contains own hand and opponent card counts
- Frontend: game screen renders self at bottom with correct number of cards
- Frontend: opponents render at correct positions with card backs
- Frontend: opponent stack collapses with count badge when >10 cards

## Acceptance criteria

- [ ] After countdown completes, game screen appears for all players
- [ ] Each player has 13 cards (for 4 players) displayed fanned at bottom
- [ ] Cards are face-up for self, card backs for opponents
- [ ] Opponents appear at top, left, and right positions
- [ ] Opponent with >10 cards shows a stack + count badge
- [ ] Opponent with ≤10 cards shows row of card backs
- [ ] All 52 cards are unique across all hands (no duplicates)
- [ ] Card images load correctly from playing-cards assets
