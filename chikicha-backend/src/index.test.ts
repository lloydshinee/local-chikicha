import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import express from 'express';

function createTestServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const port = Math.floor(Math.random() * 10000) + 20000;
  httpServer.listen(port);

  const players: { id: string; username: string; color: string; ready: boolean }[] = [];
  const spectators: { id: string; username: string }[] = [];
  const colors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
  const MAX = 4;
  let phase: string = 'LOBBY';
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function broadcastLobby() {
    io.emit('lobby_update', {
      players: [...players],
      spectators: [...spectators],
    });
  }

  function startCountdown() {
    phase = 'COUNTDOWN';
    let seconds = 3;
    io.emit('countdown', { seconds });
    seconds--;

    countdownTimer = setInterval(() => {
      if (seconds >= 0) {
        io.emit('countdown', { seconds });
      }
      if (seconds === 0) {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        phase = 'PLAYING';
        io.emit('game_start', {});
      }
      seconds--;
    }, 1000);
  }

  function abortCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      phase = 'LOBBY';
      io.emit('countdown_aborted');
    }
  }

  io.on('connection', (socket) => {
    socket.on('join', (data: { username: string }) => {
      const username = data.username?.trim();
      if (!username) return;

      if (players.length < MAX) {
        players.push({ id: socket.id, username, color: colors[players.length], ready: false });
      } else {
        spectators.push({ id: socket.id, username });
      }

      broadcastLobby();
    });

    socket.on('ready', (data: { ready: boolean }) => {
      if (phase !== 'LOBBY' && phase !== 'COUNTDOWN') return;

      const player = players.find((p) => p.id === socket.id);
      if (!player) return;

      player.ready = data.ready;

      if (phase === 'COUNTDOWN' && !player.ready) {
        abortCountdown();
        broadcastLobby();
        return;
      }

      broadcastLobby();

      if (phase === 'LOBBY' && players.length === MAX && players.every((p) => p.ready)) {
        startCountdown();
      }
    });

    socket.on('disconnect', () => {
      const pi = players.findIndex((p) => p.id === socket.id);
      const si = spectators.findIndex((s) => s.id === socket.id);
      if (pi !== -1) players.splice(pi, 1);
      if (si !== -1) spectators.splice(si, 1);
      broadcastLobby();
    });
  });

  return { httpServer, io, port, players, spectators, reset: () => {
    players.length = 0;
    spectators.length = 0;
    phase = 'LOBBY';
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
  }};
}

describe('join flow', () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
  });

  afterEach(() => {
    server.httpServer.close();
    server.io.close();
  });

  function connectClient(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const socket = Client(`http://localhost:${server.port}`, {
        transports: ['websocket'],
      });
      socket.on('connect', () => resolve(socket));
    });
  }

  it('registers a player and broadcasts lobby_update', async () => {
    const socket = await connectClient();

    const lobbyPromise = new Promise<any>((resolve) => {
      socket.on('lobby_update', resolve);
    });

    socket.emit('join', { username: 'Alice' });
    const lobby = await lobbyPromise;

    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0].username).toBe('Alice');
    expect(lobby.players[0].color).toBe('#EF4444');
    expect(lobby.players[0].ready).toBe(false);

    socket.disconnect();
  });

  it('assigns colors in join order', async () => {
    const sockets: ClientSocket[] = [];
    const updates: any[] = [];

    for (let i = 0; i < 4; i++) {
      sockets.push(await connectClient());
    }

    sockets[3].on('lobby_update', (data) => updates.push(data));

    sockets[0].emit('join', { username: 'P1' });
    sockets[1].emit('join', { username: 'P2' });
    sockets[2].emit('join', { username: 'P3' });
    sockets[3].emit('join', { username: 'P4' });

    await new Promise((r) => setTimeout(r, 200));
    const last = updates[updates.length - 1];
    expect(last.players).toHaveLength(4);
    expect(last.players.map((p: any) => p.color)).toEqual(colors());

    sockets.forEach((s) => s.disconnect());
  });

  it('puts 5th+ as spectator', async () => {
    const sockets: ClientSocket[] = [];
    const updates: any[] = [];

    for (let i = 0; i < 5; i++) sockets.push(await connectClient());

    sockets[4].on('lobby_update', (data) => updates.push(data));
    sockets[0].emit('join', { username: 'P1' });
    sockets[1].emit('join', { username: 'P2' });
    sockets[2].emit('join', { username: 'P3' });
    sockets[3].emit('join', { username: 'P4' });
    sockets[4].emit('join', { username: 'Spec1' });

    await new Promise((r) => setTimeout(r, 200));
    const last = updates[updates.length - 1];
    expect(last.players).toHaveLength(4);
    expect(last.spectators).toHaveLength(1);
    expect(last.spectators[0].username).toBe('Spec1');

    sockets.forEach((s) => s.disconnect());
  });

  it('removes player on disconnect', async () => {
    const s1 = await connectClient();
    const s2 = await connectClient();

    s1.emit('join', { username: 'P1' });
    s2.emit('join', { username: 'P2' });
    await new Promise((r) => setTimeout(r, 100));

    const disconnectPromise = new Promise<any>((resolve) => {
      s2.on('lobby_update', resolve);
    });

    s1.disconnect();
    const update = await disconnectPromise;
    expect(update.players).toHaveLength(1);
    expect(update.players[0].username).toBe('P2');

    s2.disconnect();
  });
});

describe('ready & countdown', () => {
  let server: ReturnType<typeof createTestServer>;

  beforeEach(() => {
    server = createTestServer();
  });

  afterEach(() => {
    server.httpServer.close();
    server.io.close();
  });

  function connectClient(): Promise<ClientSocket> {
    return new Promise((resolve) => {
      const socket = Client(`http://localhost:${server.port}`, {
        transports: ['websocket'],
      });
      socket.on('connect', () => resolve(socket));
    });
  }

  it('toggles ready and updates lobby', async () => {
    const s = await connectClient();
    let lobbyUpdates: any[] = [];
    s.on('lobby_update', (d) => lobbyUpdates.push(d));

    s.emit('join', { username: 'P1' });
    await new Promise((r) => setTimeout(r, 50));

    s.emit('ready', { ready: true });
    await new Promise((r) => setTimeout(r, 50));

    const last = lobbyUpdates[lobbyUpdates.length - 1];
    expect(last.players[0].ready).toBe(true);

    s.disconnect();
  });

  it('starts countdown when all 4 ready', async () => {
    const sockets: ClientSocket[] = [];
    const countdownEvents: any[] = [];

    for (let i = 0; i < 4; i++) sockets.push(await connectClient());

    sockets[0].on('countdown', (d) => countdownEvents.push(d));
    sockets[0].on('game_start', () => countdownEvents.push('game_start'));

    sockets[0].emit('join', { username: 'P1' });
    sockets[1].emit('join', { username: 'P2' });
    sockets[2].emit('join', { username: 'P3' });
    sockets[3].emit('join', { username: 'P4' });
    await new Promise((r) => setTimeout(r, 50));

    sockets[0].emit('ready', { ready: true });
    sockets[1].emit('ready', { ready: true });
    sockets[2].emit('ready', { ready: true });
    sockets[3].emit('ready', { ready: true });

    await new Promise((r) => setTimeout(r, 4000));

    const seconds = countdownEvents.filter((e) => typeof e === 'object').map((e) => e.seconds);
    expect(seconds).toContain(3);
    expect(countdownEvents).toContain('game_start');

    sockets.forEach((s) => s.disconnect());
  }, 8000);

  it('aborts countdown on unready', async () => {
    const sockets: ClientSocket[] = [];
    const events: string[] = [];

    for (let i = 0; i < 4; i++) sockets.push(await connectClient());

    sockets[0].on('countdown', () => events.push('countdown'));
    sockets[0].on('countdown_aborted', () => events.push('aborted'));

    sockets[0].emit('join', { username: 'P1' });
    sockets[1].emit('join', { username: 'P2' });
    sockets[2].emit('join', { username: 'P3' });
    sockets[3].emit('join', { username: 'P4' });
    await new Promise((r) => setTimeout(r, 50));

    sockets[0].emit('ready', { ready: true });
    sockets[1].emit('ready', { ready: true });
    sockets[2].emit('ready', { ready: true });
    sockets[3].emit('ready', { ready: true });

    await new Promise((r) => setTimeout(r, 600));

    sockets[0].emit('ready', { ready: false });

    await new Promise((r) => setTimeout(r, 500));

    expect(events).toContain('countdown');
    expect(events).toContain('aborted');

    sockets.forEach((s) => s.disconnect());
  }, 8000);
});

function colors() {
  return ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
}
