import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { PlayerHand } from '../components/PlayerHand';
import { CardComponent } from '../components/CardComponent';
import type {
  Card, GamePlayer, CardDroppedData,
  CardPassedData, CardUndoneData, CardArrangedData,
  PlayerLeftData, GameOverData
} from '../types';

interface Props {
  initialData: {
    hand: Card[];
    players: GamePlayer[];
    myColor: string;
  };
  onGameOver: () => void;
  isSpectator?: boolean;
}

interface PileEntry {
  playerId: string;
  cards: Card[];
}

export function Game({ initialData, onGameOver, isSpectator = false }: Props) {
  const { socket } = useSocket();
  const { playDrop, playPass, playUndo, playGameOver } = useSound();
  const [hand, setHand] = useState<Card[]>(initialData.hand);
  const [opponents, setOpponents] = useState<GamePlayer[]>(initialData.players);
  const myColor = initialData.myColor;
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pile, setPile] = useState<PileEntry[]>([]);
  const [lastDropIsMine, setLastDropIsMine] = useState(false);
  const [passBubbles, setPassBubbles] = useState<{ id: string; playerId: string }[]>([]);
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [loserColor, setLoserColor] = useState<string>('');

  const handleCardDropped = useCallback((data: CardDroppedData) => {
    playDrop();
    setPile((prev) => [...prev, { playerId: data.playerId, cards: data.cards }]);

    if (data.playerId === socket?.id) {
      setHand((prev) => {
        const dropKeys = new Set(data.cards.map((c) => `${c.suit}-${c.rank}`));
        return prev.filter((c) => !dropKeys.has(`${c.suit}-${c.rank}`));
      });
      setSelectedIndices(new Set());
      setLastDropIsMine(true);
    } else {
      setOpponents((prev) =>
        prev.map((opp) =>
          opp.id === data.playerId
            ? { ...opp, cardCount: opp.cardCount - data.cards.length }
            : opp
        )
      );
      setLastDropIsMine(false);
    }
  }, [socket?.id]);

  const handleCardPassed = useCallback((data: CardPassedData) => {
    playPass();
    const bubbleId = `${data.playerId}-${Date.now()}`;
    setPassBubbles((prev) => [...prev, { id: bubbleId, playerId: data.playerId }]);
    setTimeout(() => {
      setPassBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 3000);
  }, []);

  const handleCardUndone = useCallback((data: CardUndoneData & { cards?: Card[] }) => {
    playUndo();
    setPile((prev) => prev.slice(0, -1));
    setLastDropIsMine(false);
    if (data.cards && data.playerId === socket?.id) {
      setHand((prev) => [...prev, ...data.cards!]);
    }
  }, [socket?.id]);

  const handleCardArranged = useCallback((data: CardArrangedData) => {
    if (data.playerId === socket?.id) {
      setHand((prev) => {
        const next = [...prev];
        const [card] = next.splice(data.fromIndex, 1);
        next.splice(data.toIndex, 0, card);
        return next;
      });
    }
  }, [socket?.id]);

  const handlePlayerLeft = useCallback((data: PlayerLeftData) => {
    setOpponents((prev) => prev.filter((o) => o.id !== data.playerId));
  }, []);

  const handleGameOverEvent = useCallback((data: GameOverData & { loserColor: string }) => {
    playGameOver();
    setGameOver(data);
    setLoserColor(data.loserColor || '');
    setTimeout(() => {
      setGameOver(null);
      onGameOver();
    }, 5000);
  }, [onGameOver]);

  useEffect(() => {
    if (!socket) return;

    socket.on('card_dropped', handleCardDropped as any);
    socket.on('card_passed', handleCardPassed);
    socket.on('card_undone', handleCardUndone);
    socket.on('card_arranged', handleCardArranged);
    socket.on('player_left', handlePlayerLeft);
    socket.on('game_over', handleGameOverEvent as any);

    return () => {
      socket.off('card_dropped', handleCardDropped as any);
      socket.off('card_passed', handleCardPassed);
      socket.off('card_undone', handleCardUndone);
      socket.off('card_arranged', handleCardArranged);
      socket.off('player_left', handlePlayerLeft);
      socket.off('game_over', handleGameOverEvent as any);
    };
  }, [socket, handleCardDropped, handleCardPassed, handleCardUndone, handleCardArranged, handlePlayerLeft, handleGameOverEvent]);

  // Arrow key handler for card arrangement
  useEffect(() => {
    if (selectedIndices.size !== 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const fromIndex = Array.from(selectedIndices)[0];
        const toIndex = e.key === 'ArrowLeft' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= hand.length) return;
        socket?.emit('arrange', { fromIndex, toIndex });
        setSelectedIndices(new Set([toIndex]));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndices, hand.length, socket]);

  const toggleCard = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleDrop = () => {
    if (selectedIndices.size === 0 || !socket) return;
    const indices = Array.from(selectedIndices);
    socket.emit('drop', { cardIndices: indices });
  };

  const handlePass = () => {
    if (!socket) return;
    socket.emit('pass');
  };

  const handleUndo = () => {
    if (!socket) return;
    socket.emit('undo');
  };

  const getOpponentPosition = (index: number): 'top' | 'left' | 'right' => {
    const positions: Array<'top' | 'left' | 'right'> = ['top', 'left', 'right'];
    return positions[index] ?? 'left';
  };

  const getOpponentStyles = (pos: string) => {
    switch (pos) {
      case 'top': return 'top-4 left-1/2 -translate-x-1/2';
      case 'left': return 'left-4 top-1/2 -translate-y-1/2 flex-col';
      case 'right': return 'right-4 top-1/2 -translate-y-1/2 flex-col';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-green-700 relative overflow-hidden">
      {/* Green felt pattern */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(34,197,94,0.15) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(34,197,94,0.1) 0%, transparent 50%),
            radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 16px 16px',
        }}
      />

      {/* Pass bubbles */}
      {passBubbles.map((bubble) => {
        const isMine = bubble.playerId === socket?.id;
        const opp = opponents.find((o) => o.id === bubble.playerId);
        return (
          <div
            key={bubble.id}
            className={`absolute z-50 pointer-events-none ${
              isMine ? 'bottom-40 left-1/2 -translate-x-1/2' : 'top-16 left-1/2 -translate-x-1/2'
            }`}
          >
            <div className="bg-white text-4xl px-4 py-2 rounded-2xl shadow-lg animate-bounce">
              🤚
            </div>
            {opp && (
              <div className="text-white text-xs text-center mt-1">{opp.username}</div>
            )}
          </div>
        );
      })}

      {/* Opponents */}
      <div className="absolute inset-0 pointer-events-none">
        {opponents.map((opp, i) => {
          const pos = getOpponentPosition(i);
          return (
            <div key={opp.id} className={`absolute ${getOpponentStyles(pos)} flex items-center gap-2`}>
              <div className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: opp.color }} />
                {opp.username}
              </div>
              <PlayerHand
                cards={[]}
                selectedIndices={new Set()}
                isSelf={false}
                cardCount={opp.cardCount}
                position={pos}
              />
            </div>
          );
        })}
      </div>

      {/* Central pile */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-wrap justify-center items-start gap-2 max-w-xl p-4">
          <AnimatePresence>
            {pile.map((entry, pileIdx) => {
              const ownerColor = opponents.find((o) => o.id === entry.playerId)?.color ?? myColor;
              return (
                <motion.div
                  key={pileIdx}
                  initial={{ opacity: 0, scale: 0.5, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex gap-1"
                >
                  {entry.cards.map((card, cardIdx) => (
                    <div
                      key={cardIdx}
                      className="rounded-lg"
                      style={{ boxShadow: `0 0 0 2px ${ownerColor}` }}
                    >
                      <CardComponent card={card} scale={0.6} />
                    </div>
                  ))}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Undo button */}
      {!isSpectator && lastDropIsMine && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleUndo}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold rounded-lg shadow-lg transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      {/* Self hand */}
      {isSpectator ? (
        isSpectator && opponents.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded text-center">
              Spectating
            </div>
          </div>
        )
      ) : (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded">
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: myColor }} />
              You ({hand.length} cards)
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={handlePass}
                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-400 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Pass
              </button>
              {selectedIndices.size > 0 && (
                <button
                  onClick={handleDrop}
                  className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors"
                >
                  Drop ({selectedIndices.size})
                </button>
              )}
            </div>
          </div>
          <PlayerHand
            cards={hand}
            selectedIndices={selectedIndices}
            playerColor={myColor}
            isSelf
            onCardClick={toggleCard}
          />
          <div className="text-center mt-2 text-white/40 text-xs">
            Click a card, then ← → to rearrange
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-6xl font-bold text-white mb-4"
            >
              Loser: {gameOver.loserUsername}
            </motion.div>
            {loserColor && (
              <div className="text-sm text-white/70 mb-6">
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: loserColor }} />
              </div>
            )}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-1 mb-6"
            >
              {gameOver.cards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <CardComponent card={card} scale={0.6} />
                </motion.div>
              ))}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/50 text-sm"
            >
              Returning to lobby...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
