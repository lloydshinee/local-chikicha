import type { Card, GameState, Player } from './game';
import { MAX_PLAYERS, PLAYER_COLORS } from './game';
import type { Combo } from './rules';
import { sortHand, hasThreeOfDiamonds } from './rules';

export type TableEffect =
  | { type: 'BROADCAST_LOBBY'; players: PlayerSummary[]; spectators: SpectatorSummary[]; socketId?: string }
  | { type: 'GAME_START'; perPlayer: PerPlayerGameStart[] }
  | { type: 'SPECTATE'; players: OpponentSummary[]; pile: PileEntry[]; currentTurnPlayerId?: string; socketId?: string }
  | { type: 'TURN_CHANGE'; playerId: string; isNewRound: boolean; currentCombo: ComboSummary | null }
  | { type: 'CARD_DROPPED'; playerId: string; cards: Card[]; comboType: string; isFirstPlay: boolean }
  | { type: 'CARD_PASSED'; playerId: string }
  | { type: 'CARD_ARRANGED'; playerId: string; fromIndex: number; toIndex: number }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'GAME_OVER'; loserId: string; loserUsername: string; cards: Card[]; loserColor: string; finishOrder: FinishEntry[] }
  | { type: 'START_GAME_OVER_TIMER' }
  | { type: 'START_COUNTDOWN' }
  | { type: 'ABORT_COUNTDOWN' };

export interface PlayerSummary {
  id: string;
  username: string;
  color: string;
  ready: boolean;
}

export interface SpectatorSummary {
  id: string;
  username: string;
}

export interface OpponentSummary {
  id: string;
  username: string;
  color: string;
  cardCount: number;
}

export interface ComboSummary {
  type: string;
  primaryRank: string;
  primarySuit: string;
}

export interface FinishEntry {
  position: number;
  playerId: string;
  username: string;
  color: string;
}

export interface PileEntry {
  playerId: string;
  cards: Card[];
}

export interface PerPlayerGameStart {
  playerId: string;
  hand: Card[];
  players: OpponentSummary[];
  myColor: string;
  currentTurnPlayerId: string;
}

function getActivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.cards.length > 0);
}

function finishEntry(player: Player, position: number): FinishEntry {
  return {
    position,
    playerId: player.id,
    username: player.username,
    color: player.color,
  };
}

function playerSummaries(state: GameState): PlayerSummary[] {
  return state.players.map((p) => ({
    id: p.id,
    username: p.username,
    color: p.color,
    ready: p.ready,
  }));
}

function spectatorSummaries(state: GameState): SpectatorSummary[] {
  return state.spectators.map((s) => ({
    id: s.id,
    username: s.username,
  }));
}

function opponentSummaries(state: GameState, excludeId: string): OpponentSummary[] {
  return state.players
    .filter((p) => p.id !== excludeId)
    .map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      cardCount: p.cards.length,
    }));
}

function allOpponentSummaries(state: GameState): OpponentSummary[] {
  return state.players.map((p) => ({
    id: p.id,
    username: p.username,
    color: p.color,
    cardCount: p.cards.length,
  }));
}

function comboSummary(combo: Combo | null): ComboSummary | null {
  if (!combo) return null;
  return {
    type: combo.type,
    primaryRank: combo.primaryRank,
    primarySuit: combo.primarySuit,
  };
}

function findThreeOfDiamonds(players: Player[]): number {
  for (let i = 0; i < players.length; i++) {
    if (players[i].cards.some((c) => c.suit === 'diamonds' && c.rank === '3')) {
      return i;
    }
  }
  return Math.floor(Math.random() * players.length);
}

function advanceTurn(state: GameState): TableEffect[] {
  const active = getActivePlayers(state);
  if (active.length === 0) return [];

  const currentPlayerId = state.players[state.currentTurnIndex]?.id;
  let currentIdx = active.findIndex((p) => p.id === currentPlayerId);

  if (currentIdx === -1) {
    for (let i = state.currentTurnIndex + 1; i < state.players.length; i++) {
      const idx = active.findIndex((p) => p.id === state.players[i].id);
      if (idx !== -1) { currentIdx = idx - 1; break; }
    }
    if (currentIdx === -1) currentIdx = active.length - 1;
  }

  const nextPlayer = active[(currentIdx + 1) % active.length];
  state.currentTurnIndex = state.players.findIndex((p) => p.id === nextPlayer.id);

  const isNewRound = state.currentTopCombo === null;
  return [{
    type: 'TURN_CHANGE',
    playerId: nextPlayer.id,
    isNewRound,
    currentCombo: comboSummary(state.currentTopCombo),
  }];
}

function checkGameOver(state: GameState): TableEffect[] {
  if (state.phase !== 'PLAYING') return [];
  const playersWithCards = state.players.filter((p) => p.cards.length > 0);
  if (playersWithCards.length !== 1) return [];

  const loser = playersWithCards[0];

  state.finishOrder.push(finishEntry(loser, state.finishOrder.length + 1));
  state.phase = 'GAME_OVER';

  return [
    {
      type: 'GAME_OVER',
      loserId: loser.id,
      loserUsername: loser.username,
      cards: loser.cards,
      loserColor: loser.color,
      finishOrder: state.finishOrder.map((f) => ({ ...f })),
    },
    { type: 'START_GAME_OVER_TIMER' },
  ];
}

export function handleJoin(state: GameState, playerId: string, username: string): TableEffect[] {
  const effects: TableEffect[] = [];

  const isActivePlayer = state.players.length < MAX_PLAYERS && state.phase === 'LOBBY';

  if (isActivePlayer) {
    const color = PLAYER_COLORS[state.players.length];
    state.players.push({
      id: playerId,
      username,
      color,
      ready: false,
      cards: [],
    });
  } else {
    state.spectators.push({ id: playerId, username });

    if (state.phase === 'PLAYING' || state.phase === 'GAME_OVER') {
      effects.push({
        type: 'SPECTATE',
        players: allOpponentSummaries(state),
        pile: state.pile.map((p) => ({ playerId: p.playerId, cards: p.cards })),
        currentTurnPlayerId: state.phase === 'PLAYING'
          ? state.players[state.currentTurnIndex]?.id
          : undefined,
        socketId: playerId,
      });
    }
  }

  const isSpectatorMidGame = !isActivePlayer && (state.phase === 'PLAYING' || state.phase === 'GAME_OVER');

  effects.push({
    type: 'BROADCAST_LOBBY',
    players: playerSummaries(state),
    spectators: spectatorSummaries(state),
    socketId: isSpectatorMidGame ? playerId : undefined,
  });

  return effects;
}

export function handleReady(state: GameState, playerId: string, ready: boolean): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'LOBBY' && state.phase !== 'COUNTDOWN') return effects;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return effects;

  player.ready = ready;

  if (state.phase === 'COUNTDOWN' && !player.ready) {
    effects.push({ type: 'ABORT_COUNTDOWN' });
    effects.push({
      type: 'BROADCAST_LOBBY',
      players: playerSummaries(state),
      spectators: spectatorSummaries(state),
    });
    return effects;
  }

  effects.push({
    type: 'BROADCAST_LOBBY',
    players: playerSummaries(state),
    spectators: spectatorSummaries(state),
  });

  if (
    state.phase === 'LOBBY' &&
    state.players.length >= 2 &&
    state.players.length <= MAX_PLAYERS &&
    state.players.every((p) => p.ready)
  ) {
    effects.push({ type: 'START_COUNTDOWN' });
  }

  return effects;
}

export function handleCountdownFinished(state: GameState, deck: Card[]): TableEffect[] {
  const effects: TableEffect[] = [];

  state.phase = 'PLAYING';
  state.pile = [];
  state.currentTopCombo = null;
  state.passCount = 0;
  state.firstPlayMade = false;
  state.finishOrder = [];

  const numPlayers = state.players.length;
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % numPlayers].push(deck[i]);
  }
  state.players.forEach((player, i) => {
    player.cards = sortHand(hands[i]);
  });

  state.currentTurnIndex = findThreeOfDiamonds(state.players);
  const currentTurnPlayerId = state.players[state.currentTurnIndex].id;

  const perPlayer: PerPlayerGameStart[] = state.players.map((player) => ({
    playerId: player.id,
    hand: player.cards,
    players: opponentSummaries(state, player.id),
    myColor: player.color,
    currentTurnPlayerId,
  }));
  effects.push({ type: 'GAME_START', perPlayer });

  if (state.spectators.length > 0) {
    effects.push({
      type: 'SPECTATE',
      players: allOpponentSummaries(state),
      pile: state.pile.map((p) => ({ playerId: p.playerId, cards: p.cards })),
      currentTurnPlayerId,
    });
  }

  return effects;
}

export function handleAbortCountdown(state: GameState): TableEffect[] {
  state.phase = 'LOBBY';
  return [{ type: 'ABORT_COUNTDOWN' }];
}

export function handleDrop(state: GameState, playerId: string, cards: Card[], combo: Combo): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'PLAYING') return effects;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return effects;

  if (player.id !== state.players[state.currentTurnIndex]?.id) return effects;

  const cardKeys = new Set(cards.map((c) => `${c.suit}-${c.rank}`));
  player.cards = player.cards.filter((c) => !cardKeys.has(`${c.suit}-${c.rank}`));

  state.pile.push({ playerId: player.id, cards });
  state.currentTopCombo = combo;
  state.passCount = 0;

  const wasFirstPlay = !state.firstPlayMade;
  state.firstPlayMade = true;

  effects.push({
    type: 'CARD_DROPPED',
    playerId: player.id,
    cards,
    comboType: combo.type,
    isFirstPlay: wasFirstPlay,
  });

  if (player.cards.length === 0) {
    state.finishOrder.push(finishEntry(player, state.finishOrder.length + 1));
  }

  const gameOverEffects = checkGameOver(state);
  if (gameOverEffects.length > 0) {
    effects.push(...gameOverEffects);
  } else {
    effects.push(...advanceTurn(state));
  }

  return effects;
}

export function handlePass(state: GameState, playerId: string): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'PLAYING') return effects;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return effects;

  if (player.id !== state.players[state.currentTurnIndex]?.id) return effects;

  state.passCount++;

  const activeCount = getActivePlayers(state).length;
  if (state.passCount >= activeCount - 1) {
    state.currentTopCombo = null;
    state.passCount = 0;
  }

  effects.push({ type: 'CARD_PASSED', playerId: player.id });

  effects.push(...advanceTurn(state));

  return effects;
}

export function handleArrange(state: GameState, playerId: string, fromIndex: number, toIndex: number): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'PLAYING') return effects;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return effects;

  if (fromIndex < 0 || fromIndex >= player.cards.length) return effects;
  if (toIndex < 0 || toIndex >= player.cards.length) return effects;
  if (fromIndex === toIndex) return effects;

  const [card] = player.cards.splice(fromIndex, 1);
  player.cards.splice(toIndex, 0, card);

  effects.push({ type: 'CARD_ARRANGED', playerId: player.id, fromIndex, toIndex });

  return effects;
}

export function handleBecomeSpectator(state: GameState, playerId: string): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'LOBBY') return effects;

  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) return effects;

  const [player] = state.players.splice(playerIdx, 1);
  state.spectators.push({ id: player.id, username: player.username });

  effects.push({
    type: 'BROADCAST_LOBBY',
    players: playerSummaries(state),
    spectators: spectatorSummaries(state),
  });

  return effects;
}

export function handleJoinSlot(state: GameState, playerId: string): TableEffect[] {
  const effects: TableEffect[] = [];

  if (state.phase !== 'LOBBY') return effects;

  const spectatorIdx = state.spectators.findIndex((s) => s.id === playerId);
  if (spectatorIdx === -1) return effects;

  if (state.players.length >= MAX_PLAYERS) return effects;

  const [spectator] = state.spectators.splice(spectatorIdx, 1);
  const color = PLAYER_COLORS[state.players.length];
  state.players.push({
    id: spectator.id,
    username: spectator.username,
    color,
    ready: false,
    cards: [],
  });

  effects.push({
    type: 'BROADCAST_LOBBY',
    players: playerSummaries(state),
    spectators: spectatorSummaries(state),
  });

  return effects;
}

export function handleDisconnect(state: GameState, playerId: string): TableEffect[] {
  const effects: TableEffect[] = [];

  const player = state.players.find((p) => p.id === playerId);
  const wasPlaying = state.phase === 'PLAYING' && !!player;

  if (player && state.phase === 'PLAYING' && player.cards.length > 0) {
    state.finishOrder.push(finishEntry(player, state.finishOrder.length + 1));
  }

  state.players = state.players.filter((p) => p.id !== playerId);
  state.spectators = state.spectators.filter((s) => s.id !== playerId);

  if (state.players.length > 0 && wasPlaying) {
    const active = getActivePlayers(state);
    if (active.length > 0) {
      state.currentTurnIndex = state.players.findIndex((p) => p.id === active[0].id);
    } else {
      state.currentTurnIndex = 0;
    }
    if (state.currentTurnIndex >= state.players.length) {
      state.currentTurnIndex = 0;
    }

    const isNewRound = state.currentTopCombo === null;
    effects.push({
      type: 'TURN_CHANGE',
      playerId: state.players[state.currentTurnIndex].id,
      isNewRound,
      currentCombo: comboSummary(state.currentTopCombo),
    });
  }

  if (wasPlaying) {
    effects.push({ type: 'PLAYER_LEFT', playerId });
    const gameOverEffects = checkGameOver(state);
    effects.push(...gameOverEffects);
  } else if (state.phase === 'LOBBY') {
    effects.push({
      type: 'BROADCAST_LOBBY',
      players: playerSummaries(state),
      spectators: spectatorSummaries(state),
    });
  }

  return effects;
}

export function handleGameOverTimeout(state: GameState): TableEffect[] {
  state.phase = 'LOBBY';
  state.players.forEach((p) => {
    p.cards = [];
    p.ready = false;
  });
  state.pile = [];
  state.currentTurnIndex = 0;
  state.currentTopCombo = null;
  state.passCount = 0;
  state.firstPlayMade = false;
  state.finishOrder = [];

  return [{
    type: 'BROADCAST_LOBBY',
    players: playerSummaries(state),
    spectators: spectatorSummaries(state),
  }];
}
