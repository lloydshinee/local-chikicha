import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameState, PLAYER_COLORS, MAX_PLAYERS, createDeck, shuffleDeck, dealCards } from './game';
import { detectCombo, canBeat, hasThreeOfDiamonds } from './rules';

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

function broadcastLobbyUpdate() {
  io.emit('lobby_update', {
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

function sendLobbyToSocket(socketId: string) {
  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.emit('lobby_update', {
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
}

function findThreeOfDiamonds(players: typeof state.players): number {
  for (let i = 0; i < players.length; i++) {
    if (players[i].cards.some((c) => c.suit === 'diamonds' && c.rank === '3')) {
      return i;
    }
  }
  return Math.floor(Math.random() * players.length);
}

function getActivePlayers(): typeof state.players {
  return state.players.filter((p) => p.cards.length > 0);
}

function advanceTurn() {
  const active = getActivePlayers();
  if (active.length === 0) return;

  const currentPlayerId = state.players[state.currentTurnIndex]?.id;
  const currentIdx = active.findIndex((p) => p.id === currentPlayerId);
  const nextIdx = (currentIdx + 1) % active.length;
  const nextPlayer = active[nextIdx];
  state.currentTurnIndex = state.players.findIndex((p) => p.id === nextPlayer.id);

  const isNewRound = state.currentTopCombo === null;
  io.emit('turn_change', {
    playerId: nextPlayer.id,
    isNewRound,
    currentCombo: state.currentTopCombo
      ? { type: state.currentTopCombo.type, primaryRank: state.currentTopCombo.primaryRank, primarySuit: state.currentTopCombo.primarySuit }
      : null,
  });
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
      state.phase = 'PLAYING';
      state.pile = [];
      state.currentTopCombo = null;
      state.passCount = 0;
      state.firstPlayMade = false;
      state.finishOrder = [];

      const deck = shuffleDeck(createDeck());
      const hands = dealCards(deck, state.players.length);
      state.players.forEach((player, i) => {
        player.cards = hands[i];
      });

      state.currentTurnIndex = findThreeOfDiamonds(state.players);

      const currentTurnPlayerId = state.players[state.currentTurnIndex].id;

      state.players.forEach((player) => {
        const opponentData = state.players
          .filter((p) => p.id !== player.id)
          .map((p) => ({
            id: p.id,
            username: p.username,
            color: p.color,
            cardCount: p.cards.length,
          }));

        io.to(player.id).emit('game_start', {
          hand: player.cards,
          players: opponentData,
          currentTurnPlayerId,
        });
      });

      if (state.spectators.length > 0) {
        const playerData = state.players.map((p) => ({
          id: p.id,
          username: p.username,
          color: p.color,
          cardCount: p.cards.length,
        }));
        io.emit('spectate', {
          players: playerData,
          pile: state.pile,
          currentTurnPlayerId,
        });
      }
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
    sendLobbyToSocket(socket.id);
  });

  socket.on('join', (data: { username: string }) => {
    const username = data.username?.trim();
    if (!username) return;

    const isActivePlayer = state.players.length < MAX_PLAYERS && state.phase === 'LOBBY';

    if (isActivePlayer) {
      const color = PLAYER_COLORS[state.players.length];
      state.players.push({
        id: socket.id,
        username,
        color,
        ready: false,
        cards: [],
      });
      console.log(`Player joined: ${username} (${color})`);
    } else {
      state.spectators.push({
        id: socket.id,
        username,
      });
      console.log(`Spectator joined: ${username}`);

      if (state.phase === 'PLAYING' || state.phase === 'GAME_OVER') {
        socket.emit('spectate', {
          players: state.players.map((p) => ({
            id: p.id,
            username: p.username,
            color: p.color,
            cardCount: p.cards.length,
          })),
          pile: state.pile,
          currentTurnPlayerId: state.phase === 'PLAYING'
            ? state.players[state.currentTurnIndex]?.id
            : undefined,
        });
      }
    }

    broadcastLobbyUpdate();
  });

  socket.on('ready', (data: { ready: boolean }) => {
    if (state.phase !== 'LOBBY' && state.phase !== 'COUNTDOWN') return;

    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.ready = data.ready;

    if (state.phase === 'COUNTDOWN' && !player.ready) {
      abortCountdown();
      broadcastLobbyUpdate();
      return;
    }

    broadcastLobbyUpdate();

    if (state.phase === 'LOBBY' && state.players.length === MAX_PLAYERS && state.players.every((p) => p.ready)) {
      startCountdown();
    }
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

    sortedIndices.forEach((i) => {
      player.cards.splice(i, 1);
    });

    state.pile.push({
      playerId: player.id,
      cards: validCards,
    });
    state.currentTopCombo = combo;
    state.passCount = 0;

    const wasFirstPlay = !state.firstPlayMade;
    state.firstPlayMade = true;

    io.emit('card_dropped', {
      playerId: player.id,
      cards: validCards,
      comboType: combo.type,
      isFirstPlay: wasFirstPlay,
    });

    if (player.cards.length === 0) {
      state.finishOrder.push({
        position: state.finishOrder.length + 1,
        playerId: player.id,
        username: player.username,
        color: player.color,
      });
    }

    if (!checkGameOver()) {
      advanceTurn();
    }
  });

  socket.on('pass', () => {
    if (state.phase !== 'PLAYING') return;
    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (player.id !== state.players[state.currentTurnIndex]?.id) return;

    state.passCount++;

    const activePlayers = getActivePlayers().length;
    if (state.passCount >= activePlayers - 1) {
      state.currentTopCombo = null;
      state.passCount = 0;
    }

    io.emit('card_passed', { playerId: player.id });
    advanceTurn();
  });

  socket.on('arrange', (data: { fromIndex: number; toIndex: number }) => {
    if (state.phase !== 'PLAYING') return;
    const player = state.players.find((p) => p.id === socket.id);
    if (!player) return;

    const { fromIndex, toIndex } = data;
    if (fromIndex < 0 || fromIndex >= player.cards.length) return;
    if (toIndex < 0 || toIndex >= player.cards.length) return;
    if (fromIndex === toIndex) return;

    const [card] = player.cards.splice(fromIndex, 1);
    player.cards.splice(toIndex, 0, card);

    io.emit('card_arranged', { playerId: player.id, fromIndex, toIndex });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const player = state.players.find((p) => p.id === socket.id);
    const wasSpectator = state.spectators.find((s) => s.id === socket.id);

    const isPlaying = state.phase === 'PLAYING' && !!player;

    if (player && state.phase === 'PLAYING') {
      const removedIndex = state.players.findIndex((p) => p.id === socket.id);
      const removedPlayer = state.players[removedIndex];

      if (removedPlayer && removedPlayer.cards.length > 0) {
        state.finishOrder.push({
          position: state.finishOrder.length + 1,
          playerId: removedPlayer.id,
          username: removedPlayer.username,
          color: removedPlayer.color,
        });
      }

      state.players = state.players.filter((p) => p.id !== socket.id);
      state.spectators = state.spectators.filter((s) => s.id !== socket.id);

      if (state.players.length > 0) {
        const active = getActivePlayers();
        if (active.length > 0) {
          state.currentTurnIndex = state.players.findIndex((p) => p.id === active[0].id);
        } else {
          state.currentTurnIndex = 0;
        }
        if (state.currentTurnIndex >= state.players.length) {
          state.currentTurnIndex = 0;
        }
        const isNewRound = state.currentTopCombo === null;
        io.emit('turn_change', {
          playerId: state.players[state.currentTurnIndex].id,
          isNewRound,
          currentCombo: state.currentTopCombo
            ? { type: state.currentTopCombo.type, primaryRank: state.currentTopCombo.primaryRank, primarySuit: state.currentTopCombo.primarySuit }
            : null,
        });
      }

      io.emit('player_left', { playerId: socket.id });
      checkGameOver();
    } else {
      state.players = state.players.filter((p) => p.id !== socket.id);
      state.spectators = state.spectators.filter((s) => s.id !== socket.id);
      if (state.phase === 'LOBBY') {
        broadcastLobbyUpdate();
      }
    }
  });
});

function checkGameOver(): boolean {
  if (state.phase !== 'PLAYING') return false;
  const playersWithCards = state.players.filter((p) => p.cards.length > 0);
  console.log(`[checkGameOver] players with cards: ${playersWithCards.length}/${state.players.length} — ${playersWithCards.map(p => `${p.username}(${p.cards.length})`).join(', ')}`);
  if (playersWithCards.length !== 1) return false;

  const loser = playersWithCards[0];

  state.finishOrder.push({
    position: state.finishOrder.length + 1,
    playerId: loser.id,
    username: loser.username,
    color: loser.color,
  });

  state.phase = 'GAME_OVER';

  io.emit('game_over', {
    loserId: loser.id,
    loserUsername: loser.username,
    cards: loser.cards,
    loserColor: loser.color,
    finishOrder: state.finishOrder,
  });

  if (state.gameOverTimer) clearTimeout(state.gameOverTimer);
  state.gameOverTimer = setTimeout(() => {
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
    state.gameOverTimer = null;
    broadcastLobbyUpdate();
  }, 5000);
  return true;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, httpServer, io, state };
