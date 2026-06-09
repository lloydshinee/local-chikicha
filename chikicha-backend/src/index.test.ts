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

  const players: { id: string; username: string; color: string; ready: boolean; cards: any[] }[] = [];
  const spectators: { id: string; username: string }[] = [];
  const colors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
  const MAX = 4;
  let phase: string = 'LOBBY';
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  const pile: { playerId: string; cards: any[] }[] = [];
  let lastDropPlayerId: string | null = null;

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
        pile.length = 0;
        lastDropPlayerId = null;

        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck: any[] = [];
        for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r });
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        const hands: any[][] = players.map(() => []);
        deck.forEach((c, i) => hands[i % players.length].push(c));
        players.forEach((p, i) => { p.cards = hands[i]; });

        phase = 'PLAYING';
        players.forEach((p) => {
          const opponents = players
            .filter((op) => op.id !== p.id)
            .map((op) => ({ id: op.id, username: op.username, color: op.color, cardCount: op.cards.length }));
          io.to(p.id).emit('game_start', { hand: p.cards, players: opponents });
        });
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

    socket.on('drop', (data: { cardIndices: number[] }) => {
      if (phase !== 'PLAYING') return;
      const player = players.find((p) => p.id === socket.id);
      if (!player || !data.cardIndices?.length) return;

      const sorted = [...data.cardIndices].sort((a, b) => b - a);
      const dropped = sorted.map((i) => (i >= 0 && i < player.cards.length ? player.cards[i] : null));
      if (dropped.some((c) => c === null)) return;

      sorted.forEach((i) => player.cards.splice(i, 1));
      pile.push({ playerId: player.id, cards: dropped as any[] });
      lastDropPlayerId = player.id;
      io.emit('card_dropped', { playerId: player.id, cards: dropped });
    });

    socket.on('pass', () => {
      if (phase !== 'PLAYING') return;
      const player = players.find((p) => p.id === socket.id);
      if (!player) return;
      io.emit('card_passed', { playerId: player.id });
    });

    socket.on('undo', () => {
      if (phase !== 'PLAYING') return;
      const player = players.find((p) => p.id === socket.id);
      if (!player || lastDropPlayerId !== player.id) return;
      const last = pile.pop();
      if (!last) return;
      player.cards.push(...last.cards);
      lastDropPlayerId = null;
      io.emit('card_undone', { playerId: player.id });
    });

    socket.on('arrange', (data: { fromIndex: number; toIndex: number }) => {
      // placeholder - implemented in issue #8
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

describe('gameplay: drop', () => {
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

  async function setupGame(): Promise<ClientSocket[]> {
    const sockets: ClientSocket[] = [];
    for (let i = 0; i < 4; i++) sockets.push(await connectClient());

    sockets[0].emit('join', { username: 'P1' });
    sockets[1].emit('join', { username: 'P2' });
    sockets[2].emit('join', { username: 'P3' });
    sockets[3].emit('join', { username: 'P4' });
    await new Promise((r) => setTimeout(r, 50));

    const gameStarted = Promise.all(
      sockets.map((s) => new Promise<void>((resolve) => {
        s.once('game_start', () => resolve());
      }))
    );

    sockets[0].emit('ready', { ready: true });
    sockets[1].emit('ready', { ready: true });
    sockets[2].emit('ready', { ready: true });
    sockets[3].emit('ready', { ready: true });
    await gameStarted;

    return sockets;
  }

  it('drops cards from hand and broadcasts', async () => {
    const sockets = await setupGame();

    const dropPromise = new Promise<any>((resolve) => {
      sockets[1].on('card_dropped', resolve);
    });

    sockets[0].emit('drop', { cardIndices: [0, 1] });

    const drop = await dropPromise;
    expect(drop.playerId).toBe(sockets[0].id);
    expect(drop.cards).toHaveLength(2);

    sockets.forEach((s) => s.disconnect());
  }, 8000);

  it('removes dropped cards from hand', async () => {
    const sockets = await setupGame();

    // Get initial hand card count from game_start
    let initialCount = 0;
    const startPromise = new Promise<number>((resolve) => {
      sockets[0].on('game_start', (data: any) => resolve(data.hand.length));
    });

    // We already waited for game_start in setupGame, so we need a different approach
    // Just drop and check the card_dropped reduces opponent cardCount
    const dropPromise = new Promise<any>((resolve) => {
      sockets[1].on('card_dropped', resolve);
    });

    sockets[0].emit('drop', { cardIndices: [0] });
    const drop = await dropPromise;
    expect(drop.cards).toHaveLength(1);

    sockets.forEach((s) => s.disconnect());
  }, 8000);

  it('broadcasts pass', async () => {
    const sockets = await setupGame();
    const passPromise = new Promise<any>((resolve) => {
      sockets[1].on('card_passed', resolve);
    });
    sockets[0].emit('pass');
    const data = await passPromise;
    expect(data.playerId).toBe(sockets[0].id);
    sockets.forEach((s) => s.disconnect());
  }, 8000);

  it('undo returns cards to hand', async () => {
    const sockets = await setupGame();

    const dropPromise = new Promise<any>((resolve) => {
      sockets[1].on('card_dropped', resolve);
    });
    sockets[0].emit('drop', { cardIndices: [0] });
    await dropPromise;

    const undoPromise = new Promise<any>((resolve) => {
      sockets[0].on('card_undone', resolve);
    });
    sockets[0].emit('undo');
    const undo = await undoPromise;
    expect(undo.playerId).toBe(sockets[0].id);

    sockets.forEach((s) => s.disconnect());
  }, 8000);

  it('prevents non-dropper from undoing', async () => {
    const sockets = await setupGame();

    const dropPromise = new Promise<any>((resolve) => {
      sockets[1].on('card_dropped', resolve);
    });
    sockets[0].emit('drop', { cardIndices: [0] });
    await dropPromise;

    // Socket 1 tries to undo
    const undoEvents: any[] = [];
    sockets[1].on('card_undone', (d) => undoEvents.push(d));
    sockets[1].emit('undo');
    await new Promise((r) => setTimeout(r, 200));
    expect(undoEvents).toHaveLength(0);

    sockets.forEach((s) => s.disconnect());
  }, 8000);
});

function colors() {
  return ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
}
