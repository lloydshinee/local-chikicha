import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards, cardImagePath, cardBackPath } from './game';

describe('game utilities', () => {
  it('creates a deck of 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('creates unique cards', () => {
    const deck = createDeck();
    const keys = deck.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('shuffles without losing cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    const sortedOriginal = deck.map((c) => `${c.suit}-${c.rank}`).sort();
    const sortedShuffled = shuffled.map((c) => `${c.suit}-${c.rank}`).sort();
    expect(sortedShuffled).toEqual(sortedOriginal);
  });

  it('deals cards evenly for 4 players', () => {
    const deck = createDeck();
    const hands = dealCards(deck, 4);
    expect(hands).toHaveLength(4);
    expect(hands[0]).toHaveLength(13);
    expect(hands[1]).toHaveLength(13);
    expect(hands[2]).toHaveLength(13);
    expect(hands[3]).toHaveLength(13);
  });

  it('deals all cards without duplicates across hands', () => {
    const deck = createDeck();
    const hands = dealCards(deck, 4);
    const allCards = hands.flat();
    const allKeys = allCards.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(allKeys).size).toBe(52);
  });

  it('deals for 3 players', () => {
    const deck = createDeck();
    const hands = dealCards(deck, 3);
    expect(hands[0].length).toBeGreaterThan(hands[1].length);
    expect(hands.flat()).toHaveLength(52);
  });

  it('generates correct card image path', () => {
    expect(cardImagePath({ suit: 'spades', rank: 'A' })).toBe('/cards/spades_A.png');
    expect(cardImagePath({ suit: 'hearts', rank: '10' })).toBe('/cards/hearts_10.png');
  });

  it('generates card back path', () => {
    expect(cardBackPath()).toBe('/cards/back_light.png');
  });
});
