import { useState } from 'react';
import { SocketProvider } from './hooks/useSocket';
import { UsernameInput } from './screens/UsernameInput';
import { Lobby } from './screens/Lobby';

type Screen = 'username' | 'lobby' | 'game';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('username');
  const [username, setUsername] = useState('');

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
          onGameStart={() => setScreen('game')}
        />
      )}
      {screen === 'game' && (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-2xl text-gray-600">Game screen coming soon...</div>
        </div>
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
