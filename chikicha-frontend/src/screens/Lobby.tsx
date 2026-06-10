import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { MAX_PLAYERS } from '../game-types';
import type { LobbyUpdateData, Card, GamePlayer } from '../types';

interface GameData {
  hand: Card[];
  players: GamePlayer[];
  myColor: string;
  currentTurnPlayerId?: string;
}

interface SpectateData {
  players: GamePlayer[];
  pile: { playerId: string; cards: Card[] }[];
  currentTurnPlayerId?: string;
}

interface Props {
  username: string;
  onGameStart: (data: GameData) => void;
  onSpectate: (data: SpectateData) => void;
}

export function Lobby({ onGameStart, onSpectate }: Props) {
  const { socket } = useSocket();
  const { playCountdownTick, playCountdownFinal } = useSound();
  const [lobby, setLobby] = useState<LobbyUpdateData>({ players: [], spectators: [] });
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [amSpectator, setAmSpectator] = useState(false);

  const handleGameStartEvent = useCallback((data: { hand: Card[]; players: GamePlayer[]; myColor: string; currentTurnPlayerId?: string }) => {
    setCountdown(null);
    onGameStart({
      hand: data.hand,
      players: data.players,
      myColor: data.myColor,
      currentTurnPlayerId: data.currentTurnPlayerId,
    });
  }, [onGameStart]);

  const handleSpectateEvent = useCallback((data: SpectateData) => {
    onSpectate(data);
  }, [onSpectate]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('request_lobby');

    const handleLobbyUpdate = (data: LobbyUpdateData) => {
      setLobby(data);
      setAmSpectator(data.spectators.some((s) => s.id === socket.id));
      const me = data.players.find((p) => p.id === socket?.id);
      if (me) {
        setReady(me.ready);
      }
    };

    const handleCountdown = (data: { seconds: number }) => {
      setCountdown(data.seconds);
      if (data.seconds === 0) {
        playCountdownFinal();
      } else {
        playCountdownTick();
      }
    };

    const handleCountdownAborted = () => {
      setCountdown(null);
    };

    socket.on('lobby_update', handleLobbyUpdate);
    socket.on('countdown', handleCountdown);
    socket.on('countdown_aborted', handleCountdownAborted);
    socket.on('game_start', handleGameStartEvent as any);
    socket.on('spectate', handleSpectateEvent);

    return () => {
      socket.off('lobby_update', handleLobbyUpdate);
      socket.off('countdown', handleCountdown);
      socket.off('countdown_aborted', handleCountdownAborted);
      socket.off('game_start', handleGameStartEvent as any);
      socket.off('spectate', handleSpectateEvent);
    };
  }, [socket, handleGameStartEvent, handleSpectateEvent]);

  const isPlayer = lobby.players.some((p) => p.id === socket?.id);
  const canJoinSlot = amSpectator && lobby.players.length < MAX_PLAYERS;

  const toggleReady = () => {
    const newReady = !ready;
    setReady(newReady);
    socket?.emit('ready', { ready: newReady });
  };

  const becomeSpectator = () => {
    socket?.emit('become_spectator');
  };

  const joinSlot = () => {
    socket?.emit('join_slot');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">chikicha</h1>

      <div className="mb-4 text-sm text-gray-500">
        {!isPlayer ? 'You are a spectator' : amSpectator ? 'Spectating...' : `Players: ${lobby.players.length}/${MAX_PLAYERS}`}
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2 mb-6">
        {lobby.players.map((player) => {
          const isMe = player.id === socket?.id;
          return (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-gray-300 bg-white shadow-sm px-4 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: player.color }} />
                <span className="text-gray-700 text-sm font-medium truncate">{player.username}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold ${player.ready ? 'text-green-500' : 'text-gray-400'}`}>
                  {player.ready ? '\u2713 Ready' : 'Not ready'}
                </span>
                {isMe && (
                  <>
                    <button
                      onClick={toggleReady}
                      className={`px-3 py-0.5 rounded text-xs font-semibold transition-colors ${
                        ready
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {ready ? 'Unready' : 'Ready'}
                    </button>
                    <button
                      onClick={becomeSpectator}
                      className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      Watch
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {Array.from({ length: Math.max(0, MAX_PLAYERS - lobby.players.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-100/50 px-4 py-3"
          >
            <span className="text-xs text-gray-400">
              Empty slot{canJoinSlot ? ' — ' : ''}
              {canJoinSlot && (
                <button
                  onClick={joinSlot}
                  className="text-blue-500 hover:text-blue-600 font-semibold"
                >
                  Join
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      {lobby.spectators.length > 0 && (
        <div className="w-full max-w-sm mb-4">
          <div className="text-xs text-gray-400 mb-1 font-semibold">Spectators:</div>
          <div className="flex flex-col gap-1">
            {lobby.spectators.map((spec) => (
              <div key={spec.id} className="flex items-center gap-2 text-xs text-gray-500">
                <span>{spec.username}</span>
                {spec.id === socket?.id && (
                  <>
                    <span className="text-gray-300">(you)</span>
                    {canJoinSlot && (
                      <button
                        onClick={joinSlot}
                        className="text-blue-500 hover:text-blue-600 font-semibold"
                      >
                        Join game
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {lobby.players.length === 1 && isPlayer && (
        <div className="text-xs text-amber-500 mb-2">Waiting for at least 1 more player...</div>
      )}

      {!isPlayer && !amSpectator && lobby.players.length < MAX_PLAYERS && (
        <div className="text-xs text-gray-400">Game is full — spectating.</div>
      )}

      {countdown !== null && (
        <AnimatePresence>
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-8xl font-bold text-white"
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
