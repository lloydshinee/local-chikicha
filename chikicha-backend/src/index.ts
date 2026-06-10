import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameState, createDeck, shuffleDeck } from './game';
import { detectCombo, canBeat, hasThreeOfDiamonds } from './rules';
import {
  handleJoin, handleReady, handleCountdownFinished, handleAbortCountdown,
  handleDrop, handlePass, handleArrange, handleBecomeSpectator,
  handleJoinSlot, handleDisconnect, handleGameOverTimeout,
  type TableEffect,
} from './table';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const state: GameState = {
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

function executeEffects(effects: TableEffect[]) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'BROADCAST_LOBBY':
        io.emit('lobby_update', {
          players: effect.players,
          spectators: effect.spectators,
        });
        break;

      case 'GAME_START':
        for (const pp of effect.perPlayer) {
          io.to(pp.playerId).emit('game_start', {
            hand: pp.hand,
            players: pp.players,
            myColor: pp.myColor,
            currentTurnPlayerId: pp.currentTurnPlayerId,
          });
        }
        break;

      case 'SPECTATE':
        io.emit('spectate', {
          players: effect.players,
          pile: effect.pile,
          currentTurnPlayerId: effect.currentTurnPlayerId,
        });
        break;

      case 'TURN_CHANGE':
        io.emit('turn_change', {
          playerId: effect.playerId,
          isNewRound: effect.isNewRound,
          currentCombo: effect.currentCombo,
        });
        break;

      case 'CARD_DROPPED':
        io.emit('card_dropped', {
          playerId: effect.playerId,
          cards: effect.cards,
          comboType: effect.comboType,
          isFirstPlay: effect.isFirstPlay,
        });
        break;

      case 'CARD_PASSED':
        io.emit('card_passed', { playerId: effect.playerId });
        break;

      case 'CARD_ARRANGED':
        io.emit('card_arranged', {
          playerId: effect.playerId,
          fromIndex: effect.fromIndex,
          toIndex: effect.toIndex,
        });
        break;

      case 'PLAYER_LEFT':
        io.emit('player_left', { playerId: effect.playerId });
        break;

      case 'GAME_OVER':
        io.emit('game_over', {
          loserId: effect.loserId,
          loserUsername: effect.loserUsername,
          cards: effect.cards,
          loserColor: effect.loserColor,
          finishOrder: effect.finishOrder,
        });
        break;

      case 'START_GAME_OVER_TIMER':
        if (state.gameOverTimer) clearTimeout(state.gameOverTimer);
        state.gameOverTimer = setTimeout(() => {
          const resetEffects = handleGameOverTimeout(state);
          executeEffects(resetEffects);
        }, 5000);
        break;

      case 'START_COUNTDOWN':
        startCountdown();
        break;

      case 'ABORT_COUNTDOWN':
        abortCountdown();
        break;
    }
  }
}

function startCountdown() {
  state.phase = 'COUNTDOWN';
  let seconds = 3;

  io.emit('countdown', { seconds });
  seconds--;

  state.countdownTimer = setInterval(() => {
    if (seconds >= 0) {
      io.emit('countdown', { seconds });
    }
    if (seconds === 0) {
      clearInterval(state.countdownTimer!);
      state.countdownTimer = null;

      const deck = shuffleDeck(createDeck());
      const effects = handleCountdownFinished(state, deck);
      executeEffects(effects);
    }
    seconds--;
  }, 1000);
}

function abortCountdown() {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
    state.phase = 'LOBBY';
    io.emit('countdown_aborted');
  }
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('request_lobby', () => {
    const socketInstance = io.sockets.sockets.get(socket.id);
    if (socketInstance) {
      socketInstance.emit('lobby_update', {
        players: state.players.map((p) => ({
          id: p.id,
          username: p.username,
          color: p.color,
          ready: p.ready,
        })),
        spectators: state.spectators.map((s) => ({
          id: s.id,
          username: s.username,
        })),
      });
    }
  });

  socket.on('join', (data: { username: string }) => {
    const username = data.username?.trim();
    if (!username) return;

    const effects = handleJoin(state, socket.id, username);
    executeEffects(effects);
  });

  socket.on('ready', (data: { ready: boolean }) => {
    if (state.phase !== 'LOBBY' && state.phase !== 'COUNTDOWN') return;

    const effects = handleReady(state, socket.id, data.ready);
    executeEffects(effects);
  });

  socket.on('drop', (data: { cardIndices: number[] }) => {
    if (state.phase !== 'PLAYING') return;

    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (player.id !== state.players[state.currentTurnIndex]?.id) return;

    const indices = data.cardIndices;
    if (!indices || indices.length === 0) return;

    const sortedIndices = [...indices].sort((a, b) => b - a);
    const droppedCards = sortedIndices.map((i) => {
      if (i < 0 || i >= player.cards.length) return null;
      return player.cards[i];
    });

    if (droppedCards.some((c) => c === null)) return;

    const validCards = droppedCards as NonNullable<typeof droppedCards[0]>[];

    const combo = detectCombo(validCards);
    if (!combo) return;

    if (!state.firstPlayMade) {
      if (!hasThreeOfDiamonds(validCards)) return;
    }

    if (state.currentTopCombo && !canBeat(combo, state.currentTopCombo)) return;

    const effects = handleDrop(state, player.id, validCards, combo);
    executeEffects(effects);
  });

  socket.on('pass', () => {
    if (state.phase !== 'PLAYING') return;
    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (player.id !== state.players[state.currentTurnIndex]?.id) return;

    const effects = handlePass(state, player.id);
    executeEffects(effects);
  });

  socket.on('arrange', (data: { fromIndex: number; toIndex: number }) => {
    if (state.phase !== 'PLAYING') return;
    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    const { fromIndex, toIndex } = data;
    if (fromIndex < 0 || fromIndex >= player.cards.length) return;
    if (toIndex < 0 || toIndex >= player.cards.length) return;
    if (fromIndex === toIndex) return;

    const effects = handleArrange(state, player.id, fromIndex, toIndex);
    executeEffects(effects);
  });

  socket.on('become_spectator', () => {
    if (state.phase !== 'LOBBY') return;

    const effects = handleBecomeSpectator(state, socket.id);
    executeEffects(effects);
  });

  socket.on('join_slot', () => {
    if (state.phase !== 'LOBBY') return;

    const effects = handleJoinSlot(state, socket.id);
    executeEffects(effects);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const effects = handleDisconnect(state, socket.id);
    executeEffects(effects);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, httpServer, io, state };
