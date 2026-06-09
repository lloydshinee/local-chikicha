import type { Card } from '../types';
import { cardImagePath, cardBackPath } from '../types';

interface CardComponentProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  playerColor?: string;
  scale?: number;
  onClick?: () => void;
  className?: string;
}

export function CardComponent({
  card,
  faceDown = false,
  selected = false,
  playerColor,
  scale = 0.6,
  onClick,
  className = '',
}: CardComponentProps) {
  const w = 242 * scale;
  const h = 340 * scale;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden transition-transform ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        width: w,
        height: h,
        transform: selected ? 'translateY(-10px)' : undefined,
        boxShadow: selected && playerColor
          ? `0 0 0 3px ${playerColor}, 0 4px 12px rgba(0,0,0,0.3)`
          : '0 2px 6px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}
    >
      <img
        src={faceDown ? cardBackPath() : cardImagePath(card)}
        alt={faceDown ? 'Card back' : `${card.rank} of ${card.suit}`}
        width={w}
        height={h}
        className="block"
        draggable={false}
      />
    </div>
  );
}
