import type { Card, Suit, Rank, ComboType, Combo } from './game';

export type { ComboType, Combo };

export const RANK_ORDER: Rank[] = [
  '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2',
];

export const SUIT_ORDER: Suit[] = [
  'diamonds', 'clubs', 'hearts', 'spades',
];

export function getRankValue(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function getSuitValue(suit: Suit): number {
  return SUIT_ORDER.indexOf(suit);
}

export function compareCards(a: Card, b: Card): number {
  const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
  if (rankDiff !== 0) return rankDiff;
  return getSuitValue(a.suit) - getSuitValue(b.suit);
}

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

function highestCard(cards: Card[]): { rank: Rank; suit: Suit } {
  let best = cards[0];
  for (let i = 1; i < cards.length; i++) {
    if (compareCards(cards[i], best) > 0) {
      best = cards[i];
    }
  }
  return { rank: best.rank, suit: best.suit };
}

function countByRank(cards: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const card of cards) {
    const list = map.get(card.rank) || [];
    list.push(card);
    map.set(card.rank, list);
  }
  return map;
}

function isStraight(rankValues: number[]): boolean {
  if (rankValues.length !== 5) return false;
  const sorted = [...rankValues].sort((a, b) => a - b);

  // Non-wrapping straights: 3-4-5-6-7 (start 0) through 10-J-Q-K-A (start 7)
  for (let start = 0; start <= 7; start++) {
    const pattern = [start, start + 1, start + 2, start + 3, start + 4];
    if (sorted.every((v, i) => v === pattern[i])) {
      return true;
    }
  }

  // Wheel: A-2-3-4-5 (rank values 11,12,0,1,2 → sorted 0,1,2,11,12)
  const wheel = [0, 1, 2, 11, 12];
  if (sorted.every((v, i) => v === wheel[i])) {
    return true;
  }

  return false;
}

function isWheel(rankValues: number[]): boolean {
  const sorted = [...rankValues].sort((a, b) => a - b);
  const wheel = [0, 1, 2, 11, 12];
  return sorted.length === 5 && sorted.every((v, i) => v === wheel[i]);
}

function straightPrimary(cards: Card[]): { rank: Rank; suit: Suit } {
  const rankValues = cards.map((c) => getRankValue(c.rank));
  if (isWheel(rankValues)) {
    const five = cards.find((c) => c.rank === '5')!;
    return { rank: five.rank, suit: five.suit };
  }
  return highestCard(cards);
}

export function detectCombo(cards: Card[]): Combo | null {
  const n = cards.length;

  if (n === 1) {
    return { type: 'SINGLE', primaryRank: cards[0].rank, primarySuit: cards[0].suit, cards };
  }

  const rankGroups = countByRank(cards);
  const groupSizes = Array.from(rankGroups.values()).map((g) => g.length);

  if (n === 2) {
    if (groupSizes.length === 1 && groupSizes[0] === 2) {
      const primary = highestCard(cards);
      return { type: 'PAIR', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }
    return null;
  }

  if (n === 3) {
    if (groupSizes.length === 1 && groupSizes[0] === 3) {
      const primary = highestCard(cards);
      return { type: 'THREE', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }
    return null;
  }

  if (n === 4) {
    const sizes = [...groupSizes].sort((a, b) => b - a);

    if (sizes[0] === 4) {
      const fourRank = Array.from(rankGroups.entries()).find(([, g]) => g.length === 4)![0];
      const fourCards = rankGroups.get(fourRank)!;
      const primary = highestCard(fourCards);
      return { type: 'FOUR', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (sizes[0] === 2 && sizes[1] === 2) {
      const ranks = Array.from(rankGroups.keys());
      const rankVals = ranks.map((r) => getRankValue(r)).sort((a, b) => a - b);
      // Sequential ranks required; disallow Two Pair involving 2 as higher rank (A-A-2-2)
      if (rankVals[1] - rankVals[0] === 1 && rankVals[1] !== getRankValue('2')) {
        const higherRank = RANK_ORDER[rankVals[1]];
        const higherCards = rankGroups.get(higherRank)!;
        const primary = highestCard(higherCards);
        return { type: 'TWO_PAIR', primaryRank: primary.rank, primarySuit: primary.suit, cards };
      }
    }

    return null;
  }

  if (n === 5) {
    const sizes = [...groupSizes].sort((a, b) => b - a);
    const allSameSuit = new Set(cards.map((c) => c.suit)).size === 1;
    const rankValues = cards.map((c) => getRankValue(c.rank));
    const straight = isStraight(rankValues);

    if (straight && allSameSuit) {
      const primary = straightPrimary(cards);
      return { type: 'STRAIGHT_FLUSH', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (sizes[0] === 3 && sizes[1] === 2) {
      const threeRank = Array.from(rankGroups.entries()).find(([, g]) => g.length === 3)![0];
      const threeCards = rankGroups.get(threeRank)!;
      const primary = highestCard(threeCards);
      return { type: 'FULL_HOUSE', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (straight) {
      const primary = straightPrimary(cards);
      return { type: 'STRAIGHT', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (allSameSuit) {
      const primary = highestCard(cards);
      return { type: 'FLUSH', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    return null;
  }

  return null;
}

export function canBeat(newCombo: Combo, currentCombo: Combo): boolean {
  const isBomb = (t: ComboType) => t === 'FOUR' || t === 'STRAIGHT_FLUSH';

  if (isBomb(newCombo.type) && isBomb(currentCombo.type)) {
    if (newCombo.type !== currentCombo.type) {
      return newCombo.type === 'STRAIGHT_FLUSH';
    }
    const rankDiff = getRankValue(newCombo.primaryRank) - getRankValue(currentCombo.primaryRank);
    if (rankDiff > 0) return true;
    if (rankDiff < 0) return false;
    return getSuitValue(newCombo.primarySuit) > getSuitValue(currentCombo.primarySuit);
  }

  if (isBomb(newCombo.type)) return true;

  if (newCombo.type !== currentCombo.type) return false;

  if (newCombo.type === 'TWO_PAIR') {
    const newHigh = getRankValue(newCombo.primaryRank);
    const newLow = newHigh - 1;
    const curHigh = getRankValue(currentCombo.primaryRank);
    const curLow = curHigh - 1;
    if (newHigh > curHigh) return true;
    if (newHigh < curHigh) return false;
    if (newLow > curLow) return true;
    if (newLow < curLow) return false;
    return getSuitValue(newCombo.primarySuit) > getSuitValue(currentCombo.primarySuit);
  }

  const rankDiff = getRankValue(newCombo.primaryRank) - getRankValue(currentCombo.primaryRank);
  if (rankDiff > 0) return true;
  if (rankDiff < 0) return false;

  return getSuitValue(newCombo.primarySuit) > getSuitValue(currentCombo.primarySuit);
}

export function hasThreeOfDiamonds(cards: Card[]): boolean {
  return cards.some((c) => c.suit === 'diamonds' && c.rank === '3');
}
