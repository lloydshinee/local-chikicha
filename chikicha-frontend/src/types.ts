import type { Suit, Rank, Card, GamePhase } from './game-types';

export type { Suit, Rank, Card, GamePhase };

export const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#F97316'];

export interface LobbyPlayer {
  id: string;
  username: string;
  color: string;
  ready: boolean;
}

export interface LobbySpectator {
  id: string;
  username: string;
}

export interface LobbyUpdateData {
  players: LobbyPlayer[];
  spectators: LobbySpectator[];
}

export interface GamePlayer {
  id: string;
  username: string;
  color: string;
  cardCount: number;
}

export interface GameStartData {
  hand: Card[];
  players: GamePlayer[];
  currentTurnPlayerId?: string;
}

export interface SpectateData {
  players: GamePlayer[];
  pile: { playerId: string; cards: Card[] }[];
  currentTurnPlayerId?: string;
}

export interface CardDroppedData {
  playerId: string;
  cards: Card[];
  comboType?: string;
}

export interface CardPassedData {
  playerId: string;
}

export interface CardArrangedData {
  playerId: string;
  fromIndex: number;
  toIndex: number;
}

export interface PlayerLeftData {
  playerId: string;
}

export interface CountdownData {
  seconds: number;
}

export interface TurnChangeData {
  playerId: string;
  isNewRound?: boolean;
  currentCombo?: { type: string; primaryRank: string; primarySuit: string } | null;
}

export interface FinishOrderEntry {
  position: number;
  playerId: string;
  username: string;
  color: string;
}

export interface GameOverData {
  loserId: string;
  loserUsername: string;
  cards: Card[];
  loserColor?: string;
  finishOrder?: FinishOrderEntry[];
}

export function cardImagePath(card: Card): string {
  return `/cards/${card.suit}_${card.rank}.png`;
}

export function cardBackPath(): string {
  return '/cards/back_light.png';
}
