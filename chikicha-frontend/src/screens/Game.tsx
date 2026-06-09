import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { PlayerHand } from '../components/PlayerHand';
import type { Card, GamePlayer } from '../types';

interface Props {
  initialData: {
    hand: Card[];
    players: GamePlayer[];
    myColor: string;
  };
  onGameOver: () => void;
}

export function Game({ initialData, onGameOver }: Props) {
  const { socket } = useSocket();
  const [hand, setHand] = useState<Card[]>(initialData.hand);
  const [opponents] = useState<GamePlayer[]>(initialData.players);
  const [myColor] = useState(initialData.myColor);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

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

  const getOpponentPosition = (index: number): 'top' | 'left' | 'right' => {
    const positions: Array<'top' | 'left' | 'right'> = ['top', 'left', 'right'];
    return positions[index] ?? 'left';
  };

  const isVertical = (pos: string) => pos === 'left' || pos === 'right';

  return (
    <div className="min-h-screen bg-green-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Opponents */}
      <div className="absolute inset-0 pointer-events-none">
        {opponents.map((opp, i) => {
          const pos = getOpponentPosition(i);
          const vertStyle = isVertical(pos)
            ? pos === 'left'
              ? 'left-4 top-1/2 -translate-y-1/2 flex-col'
              : 'right-4 top-1/2 -translate-y-1/2 flex-col'
            : 'top-4 left-1/2 -translate-x-1/2';

          return (
            <div key={opp.id} className={`absolute ${vertStyle} flex items-center gap-2`}>
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

      {/* Central play area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-2 border-white/10 rounded-full w-64 h-64 flex items-center justify-center">
          <span className="text-white/20 text-sm">chikicha</span>
        </div>
      </div>

      {/* Self hand */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded mb-2 text-center">
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: myColor }} />
          You ({hand.length} cards)
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
