import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { LobbyUpdateData } from '../types';

interface Props {
  username: string;
  onGameStart: () => void;
}

export function Lobby({ username, onGameStart }: Props) {
  const { socket } = useSocket();
  const [lobby, setLobby] = useState<LobbyUpdateData>({ players: [], spectators: [] });

  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdate = (data: LobbyUpdateData) => {
      setLobby(data);
    };

    const handleGameStart = () => {
      onGameStart();
    };

    socket.on('lobby_update', handleLobbyUpdate);
    socket.on('game_start', handleGameStart);

    return () => {
      socket.off('lobby_update', handleLobbyUpdate);
      socket.off('game_start', handleGameStart);
    };
  }, [socket, onGameStart]);

  const myPlayer = lobby.players.find((p) => p.id === socket?.id);
  const amPlayer = !!myPlayer;
  const amSpectator = lobby.spectators.some((s) => s.id === socket?.id);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">chikicha</h1>

      <div className="mb-4 text-sm text-gray-500">{amSpectator ? 'You are a spectator' : 'Waiting for players...'}</div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => {
          const player = lobby.players[i];
          return (
            <div
              key={i}
              className={`w-36 h-20 rounded-xl border-2 flex flex-col items-center justify-center text-sm font-medium transition-colors ${
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
                  <span className={`text-xs mt-1 ${player.ready ? 'text-green-500' : 'text-gray-400'}`}>
                    {player.id === socket?.id ? (player.ready ? 'Ready' : 'Not Ready') : (player.ready ? 'Ready' : '')}
                  </span>
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
    </div>
  );
}
