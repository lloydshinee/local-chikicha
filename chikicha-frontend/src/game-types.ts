export type ComboType =
  | 'SINGLE'
  | 'PAIR'
  | 'THREE'
  | 'TWO_PAIR'
  | 'FOUR'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'STRAIGHT_FLUSH';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Combo {
  type: ComboType;
  primaryRank: Rank;
  primarySuit: Suit;
  cards: Card[];
}

export const MAX_PLAYERS = 5;
