import { useState, useCallback } from 'react';
import { SocketProvider } from './hooks/useSocket';
import { UsernameInput } from './screens/UsernameInput';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import type { Card, GamePlayer } from './types';

type Screen = 'username' | 'lobby' | 'game';

interface GameData {
  hand: Card[];
  players: GamePlayer[];
  myColor: string;
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('username');
  const [username, setUsername] = useState('');
  const [gameData, setGameData] = useState<GameData | null>(null);

  const handleGameStart = useCallback((data: GameData) => {
    setGameData(data);
    setScreen('game');
  }, []);

  const handleGameOver = useCallback(() => {
    setGameData(null);
    setScreen('lobby');
  }, []);

  return (
    <>
      {screen === 'username' && (
        <UsernameInput
          onJoin={(name) => {
            setUsername(name);
            setScreen('lobby');
          }}
        />
      )}
      {screen === 'lobby' && (
        <Lobby
          username={username}
          onGameStart={handleGameStart}
        />
      )}
      {screen === 'game' && gameData && (
        <Game onGameOver={handleGameOver} initialData={gameData} />
      )}
    </>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;
