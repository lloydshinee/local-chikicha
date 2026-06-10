import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComboValidator, COMBO_LABELS } from './useComboValidator';
import type { Card } from '../types';
import type { Suit, Rank } from '../game-types';
import { detectCombo } from '../rules';

function c(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

const hand: Card[] = [
  c('diamonds', '3'),
  c('spades', 'A'),
  c('hearts', 'A'),
  c('clubs', '5'),
  c('diamonds', '5'),
  c('hearts', '7'),
  c('spades', '7'),
  c('diamonds', '7'),
];

describe('COMBO_LABELS', () => {
  it('has labels for all combo types', () => {
    expect(COMBO_LABELS.SINGLE).toBe('Single');
    expect(COMBO_LABELS.PAIR).toBe('Pair');
    expect(COMBO_LABELS.THREE).toBe('Three of a Kind');
    expect(COMBO_LABELS.STRAIGHT).toBe('Straight');
    expect(COMBO_LABELS.FLUSH).toBe('Flush');
    expect(COMBO_LABELS.FULL_HOUSE).toBe('Full House');
    expect(COMBO_LABELS.FOUR).toBe('Four of a Kind');
    expect(COMBO_LABELS.STRAIGHT_FLUSH).toBe('Straight Flush');
    expect(COMBO_LABELS.TWO_PAIR).toBe('Two Pair');
  });
});

describe('useComboValidator', () => {
  it('returns canPlay=false when no cards are selected', () => {
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set(),
        hand,
        currentTopCombo: null,
      })
    );
    expect(result.current.canPlay).toBe(false);
    expect(result.current.validationMessage).toBeNull();
    expect(result.current.selectedCombo).toBeNull();
    expect(result.current.selectedCards).toEqual([]);
  });

  it('detects a valid single card', () => {
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([0]),
        hand,
        currentTopCombo: null,
      })
    );
    expect(result.current.selectedCombo?.type).toBe('SINGLE');
    expect(result.current.canPlay).toBe(true);
    expect(result.current.validationMessage).toBeNull();
  });

  it('detects a valid pair', () => {
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([1, 2]),
        hand,
        currentTopCombo: null,
      })
    );
    expect(result.current.selectedCombo?.type).toBe('PAIR');
    expect(result.current.canPlay).toBe(true);
  });

  it('returns canPlay=false for invalid combination', () => {
    const hand2: Card[] = [c('diamonds', '3'), c('hearts', 'K'), c('spades', '7')];
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([0, 1]),
        hand: hand2,
        currentTopCombo: null,
      })
    );
    expect(result.current.canPlay).toBe(false);
    expect(result.current.validationMessage).toBe('Invalid combination');
  });

  it('allows play when no currentTopCombo is set', () => {
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([0]),
        hand,
        currentTopCombo: null,
      })
    );
    expect(result.current.canPlay).toBe(true);
  });

  it('blocks play when selected combo cannot beat currentTopCombo', () => {
    const topCombo = detectCombo([c('spades', 'K')]);
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([0]),
        hand,
        currentTopCombo: topCombo,
      })
    );
    expect(result.current.canPlay).toBe(false);
    expect(result.current.validationMessage).toBe('Must beat Single');
  });

  it('allows play when selected combo beats currentTopCombo', () => {
    const topCombo = detectCombo([c('hearts', '4')]);
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([1]),
        hand,
        currentTopCombo: topCombo,
      })
    );
    expect(result.current.canPlay).toBe(true);
    expect(result.current.validationMessage).toBeNull();
  });

  it('updates when selectedIndices changes', () => {
    const { result, rerender } = renderHook(
      ({ indices }) =>
        useComboValidator({
          selectedIndices: indices,
          hand,
          currentTopCombo: null,
        }),
      { initialProps: { indices: new Set<number>() } }
    );

    expect(result.current.canPlay).toBe(false);

    rerender({ indices: new Set([0]) });
    expect(result.current.canPlay).toBe(true);
  });

  it('shows correct combo label in validation message for pair', () => {
    const topCombo = detectCombo([c('spades', 'K'), c('hearts', 'K')]);
    const { result } = renderHook(() =>
      useComboValidator({
        selectedIndices: new Set([3, 4]),
        hand,
        currentTopCombo: topCombo,
      })
    );
    expect(result.current.validationMessage).toBe('Must beat Pair');
  });
});
