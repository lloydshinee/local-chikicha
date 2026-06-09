import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameState, PLAYER_COLORS, MAX_PLAYERS } from './game';

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
