import { describe, it, expect } from 'vitest';
import {
  getRankValue,
  getSuitValue,
  compareCards,
  detectCombo,
  canBeat,
  hasThreeOfDiamonds,
} from './rules';
import type { Card } from './game';

function c(suit: Card['suit'], rank: Card['rank']): Card {
  return { suit, rank };
}

describe('getRankValue', () => {
  it('returns 0 for 3 and 12 for 2', () => {
    expect(getRankValue('3')).toBe(0);
    expect(getRankValue('2')).toBe(12);
  });

  it('returns increasing values for common ranks', () => {
    expect(getRankValue('4')).toBe(1);
    expect(getRankValue('10')).toBe(7);
    expect(getRankValue('A')).toBe(11);
  });
});

describe('getSuitValue', () => {
  it('returns correct suit ordering: diamonds < clubs < hearts < spades', () => {
    expect(getSuitValue('diamonds')).toBe(0);
    expect(getSuitValue('clubs')).toBe(1);
    expect(getSuitValue('hearts')).toBe(2);
    expect(getSuitValue('spades')).toBe(3);
  });
});

describe('compareCards', () => {
  it('compares by rank first', () => {
    expect(compareCards(c('hearts', '5'), c('spades', '3'))).toBeGreaterThan(0);
    expect(compareCards(c('diamonds', '3'), c('clubs', '5'))).toBeLessThan(0);
  });

  it('compares by suit when ranks are equal', () => {
    expect(compareCards(c('spades', 'K'), c('hearts', 'K'))).toBeGreaterThan(0);
    expect(compareCards(c('diamonds', 'K'), c('clubs', 'K'))).toBeLessThan(0);
  });

  it('returns 0 for identical cards', () => {
    expect(compareCards(c('hearts', 'A'), c('hearts', 'A'))).toBe(0);
  });
});

describe('detectCombo', () => {
  describe('SINGLE', () => {
    it('detects a single card', () => {
      const combo = detectCombo([c('spades', 'A')]);
      expect(combo?.type).toBe('SINGLE');
      expect(combo?.primaryRank).toBe('A');
    });
  });

  describe('PAIR', () => {
    it('detects two cards of same rank', () => {
      const combo = detectCombo([c('hearts', '7'), c('spades', '7')]);
      expect(combo?.type).toBe('PAIR');
      expect(combo?.primaryRank).toBe('7');
    });

    it('uses highest suit as primary suit', () => {
      const combo = detectCombo([c('diamonds', '7'), c('spades', '7')]);
      expect(combo?.primarySuit).toBe('spades');
    });

    it('returns null for two different ranks', () => {
      expect(detectCombo([c('hearts', '7'), c('spades', '8')])).toBeNull();
    });
  });

  describe('THREE', () => {
    it('detects three of a kind', () => {
      const combo = detectCombo([
        c('hearts', 'J'),
        c('diamonds', 'J'),
        c('spades', 'J'),
      ]);
      expect(combo?.type).toBe('THREE');
      expect(combo?.primaryRank).toBe('J');
    });

    it('returns null for three different ranks', () => {
      expect(detectCombo([
        c('hearts', '3'),
        c('diamonds', '5'),
        c('spades', '7'),
      ])).toBeNull();
    });

    it('returns null for a pair plus a single', () => {
      expect(detectCombo([
        c('hearts', '3'),
        c('diamonds', '3'),
        c('spades', '7'),
      ])).toBeNull();
    });
  });

  describe('STRAIGHT', () => {
    it('detects a normal straight (3-4-5-6-7)', () => {
      const combo = detectCombo([
        c('hearts', '3'),
        c('diamonds', '4'),
        c('clubs', '5'),
        c('spades', '6'),
        c('hearts', '7'),
      ]);
      expect(combo?.type).toBe('STRAIGHT');
      expect(combo?.primaryRank).toBe('7');
    });

    it('detects 10-J-Q-K-A straight', () => {
      const combo = detectCombo([
        c('hearts', '10'),
        c('diamonds', 'J'),
        c('clubs', 'Q'),
        c('spades', 'K'),
        c('hearts', 'A'),
      ]);
      expect(combo?.type).toBe('STRAIGHT');
      expect(combo?.primaryRank).toBe('A');
    });

    it('detects wrap straight J-Q-K-A-2', () => {
      const combo = detectCombo([
        c('hearts', 'J'),
        c('diamonds', 'Q'),
        c('clubs', 'K'),
        c('spades', 'A'),
        c('hearts', '2'),
      ]);
      expect(combo?.type).toBe('STRAIGHT');
      expect(combo?.primaryRank).toBe('2');
    });

    it('detects wrap straight A-2-3-4-5', () => {
      const combo = detectCombo([
        c('hearts', 'A'),
        c('diamonds', '2'),
        c('clubs', '3'),
        c('spades', '4'),
        c('hearts', '5'),
      ]);
      expect(combo?.type).toBe('STRAIGHT');
      expect(combo?.primaryRank).toBe('2');
    });

    it('returns null for non-sequential 5 cards', () => {
      expect(detectCombo([
        c('hearts', '3'),
        c('diamonds', '5'),
        c('clubs', '7'),
        c('spades', '9'),
        c('hearts', 'J'),
      ])).toBeNull();
    });
  });

  describe('FLUSH', () => {
    it('detects 5 cards of same suit', () => {
      const combo = detectCombo([
        c('hearts', '3'),
        c('hearts', '5'),
        c('hearts', '7'),
        c('hearts', '9'),
        c('hearts', 'K'),
      ]);
      expect(combo?.type).toBe('FLUSH');
      expect(combo?.primaryRank).toBe('K');
    });

    it('returns null for non-flush 5 cards', () => {
      expect(detectCombo([
        c('hearts', '3'),
        c('hearts', '5'),
        c('hearts', '7'),
        c('hearts', '9'),
        c('spades', 'K'),
      ])).toBeNull();
    });
  });

  describe('FULL_HOUSE', () => {
    it('detects full house (3+2)', () => {
      const combo = detectCombo([
        c('hearts', 'Q'),
        c('diamonds', 'Q'),
        c('spades', 'Q'),
        c('hearts', '7'),
        c('clubs', '7'),
      ]);
      expect(combo?.type).toBe('FULL_HOUSE');
      expect(combo?.primaryRank).toBe('Q');
    });

    it('returns null for 3+1+1', () => {
      expect(detectCombo([
        c('hearts', 'Q'),
        c('diamonds', 'Q'),
        c('spades', 'Q'),
        c('hearts', '7'),
        c('clubs', '8'),
      ])).toBeNull();
    });
  });

  describe('FOUR', () => {
    it('detects four of a kind with kicker', () => {
      const combo = detectCombo([
        c('hearts', '8'),
        c('diamonds', '8'),
        c('clubs', '8'),
        c('spades', '8'),
        c('hearts', '3'),
      ]);
      expect(combo?.type).toBe('FOUR');
      expect(combo?.primaryRank).toBe('8');
    });

    it('returns null for duplicated ranks that are not 4+1', () => {
      expect(detectCombo([
        c('hearts', '8'),
        c('diamonds', '8'),
        c('clubs', '8'),
        c('spades', '8'),
        c('hearts', '8'),
      ])).toBeNull();
    });
  });

  describe('STRAIGHT_FLUSH', () => {
    it('detects straight flush over four of a kind', () => {
      const combo = detectCombo([
        c('spades', '3'),
        c('spades', '4'),
        c('spades', '5'),
        c('spades', '6'),
        c('spades', '7'),
      ]);
      expect(combo?.type).toBe('STRAIGHT_FLUSH');
      expect(combo?.primaryRank).toBe('7');
    });

    it('returns straight flush for wrap same-suit', () => {
      const combo = detectCombo([
        c('clubs', 'A'),
        c('clubs', '2'),
        c('clubs', '3'),
        c('clubs', '4'),
        c('clubs', '5'),
      ]);
      expect(combo?.type).toBe('STRAIGHT_FLUSH');
    });
  });

  describe('invalid combos', () => {
    it('returns null for 0 cards', () => {
      expect(detectCombo([])).toBeNull();
    });

    it('returns null for 4 cards', () => {
      expect(detectCombo([
        c('hearts', '3'),
        c('diamonds', '4'),
        c('clubs', '5'),
        c('spades', '6'),
      ])).toBeNull();
    });
  });
});

describe('canBeat', () => {
  it('returns true when same type with higher rank', () => {
    const a = detectCombo([c('hearts', 'K')])!;
    const b = detectCombo([c('diamonds', '5')])!;
    expect(canBeat(a, b)).toBe(true);
  });

  it('returns false when same type with lower rank', () => {
    const a = detectCombo([c('diamonds', '5')])!;
    const b = detectCombo([c('hearts', 'K')])!;
    expect(canBeat(a, b)).toBe(false);
  });

  it('returns true for same rank, higher suit', () => {
    const a = detectCombo([c('spades', 'A')])!;
    const b = detectCombo([c('hearts', 'A')])!;
    expect(canBeat(a, b)).toBe(true);
  });

  it('returns false for same rank, lower suit', () => {
    const a = detectCombo([c('hearts', 'A')])!;
    const b = detectCombo([c('spades', 'A')])!;
    expect(canBeat(a, b)).toBe(false);
  });

  it('returns false for different types', () => {
    const pair = detectCombo([c('hearts', 'A'), c('spades', 'A')])!;
    const single = detectCombo([c('spades', '2')])!;
    expect(canBeat(pair, single)).toBe(false);
    expect(canBeat(single, pair)).toBe(false);
  });

  describe('bomb rule', () => {
    it('four of a kind beats single 2', () => {
      const four = detectCombo([
        c('hearts', '3'),
        c('diamonds', '3'),
        c('clubs', '3'),
        c('spades', '3'),
        c('hearts', '4'),
      ])!;
      const single2 = detectCombo([c('spades', '2')])!;
      expect(canBeat(four, single2)).toBe(true);
    });

    it('four of a kind does not beat pair of 2s', () => {
      const four = detectCombo([
        c('hearts', '3'),
        c('diamonds', '3'),
        c('clubs', '3'),
        c('spades', '3'),
        c('hearts', '4'),
      ])!;
      const pair2 = detectCombo([c('hearts', '2'), c('spades', '2')])!;
      expect(canBeat(four, pair2)).toBe(false);
    });

    it('four of a kind does not beat single non-2', () => {
      const four = detectCombo([
        c('hearts', '3'),
        c('diamonds', '3'),
        c('clubs', '3'),
        c('spades', '3'),
        c('hearts', '4'),
      ])!;
      const singleA = detectCombo([c('spades', 'A')])!;
      expect(canBeat(four, singleA)).toBe(false);
    });
  });

  describe('pair comparison', () => {
    it('higher rank pair beats lower rank pair', () => {
      const high = detectCombo([c('diamonds', '10'), c('clubs', '10')])!;
      const low = detectCombo([c('hearts', '5'), c('spades', '5')])!;
      expect(canBeat(high, low)).toBe(true);
    });
  });

  describe('straight comparison', () => {
    it('J-Q-K-A-2 beats 10-J-Q-K-A', () => {
      const high = detectCombo([
        c('hearts', 'J'), c('diamonds', 'Q'), c('clubs', 'K'), c('spades', 'A'), c('hearts', '2'),
      ])!;
      const low = detectCombo([
        c('hearts', '10'), c('diamonds', 'J'), c('clubs', 'Q'), c('spades', 'K'), c('hearts', 'A'),
      ])!;
      expect(canBeat(high, low)).toBe(true);
    });
  });

  describe('full house comparison', () => {
    it('compares by the three-of-a-kind rank', () => {
      const high = detectCombo([
        c('hearts', 'K'), c('diamonds', 'K'), c('spades', 'K'), c('clubs', '3'), c('hearts', '3'),
      ])!;
      const low = detectCombo([
        c('hearts', 'Q'), c('diamonds', 'Q'), c('spades', 'Q'), c('clubs', 'A'), c('hearts', 'A'),
      ])!;
      expect(canBeat(high, low)).toBe(true);
    });
  });
});

describe('hasThreeOfDiamonds', () => {
  it('returns true when 3♦ is present', () => {
    expect(hasThreeOfDiamonds([c('diamonds', '3'), c('hearts', 'K')])).toBe(true);
  });

  it('returns false when 3♦ is not present', () => {
    expect(hasThreeOfDiamonds([c('hearts', '3'), c('clubs', 'K')])).toBe(false);
  });
});
