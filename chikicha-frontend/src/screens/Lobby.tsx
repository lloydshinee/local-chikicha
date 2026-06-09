import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { LobbyUpdateData, Card, GamePlayer } from '../types';

interface GameData {
  hand: Card[];
  players: GamePlayer[];
  myColor: string;
}

interface Props {
  username: string;
  onGameStart: (data: GameData) => void;
}

export function Lobby({ username, onGameStart }: Props) {
  const { socket } = useSocket();
  const [lobby, setLobby] = useState<LobbyUpdateData>({ players: [], spectators: [] });
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleGameStartEvent = useCallback((data: { hand: Card[]; players: GamePlayer[] }) => {
    const myPlayer = lobby.players.find((p) => p.id === socket?.id);
    setCountdown(null);
    onGameStart({
      hand: data.hand,
      players: data.players,
      myColor: myPlayer?.color ?? '',
    });
  }, [socket, lobby.players, onGameStart]);

  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdate = (data: LobbyUpdateData) => {
      setLobby(data);
    };

    const handleCountdown = (data: { seconds: number }) => {
      setCountdown(data.seconds);
    };

    const handleCountdownAborted = () => {
      setCountdown(null);
    };

    socket.on('lobby_update', handleLobbyUpdate);
    socket.on('countdown', handleCountdown);
    socket.on('countdown_aborted', handleCountdownAborted);
    socket.on('game_start', handleGameStartEvent as any);

    return () => {
      socket.off('lobby_update', handleLobbyUpdate);
      socket.off('countdown', handleCountdown);
      socket.off('countdown_aborted', handleCountdownAborted);
      socket.off('game_start', handleGameStartEvent as any);
    };
  }, [socket, handleGameStartEvent]);

  const myPlayer = lobby.players.find((p) => p.id === socket?.id);
  const amPlayer = !!myPlayer;

  const toggleReady = () => {
    const newReady = !ready;
    setReady(newReady);
    socket?.emit('ready', { ready: newReady });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">chikicha</h1>

      <div className="mb-4 text-sm text-gray-500">
        {!amPlayer ? 'You are a spectator' : 'Waiting for players...'}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => {
          const player = lobby.players[i];
          const isMe = player?.id === socket?.id;
          return (
            <div
              key={i}
              className={`w-36 h-24 rounded-xl border-2 flex flex-col items-center justify-center text-sm font-medium transition-colors ${
                player
                  ? 'border-gray-300 bg-white shadow-sm'
                  : 'border-dashed border-gray-300 bg-gray-100/50 text-gray-400'
              }`}
            >
              {player ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-gray-700 text-sm">{player.username}</span>
                  </div>
                  <span className={`text-xs mt-1 ${player.ready ? 'text-green-500 font-semibold' : 'text-gray-400'}`}>
                    {player.ready ? '\u2713 Ready' : 'Not ready'}
                  </span>
                  {isMe && (
                    <button
                      onClick={toggleReady}
                      className={`mt-1.5 px-3 py-0.5 rounded text-xs font-semibold transition-colors ${
                        ready
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {ready ? 'Unready' : 'Ready'}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs">Empty</span>
              )}
            </div>
          );
        })}
      </div>

      {lobby.spectators.length > 0 && (
        <div className="text-xs text-gray-400">
          Spectators: {lobby.spectators.map((s) => s.username).join(', ')}
        </div>
      )}

      {countdown !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="text-8xl font-bold text-white animate-pulse">
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      )}
    </div>
  );
}
