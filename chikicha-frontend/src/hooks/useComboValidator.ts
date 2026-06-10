import { useMemo } from 'react';
import { detectCombo, canBeat } from '../rules';
import type { ComboType } from '../rules';
import type { Card } from '../types';

export const COMBO_LABELS: Record<ComboType, string> = {
  SINGLE: 'Single',
  PAIR: 'Pair',
  THREE: 'Three of a Kind',
  TWO_PAIR: 'Two Pair',
  STRAIGHT: 'Straight',
  FLUSH: 'Flush',
  FULL_HOUSE: 'Full House',
  FOUR: 'Four of a Kind',
  STRAIGHT_FLUSH: 'Straight Flush',
};

interface UseComboValidatorInput {
  selectedIndices: Set<number>;
  hand: Card[];
  currentTopCombo: ReturnType<typeof detectCombo>;
}

export function useComboValidator({ selectedIndices, hand, currentTopCombo }: UseComboValidatorInput) {
  const selectedCards = useMemo(() => {
    return Array.from(selectedIndices).sort((a, b) => a - b).map((i) => hand[i]).filter(Boolean);
  }, [selectedIndices, hand]);

  const selectedCombo = useMemo(() => {
    if (selectedCards.length === 0) return null;
    return detectCombo(selectedCards);
  }, [selectedCards]);

  const canPlay = useMemo(() => {
    if (selectedIndices.size === 0) return false;
    if (!selectedCombo) return false;
    if (!currentTopCombo) return true;
    return canBeat(selectedCombo, currentTopCombo);
  }, [selectedIndices, selectedCombo, currentTopCombo]);

  const validationMessage = useMemo(() => {
    if (selectedIndices.size === 0) return null;
    if (!selectedCombo) return 'Invalid combination';
    if (currentTopCombo && !canBeat(selectedCombo, currentTopCombo)) {
      const topLabel = COMBO_LABELS[currentTopCombo.type];
      return `Must beat ${topLabel}`;
    }
    return null;
  }, [selectedIndices, selectedCombo, currentTopCombo]);

  return { selectedCards, selectedCombo, canPlay, validationMessage };
}
