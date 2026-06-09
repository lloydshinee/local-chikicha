import { useState, useCallback } from 'react';
import { SocketProvider } from './hooks/useSocket';
import { UsernameInput } from './screens/UsernameInput';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import type { Card, GamePlayer } from './types';

type Screen = 'username' | 'lobby' | 'game' | 'spectating';

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

function AppContent() {
  const [screen, setScreen] = useState<Screen>('username');
  const [username, setUsername] = useState('');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [spectateData, setSpectateData] = useState<SpectateData | null>(null);

  const handleGameStart = useCallback((data: GameData) => {
    setGameData(data);
    setSpectateData(null);
    setScreen('game');
  }, []);

  const handleSpectate = useCallback((data: SpectateData) => {
    setSpectateData(data);
    setGameData(null);
    setScreen('spectating');
  }, []);

  const handleGameOver = useCallback(() => {
    setGameData(null);
    setSpectateData(null);
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
          onSpectate={handleSpectate}
        />
      )}
      {screen === 'game' && gameData && (
        <Game
          initialData={gameData}
          onGameOver={handleGameOver}
          isSpectator={false}
        />
      )}
      {screen === 'spectating' && spectateData && (
        <Game
          initialData={{
            hand: [],
            players: spectateData.players,
            myColor: '',
            currentTurnPlayerId: spectateData.currentTurnPlayerId,
          }}
          onGameOver={handleGameOver}
          isSpectator
        />
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
