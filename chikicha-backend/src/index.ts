import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameState, PLAYER_COLORS, MAX_PLAYERS, createDeck, shuffleDeck, dealCards } from './game';

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
  lastDropPlayerId: null,
  countdownTimer: null,
  gameOverTimer: null,
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
      state.lastDropPlayerId = null;

      const deck = shuffleDeck(createDeck());
      const hands = dealCards(deck, state.players.length);
      state.players.forEach((player, i) => {
        player.cards = hands[i];
      });

      state.players.forEach((player) => {
        const opponentData = state.players
          .filter((p) => p.id !== player.id)
          .map((p) => ({
            id: p.id,
            username: p.username,
            color: p.color,
            position: '', // assigned client-side
            cardCount: p.cards.length,
          }));

        io.to(player.id).emit('game_start', {
          hand: player.cards,
          players: opponentData,
        });
      });
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

    const indices = data.cardIndices;
    if (!indices || indices.length === 0) return;

    const sortedIndices = [...indices].sort((a, b) => b - a);
    const droppedCards = sortedIndices.map((i) => {
      if (i < 0 || i >= player.cards.length) return null;
      return player.cards[i];
    });

    if (droppedCards.some((c) => c === null)) return;

    const validCards = droppedCards as NonNullable<typeof droppedCards[0]>[];

    sortedIndices.forEach((i) => {
      player.cards.splice(i, 1);
    });

    state.pile.push({
      playerId: player.id,
      cards: validCards,
    });
    state.lastDropPlayerId = player.id;

    io.emit('card_dropped', {
      playerId: player.id,
      cards: validCards,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    state.players = state.players.filter((p) => p.id !== socket.id);
    state.spectators = state.spectators.filter((s) => s.id !== socket.id);

    if (state.phase === 'LOBBY') {
      broadcastLobbyUpdate();
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, httpServer, io, state };
