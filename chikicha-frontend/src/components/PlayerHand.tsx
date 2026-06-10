import { useState, useCallback } from 'react';
import type { Card } from '../types';
import { CardComponent } from './CardComponent';

interface PlayerHandProps {
  cards: Card[];
  selectedIndices: Set<number>;
  playerColor?: string;
  isSelf: boolean;
  onCardClick?: (index: number) => void;
  cardCount?: number;
  onArrange?: (fromIndex: number, toIndex: number) => void;
  scale?: number;
  overlap?: number;
}

export function PlayerHand({
  cards,
  selectedIndices,
  playerColor,
  isSelf,
  onCardClick,
  cardCount,
  onArrange,
  scale = 0.6,
  overlap = -100,
}: PlayerHandProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDragFromIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) {
      setDragOverIndex(null);
      setDragFromIndex(null);
      return;
    }
    onArrange?.(fromIndex, toIndex);
    setDragOverIndex(null);
    setDragFromIndex(null);
  }, [onArrange]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    setDragFromIndex(null);
  }, []);

  if (!isSelf) {
    const count = cardCount ?? cards.length;
    if (count === 0) return null;

    return (
      <div className="relative">
        <CardComponent
          card={{ suit: 'spades', rank: 'A' }}
          faceDown
          scale={0.3}
        />
        <div className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
          {count}
        </div>
      </div>
    );
  }

  if (cards.length === 0) return null;

  return (
    <div className="flex justify-center" style={{ gap: '0px' }}>
      {cards.map((card, i) => {
        const isDragging = dragFromIndex === i;
        return (
          <div
            key={`${card.suit}-${card.rank}-${i}`}
            style={{
              marginLeft: i > 0 ? `${overlap}px` : undefined,
              opacity: isDragging ? 0.5 : 1,
              position: 'relative',
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
          >
            {dragOverIndex === i && dragFromIndex !== i && (
              <div
                style={{
                  position: 'absolute',
                  left: -3,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: playerColor ?? '#3B82F6',
                  borderRadius: 2,
                  zIndex: 50,
                  opacity: 0.8,
                }}
              />
            )}
            <CardComponent
              card={card}
              selected={selectedIndices.has(i)}
              playerColor={playerColor}
              scale={scale}
              onClick={() => onCardClick?.(i)}
            />
          </div>
        );
      })}
    </div>
  );
}
