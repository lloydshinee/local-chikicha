import { motion } from 'framer-motion';
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
  animateEntrance?: boolean;
}

export function CardComponent({
  card,
  faceDown = false,
  selected = false,
  playerColor,
  scale = 0.6,
  onClick,
  className = '',
  animateEntrance = false,
}: CardComponentProps) {
  const w = 242 * scale;
  const h = 340 * scale;

  return (
    <motion.div
      onClick={onClick}
      initial={animateEntrance ? { opacity: 0, y: -20 } : undefined}
      animate={{
        opacity: 1,
        y: selected ? -10 : 0,
        boxShadow: selected && playerColor
          ? `0 0 0 3px ${playerColor}, 0 4px 12px rgba(0,0,0,0.3)`
          : '0 2px 6px rgba(0,0,0,0.2)',
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`relative rounded-lg overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        width: w,
        height: h,
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
    </motion.div>
  );
}
