export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type GamePhase = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'GAME_OVER';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  username: string;
  color: string;
  ready: boolean;
  cards: Card[];
}

export interface Spectator {
  id: string;
  username: string;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  spectators: Spectator[];
  pile: { playerId: string; cards: Card[] }[];
  lastDropPlayerId: string | null;
  countdownTimer: ReturnType<typeof setTimeout> | null;
  gameOverTimer: ReturnType<typeof setTimeout> | null;
  currentTurnIndex: number;
}

export const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
export const MAX_PLAYERS = 4;

export function createCard(suit: Suit, rank: Rank): Card {
  return { suit, rank };
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numPlayers: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  return hands;
}

export function cardImagePath(card: Card): string {
  return `/cards/${card.suit}_${card.rank}.png`;
}

export function cardBackPath(): string {
  return '/cards/back_light.png';
}
