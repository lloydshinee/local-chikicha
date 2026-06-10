import { describe, it, expect, beforeEach } from 'vitest';
import type { Card, GameState, Player } from './game';
import { createDeck, shuffleDeck, dealCards } from './game';
import type { Combo } from './rules';
import { sortHand } from './rules';
import {
  handleJoin, handleReady, handleCountdownFinished, handleAbortCountdown,
  handleDrop, handlePass, handleArrange, handleBecomeSpectator,
  handleJoinSlot, handleDisconnect, handleGameOverTimeout,
} from './table';

function emptyState(): GameState {
  return {
    phase: 'LOBBY',
    players: [],
    spectators: [],
    pile: [],
    countdownTimer: null,
    gameOverTimer: null,
    currentTurnIndex: 0,
    currentTopCombo: null,
    passCount: 0,
    firstPlayMade: false,
    finishOrder: [],
  };
}

function makeCards(specs: [string, string][]): Card[] {
  return specs.map(([rank, suit]) => ({ rank, suit } as Card));
}

function makeCombo(type: string, primaryRank: string, primarySuit: string, cards: Card[]): Combo {
  return { type, primaryRank, primarySuit, cards } as Combo;
}

describe('handleJoin', () => {
  let state: GameState;

  beforeEach(() => {
    state = emptyState();
  });

  it('adds a player in LOBBY phase', () => {
    const effects = handleJoin(state, 'socket1', 'Alice');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].username).toBe('Alice');
    expect(state.players[0].color).toBe('#EF4444');
    expect(state.players[0].ready).toBe(false);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('assigns colors in join order', () => {
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    handleJoin(state, 's3', 'P3');
    handleJoin(state, 's4', 'P4');
    handleJoin(state, 's5', 'P5');
    expect(state.players.map((p) => p.color)).toEqual(['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#F97316']);
  });

  it('puts 6th+ player as spectator', () => {
    for (let i = 0; i < 5; i++) handleJoin(state, `s${i}`, `P${i}`);
    const effects = handleJoin(state, 's6', 'Spec1');
    expect(state.players).toHaveLength(5);
    expect(state.spectators).toHaveLength(1);
    expect(state.spectators[0].username).toBe('Spec1');
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('sends SPECTATE to late joiners when game is PLAYING', () => {
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    // Simulate game start by manually setting phase
    state.phase = 'PLAYING';
    state.players[0].cards = makeCards([['3', 'diamonds'], ['5', 'clubs']]);
    state.players[1].cards = makeCards([['7', 'hearts'], ['9', 'spades']]);
    state.currentTurnIndex = 0;

    const effects = handleJoin(state, 's3', 'Spec1');
    expect(state.spectators).toHaveLength(1);
    const spectateEffect = effects.find((e) => e.type === 'SPECTATE');
    expect(spectateEffect).toBeDefined();
    expect((spectateEffect as any).players).toHaveLength(2);
  });
});

describe('handleReady', () => {
  let state: GameState;

  beforeEach(() => {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
  });

  it('sets player ready flag', () => {
    const effects = handleReady(state, 's1', true);
    expect(state.players[0].ready).toBe(true);
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('unreadies a player', () => {
    handleReady(state, 's1', true);
    const effects = handleReady(state, 's1', false);
    expect(state.players[0].ready).toBe(false);
  });

  it('triggers START_COUNTDOWN when all players ready', () => {
    // Need at least MIN_PLAYERS (2) and all ready
    handleReady(state, 's1', true);
    const effects = handleReady(state, 's2', true);
    const countdownEffect = effects.find((e) => e.type === 'START_COUNTDOWN');
    expect(countdownEffect).toBeDefined();
  });

  it('does not trigger countdown when not all ready', () => {
    const effects = handleReady(state, 's1', true);
    const countdownEffect = effects.find((e) => e.type === 'START_COUNTDOWN');
    expect(countdownEffect).toBeUndefined();
  });

  it('aborts countdown when player unreadies during COUNTDOWN', () => {
    handleReady(state, 's1', true);
    handleReady(state, 's2', true);
    // Simulate countdown started
    state.phase = 'COUNTDOWN';

    const effects = handleReady(state, 's1', false);
    expect(effects.some((e) => e.type === 'ABORT_COUNTDOWN')).toBe(true);
  });

  it('ignores ready when not in LOBBY or COUNTDOWN', () => {
    state.phase = 'PLAYING';
    const effects = handleReady(state, 's1', true);
    expect(effects).toHaveLength(0);
  });
});

describe('handleCountdownFinished', () => {
  let state: GameState;

  beforeEach(() => {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
  });

  it('sets phase to PLAYING and deals cards', () => {
    const deck = shuffleDeck(createDeck());
    const effects = handleCountdownFinished(state, deck);

    expect(state.phase).toBe('PLAYING');
    expect(state.players[0].cards.length).toBe(26);
    expect(state.players[1].cards.length).toBe(26);
    expect(state.firstPlayMade).toBe(false);
    expect(state.passCount).toBe(0);
    expect(state.finishOrder).toHaveLength(0);

    const gameStartEffect = effects.find((e) => e.type === 'GAME_START');
    expect(gameStartEffect).toBeDefined();
  });

  it('sets currentTurnIndex to player with 3 of diamonds', () => {
    // Stack the deck so P2 gets 3♦
    const deck = createDeck();
    // Find 3♦ index
    const threeDiamondIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    // Swap so it goes to P2 (index 1 in 2-player deal: cards 1, 3, 5...)
    if (threeDiamondIdx % 2 === 0) {
      [deck[threeDiamondIdx], deck[threeDiamondIdx + 1]] = [deck[threeDiamondIdx + 1], deck[threeDiamondIdx]];
    }

    handleCountdownFinished(state, deck);
    const p2HasThree = state.players[1].cards.some((c) => c.suit === 'diamonds' && c.rank === '3');
    if (p2HasThree) {
      expect(state.currentTurnIndex).toBe(1);
    }
  });

  it('includes spectate effect when spectators present', () => {
    // Force s3 as spectator by adding players first, then manually adding spectator
    handleJoin(state, 's3', 'P3');
    handleJoin(state, 's4', 'P4');
    handleJoin(state, 's5', 'P5');
    state.spectators = [{ id: 'spec', username: 'Spec1' }];
    const deck = shuffleDeck(createDeck());
    const effects = handleCountdownFinished(state, deck);
    const spectateEffect = effects.find((e) => e.type === 'SPECTATE');
    expect(spectateEffect).toBeDefined();
  });
});

describe('handleAbortCountdown', () => {
  it('sets phase back to LOBBY', () => {
    const state = emptyState();
    state.phase = 'COUNTDOWN';
    const effects = handleAbortCountdown(state);
    expect(state.phase).toBe('LOBBY');
    expect(effects[0].type).toBe('ABORT_COUNTDOWN');
  });
});

describe('handleDrop', () => {
  let state: GameState;

  function setupPlayState(): void {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    const deck = [...createDeck()];
    // Put 3♦ in P1's hand
    const threeIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    if (threeIdx % 2 !== 0) {
      [deck[threeIdx], deck[threeIdx + 1]] = [deck[threeIdx + 1], deck[threeIdx]];
    }
    handleCountdownFinished(state, deck);
  }

  it('removes cards from player hand and adds to pile', () => {
    setupPlayState();

    const player = state.players[state.currentTurnIndex];
    const card = player.cards[0];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);

    const effects = handleDrop(state, player.id, [card], combo);
    expect(player.cards).toHaveLength(25); // was 26, now 25
    expect(state.pile).toHaveLength(1);
    expect(state.pile[0].playerId).toBe(player.id);

    const dropEffect = effects.find((e) => e.type === 'CARD_DROPPED');
    expect(dropEffect).toBeDefined();
  });

  it('updates currentTopCombo and resets passCount', () => {
    setupPlayState();
    state.passCount = 3;

    const player = state.players[state.currentTurnIndex];
    const card = player.cards[0];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);

    handleDrop(state, player.id, [card], combo);
    expect(state.currentTopCombo).toEqual(combo);
    expect(state.passCount).toBe(0);
    expect(state.firstPlayMade).toBe(true);
  });

  it('ignores drop when not PLAYING phase', () => {
    setupPlayState();
    state.phase = 'LOBBY';
    const player = state.players[0];
    const card = player.cards[0];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);
    const effects = handleDrop(state, player.id, [card], combo);
    expect(effects).toHaveLength(0);
  });

  it('advances turn after drop', () => {
    setupPlayState();

    const player = state.players[state.currentTurnIndex];
    const card = player.cards[0];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);

    const effects = handleDrop(state, player.id, [card], combo);
    const turnChange = effects.find((e) => e.type === 'TURN_CHANGE');
    expect(turnChange).toBeDefined();
    expect((turnChange as any).playerId).not.toBe(player.id);
  });

  it('records finish position when player empties hand', () => {
    setupPlayState();
    // Add a 3rd player directly so P1 finishing doesn't trigger game over
    state.players.push({
      id: 's3',
      username: 'P3',
      color: '#22C55E',
      ready: true,
      cards: makeCards([['2', 'spades'], ['A', 'hearts']]),
    });
    // Also deal P2 some extra cards to ensure they keep cards after P1 finishes
    state.players[1].cards = state.players[1].cards.slice(0, 3);

    // Give P1 only 1 card (P2 and P3 still have cards, no game over)
    const player = state.players[state.currentTurnIndex];
    const card = player.cards[0];
    player.cards = [card];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);

    handleDrop(state, player.id, [card], combo);
    expect(player.cards).toHaveLength(0);
    const finishForPlayer = state.finishOrder.find((e) => e.playerId === player.id);
    expect(finishForPlayer).toBeDefined();
    expect(finishForPlayer!.position).toBe(1);
  });

  it('emits GAME_OVER when only one player has cards', () => {
    setupPlayState();

    // Give P1 1 card, P2 2 cards
    const p1 = state.players[0];
    const p2 = state.players[1];
    p1.cards = p1.cards.slice(0, 1);
    p2.cards = p2.cards.slice(0, 2);

    state.currentTurnIndex = 0;
    const card = p1.cards[0];
    const combo = makeCombo('SINGLE', card.rank, card.suit, [card]);

    const effects = handleDrop(state, p1.id, [card], combo);
    const gameOverEffect = effects.find((e) => e.type === 'GAME_OVER');
    expect(gameOverEffect).toBeDefined();
    expect((gameOverEffect as any).loserId).toBe(p2.id);
  });
});

describe('handlePass', () => {
  let state: GameState;

  function setupPlayState(): void {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    handleJoin(state, 's3', 'P3');
    const deck = [...createDeck()];
    const threeIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    // Ensure 3♦ goes to P1
    if (threeIdx % 3 !== 0) {
      const target = threeIdx - (threeIdx % 3);
      [deck[threeIdx], deck[target]] = [deck[target], deck[threeIdx]];
    }
    handleCountdownFinished(state, deck);
  }

  it('increments passCount and advances turn', () => {
    setupPlayState();

    const player = state.players[state.currentTurnIndex];
    const effects = handlePass(state, player.id);

    expect(state.passCount).toBe(1);
    expect(effects.some((e) => e.type === 'CARD_PASSED')).toBe(true);
    expect(effects.some((e) => e.type === 'TURN_CHANGE')).toBe(true);
  });

  it('resets round when all active players pass', () => {
    setupPlayState();

    // P1 drops first (has 3♦)
    const p1 = state.players[state.currentTurnIndex];
    const dropCard = p1.cards[0];
    const combo = makeCombo('SINGLE', dropCard.rank, dropCard.suit, [dropCard]);
    handleDrop(state, p1.id, [dropCard], combo);

    // P2 passes
    const p2 = state.players[state.currentTurnIndex];
    handlePass(state, p2.id);

    // P3 passes — passCount should reach activeCount-1 and reset
    const p3 = state.players[state.currentTurnIndex];
    handlePass(state, p3.id);

    expect(state.currentTopCombo).toBeNull();
    expect(state.passCount).toBe(0);
  });

  it('ignores pass when not PLAYING', () => {
    setupPlayState();
    state.phase = 'LOBBY';
    const effects = handlePass(state, 's1');
    expect(effects).toHaveLength(0);
  });
});

describe('handleArrange', () => {
  let state: GameState;

  function setupPlayState(): void {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    const deck = [...createDeck()];
    const threeIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    if (threeIdx % 2 !== 0) {
      [deck[threeIdx], deck[threeIdx + 1]] = [deck[threeIdx + 1], deck[threeIdx]];
    }
    handleCountdownFinished(state, deck);
  }

  it('reorders cards in hand', () => {
    setupPlayState();
    const player = state.players[0];
    const firstCardBefore = { ...player.cards[0] };
    const secondCardBefore = { ...player.cards[1] };

    const effects = handleArrange(state, player.id, 0, 1);
    expect(player.cards[0]).toEqual(secondCardBefore);
    expect(player.cards[1]).toEqual(firstCardBefore);
    expect(effects[0].type).toBe('CARD_ARRANGED');
  });

  it('ignores invalid indices', () => {
    setupPlayState();
    const effects = handleArrange(state, state.players[0].id, -1, 0);
    expect(effects).toHaveLength(0);
  });

  it('ignores when not PLAYING', () => {
    state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    state.phase = 'PLAYING';
    state.players[0].cards = makeCards([['3', 'diamonds'], ['4', 'clubs']]);
    state.phase = 'LOBBY';
    const effects = handleArrange(state, state.players[0].id, 0, 1);
    expect(effects).toHaveLength(0);
  });
});

describe('handleBecomeSpectator', () => {
  it('moves player to spectators in LOBBY', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');

    const effects = handleBecomeSpectator(state, 's1');
    expect(state.players).toHaveLength(1);
    expect(state.spectators).toHaveLength(1);
    expect(state.spectators[0].username).toBe('P1');
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('ignores when not LOBBY', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    state.phase = 'PLAYING';
    const effects = handleBecomeSpectator(state, 's1');
    expect(effects).toHaveLength(0);
  });
});

describe('handleJoinSlot', () => {
  it('moves spectator to player in LOBBY', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    // Force s2 into spectators directly
    state.spectators = [{ id: 's2', username: 'Spec1' }];

    const effects = handleJoinSlot(state, 's2');
    expect(state.players).toHaveLength(2);
    expect(state.spectators).toHaveLength(0);
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('ignores when game full', () => {
    const state = emptyState();
    for (let i = 0; i < 5; i++) handleJoin(state, `s${i}`, `P${i}`);
    state.spectators = [{ id: 'spec', username: 'Spec1' }];

    const effects = handleJoinSlot(state, 'spec');
    expect(effects).toHaveLength(0);
    expect(state.players).toHaveLength(5);
  });

  it('ignores when not LOBBY', () => {
    const state = emptyState();
    state.spectators = [{ id: 'spec', username: 'Spec1' }];
    state.phase = 'PLAYING';
    const effects = handleJoinSlot(state, 'spec');
    expect(effects).toHaveLength(0);
  });
});

describe('handleDisconnect', () => {
  it('removes player in LOBBY and broadcasts', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');

    const effects = handleDisconnect(state, 's1');
    expect(state.players).toHaveLength(1);
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });

  it('removes spectator', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    state.spectators = [{ id: 's2', username: 'Spec1' }];

    handleDisconnect(state, 's2');
    expect(state.spectators).toHaveLength(0);
  });

  it('emits PLAYER_LEFT during game and advances turn', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    handleJoin(state, 's3', 'P3');
    const deck = [...createDeck()];
    const threeIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    if (threeIdx % 3 !== 0) {
      const target = threeIdx - (threeIdx % 3);
      [deck[threeIdx], deck[target]] = [deck[target], deck[threeIdx]];
    }
    handleCountdownFinished(state, deck);

    const effects = handleDisconnect(state, 's1');
    expect(effects.some((e) => e.type === 'PLAYER_LEFT')).toBe(true);
    expect(state.players).toHaveLength(2);
  });

  it('records finish order for disconnected player with cards', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    const deck = [...createDeck()];
    const threeIdx = deck.findIndex((c) => c.suit === 'diamonds' && c.rank === '3');
    if (threeIdx % 2 !== 0) {
      [deck[threeIdx], deck[threeIdx + 1]] = [deck[threeIdx + 1], deck[threeIdx]];
    }
    handleCountdownFinished(state, deck);

    const effects = handleDisconnect(state, 's1');
    const finishEntry = state.finishOrder.find((e) => e.playerId === 's1');
    expect(finishEntry).toBeDefined();
  });
});

describe('handleGameOverTimeout', () => {
  it('resets state to LOBBY', () => {
    const state = emptyState();
    handleJoin(state, 's1', 'P1');
    handleJoin(state, 's2', 'P2');
    state.phase = 'GAME_OVER';
    state.players[0].cards = makeCards([['2', 'spades']]);
    state.players[1].cards = [];
    state.pile = [{ playerId: 's1', cards: makeCards([['A', 'hearts']]) }];
    state.finishOrder = [{ position: 1, playerId: 's1', username: 'P1', color: '#EF4444' }];

    const effects = handleGameOverTimeout(state);
    expect(state.phase).toBe('LOBBY');
    expect(state.players[0].cards).toHaveLength(0);
    expect(state.players[0].ready).toBe(false);
    expect(state.pile).toHaveLength(0);
    expect(state.finishOrder).toHaveLength(0);
    expect(effects[0].type).toBe('BROADCAST_LOBBY');
  });
});
