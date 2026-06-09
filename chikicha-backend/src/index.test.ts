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

  io.on('connection', (socket) => {
    socket.on('join', (data: { username: string }) => {
      const username = data.username?.trim();
      if (!username) return;

      if (players.length < MAX) {
        players.push({ id: socket.id, username, color: colors[players.length], ready: false });
      } else {
        spectators.push({ id: socket.id, username });
      }

      io.emit('lobby_update', {
        players: [...players],
        spectators: [...spectators],
      });
    });

    socket.on('disconnect', () => {
      const pi = players.findIndex((p) => p.id === socket.id);
      const si = spectators.findIndex((s) => s.id === socket.id);
      if (pi !== -1) players.splice(pi, 1);
      if (si !== -1) spectators.splice(si, 1);
      io.emit('lobby_update', {
        players: [...players],
        spectators: [...spectators],
      });
    });
  });

  return { httpServer, io, port, players, spectators };
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
    expect(lobby.spectators).toHaveLength(0);

    socket.disconnect();
  });

  it('assigns colors in join order', async () => {
    const socket1 = await connectClient();
    const socket2 = await connectClient();
    const socket3 = await connectClient();
    const socket4 = await connectClient();

    const updates: any[] = [];
    socket4.on('lobby_update', (data) => updates.push(data));

    socket1.emit('join', { username: 'P1' });
    socket2.emit('join', { username: 'P2' });
    socket3.emit('join', { username: 'P3' });
    socket4.emit('join', { username: 'P4' });

    await new Promise((r) => setTimeout(r, 200));

    const last = updates[updates.length - 1];
    expect(last.players).toHaveLength(4);
    expect(last.players.map((p: any) => p.color)).toEqual([
      '#EF4444',
      '#3B82F6',
      '#22C55E',
      '#EAB308',
    ]);

    socket1.disconnect();
    socket2.disconnect();
    socket3.disconnect();
    socket4.disconnect();
  });

  it('puts 5th+ as spectator', async () => {
    const sockets: ClientSocket[] = [];
    for (let i = 0; i < 5; i++) {
      sockets.push(await connectClient());
    }

    const updates: any[] = [];
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

  it('removes player on disconnect and broadcasts update', async () => {
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
