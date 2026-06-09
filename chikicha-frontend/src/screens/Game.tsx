import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { PlayerHand } from '../components/PlayerHand';
import { CardComponent } from '../components/CardComponent';
import type { Card, GamePlayer, CardDroppedData, CardPassedData, CardUndoneData } from '../types';

interface Props {
  initialData: {
    hand: Card[];
    players: GamePlayer[];
    myColor: string;
  };
  onGameOver: () => void;
}

interface PileEntry {
  playerId: string;
  cards: Card[];
}

export function Game({ initialData, onGameOver }: Props) {
  const { socket } = useSocket();
  const [hand, setHand] = useState<Card[]>(initialData.hand);
  const [opponents, setOpponents] = useState<GamePlayer[]>(initialData.players);
  const myColor = initialData.myColor;
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pile, setPile] = useState<PileEntry[]>([]);
  const [lastDropIsMine, setLastDropIsMine] = useState(false);
  const [passBubbles, setPassBubbles] = useState<{ id: string; playerId: string }[]>([]);

  const handleCardDropped = useCallback((data: CardDroppedData) => {
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
    const bubbleId = `${data.playerId}-${Date.now()}`;
    setPassBubbles((prev) => [...prev, { id: bubbleId, playerId: data.playerId }]);
    setTimeout(() => {
      setPassBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 3000);
  }, []);

  const handleCardUndone = useCallback((data: CardUndoneData) => {
    setPile((prev) => prev.filter((_, i) => i !== prev.length - 1));
    setLastDropIsMine(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('card_dropped', handleCardDropped as any);
    socket.on('card_passed', handleCardPassed);
    socket.on('card_undone', handleCardUndone);

    return () => {
      socket.off('card_dropped', handleCardDropped as any);
      socket.off('card_passed', handleCardPassed);
      socket.off('card_undone', handleCardUndone);
    };
  }, [socket, handleCardDropped, handleCardPassed, handleCardUndone]);

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
    // Optimistic update: the server will confirm via card_undone
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
    <div className="min-h-screen bg-green-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Pass bubbles */}
      {passBubbles.map((bubble) => {
        const isMine = bubble.playerId === socket?.id;
        const opp = opponents.find((o) => o.id === bubble.playerId);
        return (
          <div
            key={bubble.id}
            className={`absolute z-50 pointer-events-none transition-opacity duration-500 ${
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
          {pile.map((entry, pileIdx) => {
            const ownerColor = opponents.find((o) => o.id === entry.playerId)?.color ?? myColor;
            return (
              <div key={pileIdx} className="flex gap-1">
                {entry.cards.map((card, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="rounded-lg"
                    style={{ boxShadow: `0 0 0 2px ${ownerColor}` }}
                  >
                    <CardComponent card={card} scale={0.6} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Undo button */}
      {lastDropIsMine && (
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
      </div>
    </div>
  );
}
