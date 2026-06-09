import type { Card } from '../types';
import { CardComponent } from './CardComponent';

interface PlayerHandProps {
  cards: Card[];
  selectedIndices: Set<number>;
  playerColor?: string;
  isSelf: boolean;
  onCardClick?: (index: number) => void;
  position?: 'bottom' | 'top' | 'left' | 'right';
  cardCount?: number;
}

export function PlayerHand({
  cards,
  selectedIndices,
  playerColor,
  isSelf,
  onCardClick,
  position = 'bottom',
  cardCount,
}: PlayerHandProps) {
  if (!isSelf) {
    const count = cardCount ?? cards.length;
    if (count === 0) return null;

    if (count <= 10) {
      return (
        <div className="flex justify-center" style={{ gap: '-20px' }}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              style={{ marginLeft: i > 0 ? '-100px' : undefined }}
            >
              <CardComponent
                card={{ suit: 'spades', rank: 'A' }}
                faceDown
                scale={0.6}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="relative">
        <CardComponent
          card={{ suit: 'spades', rank: 'A' }}
          faceDown
          scale={0.6}
        />
        <div className="absolute -top-2 -right-2 bg-gray-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {count}
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="flex justify-center" style={{ gap: '0px' }}>
      {cards.map((card, i) => (
        <div
          key={`${card.suit}-${card.rank}-${i}`}
          style={{ marginLeft: i > 0 ? '-100px' : undefined }}
        >
          <CardComponent
            card={card}
            selected={selectedIndices.has(i)}
            playerColor={playerColor}
            scale={0.6}
            onClick={() => onCardClick?.(i)}
          />
        </div>
      ))}
    </div>
  );
}
