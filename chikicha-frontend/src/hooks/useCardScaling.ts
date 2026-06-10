import { useState, useEffect, useMemo } from 'react';

export function computeCardScale(winWidth: number, handLength: number, isMobile: boolean): number {
  if (!isMobile) return 0.6;
  const cardW = 242;
  const visiblePerCard = 40;
  const padding = 32;
  const available = winWidth - padding;
  const firstCard = cardW;
  const eachExtra = visiblePerCard;
  const maxScale = available / (firstCard + (handLength - 1) * eachExtra);
  return Math.max(0.28, Math.min(0.6, maxScale));
}

export function computeCardOverlap(selfCardScale: number, isMobile: boolean): number {
  if (!isMobile) return -100;
  return -(242 * selfCardScale - 40);
}

export function useCardScaling(handLength: number) {
  const [winWidth, setWinWidth] = useState(() => {
    if (typeof window === 'undefined') return 1024;
    return window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isMobile = useMemo(() => winWidth < 640, [winWidth]);

  const selfCardScale = useMemo(() => {
    return computeCardScale(winWidth, handLength, isMobile);
  }, [winWidth, handLength, isMobile]);

  const selfCardOverlap = useMemo(() => {
    return computeCardOverlap(selfCardScale, isMobile);
  }, [isMobile, selfCardScale]);

  return { isMobile, selfCardScale, selfCardOverlap };
}
