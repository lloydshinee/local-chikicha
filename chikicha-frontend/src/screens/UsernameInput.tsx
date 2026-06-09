import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';

interface Props {
  onJoin: (username: string) => void;
}

export function UsernameInput({ onJoin }: Props) {
  const [username, setUsername] = useState('');
  const { socket } = useSocket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    socket?.emit('join', { username: name });
    onJoin(name);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-200">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-80">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">chikicha</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          maxLength={20}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-center text-gray-700 text-lg"
          autoFocus
        />
        <button
          type="submit"
          disabled={!username.trim()}
          className="w-full mt-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Join
        </button>
      </form>
    </div>
  );
}
