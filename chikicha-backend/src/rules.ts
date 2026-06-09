import type { Card, Suit, Rank } from './game';

export type ComboType =
  | 'SINGLE'
  | 'PAIR'
  | 'THREE'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'FOUR'
  | 'STRAIGHT_FLUSH';

export interface Combo {
  type: ComboType;
  primaryRank: Rank;
  primarySuit: Suit;
  cards: Card[];
}

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
  const sorted = [...rankValues].sort((a, b) => a - b);
  for (let start = 0; start < 13; start++) {
    const pattern = [
      start,
      (start + 1) % 13,
      (start + 2) % 13,
      (start + 3) % 13,
      (start + 4) % 13,
    ].sort((a, b) => a - b);
    if (sorted.length === 5 && sorted.every((v, i) => v === pattern[i])) {
      return true;
    }
  }
  return false;
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

  if (n === 5) {
    const sizes = [...groupSizes].sort((a, b) => b - a);
    const allSameSuit = new Set(cards.map((c) => c.suit)).size === 1;
    const rankValues = cards.map((c) => getRankValue(c.rank));
    const straight = isStraight(rankValues);

    if (straight && allSameSuit) {
      const primary = highestCard(cards);
      return { type: 'STRAIGHT_FLUSH', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (sizes[0] === 4 && sizes[1] === 1) {
      const fourRank = Array.from(rankGroups.entries()).find(([, g]) => g.length === 4)![0];
      const fourCards = rankGroups.get(fourRank)!;
      const primary = highestCard(fourCards);
      return { type: 'FOUR', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (sizes[0] === 3 && sizes[1] === 2) {
      const threeRank = Array.from(rankGroups.entries()).find(([, g]) => g.length === 3)![0];
      const threeCards = rankGroups.get(threeRank)!;
      const primary = highestCard(threeCards);
      return { type: 'FULL_HOUSE', primaryRank: primary.rank, primarySuit: primary.suit, cards };
    }

    if (straight) {
      const primary = highestCard(cards);
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
  if (newCombo.type === 'FOUR' && currentCombo.type === 'SINGLE' && currentCombo.primaryRank === '2') {
    return true;
  }

  if (newCombo.type !== currentCombo.type) {
    return false;
  }

  const rankDiff = getRankValue(newCombo.primaryRank) - getRankValue(currentCombo.primaryRank);
  if (rankDiff > 0) return true;
  if (rankDiff < 0) return false;

  return getSuitValue(newCombo.primarySuit) > getSuitValue(currentCombo.primarySuit);
}

export function hasThreeOfDiamonds(cards: Card[]): boolean {
  return cards.some((c) => c.suit === 'diamonds' && c.rank === '3');
}
