import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { detectCombo } from '../rules';
import type { ComboType } from '../rules';
import type {
  Card, GamePlayer, CardDroppedData,
  CardPassedData, CardArrangedData,
  PlayerLeftData, GameOverData, TurnChangeData,
} from '../types';

interface PileEntry {
  playerId: string;
  cards: Card[];
  comboType?: ComboType;
}

interface UseGameLogicInput {
  socket: Socket | null;
  initialData: {
    hand: Card[];
    players: GamePlayer[];
    myColor: string;
    currentTurnPlayerId?: string;
  };
  isSpectator: boolean;
  onGameOver: () => void;
  playDrop: () => void;
  playPass: () => void;
  playGameOver: () => void;
}

export function getOpponentPosition(index: number, total: number): 'top' | 'top-left' | 'top-right' | 'left' | 'right' {
  if (total === 1) return 'top';
  if (total === 2) {
    if (index === 0) return 'left';
    return 'right';
  }
  if (total === 3) {
    if (index === 0) return 'top';
    if (index === 1) return 'left';
    return 'right';
  }
  if (total === 4) {
    if (index === 0) return 'top-left';
    if (index === 1) return 'top-right';
    if (index === 2) return 'left';
    return 'right';
  }
  return 'left';
}

export function getOpponentStyles(pos: string): string {
  switch (pos) {
    case 'top': return 'top-2 left-1/2 -translate-x-1/2 sm:top-4';
    case 'top-left': return 'top-2 left-[25%] -translate-x-1/2 sm:top-4 sm:left-[30%]';
    case 'top-right': return 'top-2 right-[25%] translate-x-1/2 sm:top-4 sm:right-[30%]';
    case 'left': return 'left-2 sm:left-4 top-1/2 -translate-y-1/2 flex-col';
    case 'right': return 'right-2 sm:right-4 top-1/2 -translate-y-1/2 flex-col';
    default: return '';
  }
}

export function useGameLogic({
  socket,
  initialData,
  isSpectator,
  onGameOver,
  playDrop,
  playPass,
  playGameOver,
}: UseGameLogicInput) {
  const [hand, setHand] = useState<Card[]>(initialData.hand);
  const [opponents, setOpponents] = useState<GamePlayer[]>(initialData.players);
  const myColor = initialData.myColor;
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pile, setPile] = useState<PileEntry[]>([]);
  const [passBubbles, setPassBubbles] = useState<{ id: string; playerId: string }[]>([]);
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [currentTurnId, setCurrentTurnId] = useState<string>(initialData.currentTurnPlayerId || '');
  const [isNewRound, setIsNewRound] = useState(true);
  const [currentTopCombo, setCurrentTopCombo] = useState<ReturnType<typeof detectCombo>>(null);

  const isMyTurn = !isSpectator && currentTurnId === socket?.id;

  const handleCardDropped = useCallback((data: CardDroppedData) => {
    playDrop();
    setPile((prev) => [...prev, { playerId: data.playerId, cards: data.cards, comboType: data.comboType as ComboType }]);
    setIsNewRound(false);

    if (data.playerId === socket?.id) {
      setHand((prev) => {
        const dropKeys = new Set(data.cards.map((c) => `${c.suit}-${c.rank}`));
        return prev.filter((c) => !dropKeys.has(`${c.suit}-${c.rank}`));
      });
      setSelectedIndices(new Set());
    } else {
      setOpponents((prev) =>
        prev.map((opp) =>
          opp.id === data.playerId
            ? { ...opp, cardCount: opp.cardCount - data.cards.length }
            : opp
        )
      );
    }
  }, [socket?.id, playDrop]);

  const handleCardPassed = useCallback((data: CardPassedData) => {
    playPass();
    const bubbleId = `${data.playerId}-${Date.now()}`;
    setPassBubbles((prev) => [...prev, { id: bubbleId, playerId: data.playerId }]);
    setTimeout(() => {
      setPassBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 3000);
  }, [playPass]);

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

  const handleTurnChange = useCallback((data: TurnChangeData) => {
    setCurrentTurnId(data.playerId);
    setIsNewRound(data.isNewRound ?? false);
    if (data.currentCombo === null) {
      setCurrentTopCombo(null);
    } else if (data.currentCombo) {
      setCurrentTopCombo({
        type: data.currentCombo.type as ComboType,
        primaryRank: data.currentCombo.primaryRank as any,
        primarySuit: data.currentCombo.primarySuit as any,
        cards: [],
      });
    }
  }, []);

  const handleGameOverEvent = useCallback((data: GameOverData) => {
    playGameOver();
    setGameOver(data);
  }, [playGameOver]);

  const handleLobbyUpdate = useCallback(() => {
    setGameOver(null);
    onGameOver();
  }, [onGameOver]);

  useEffect(() => {
    if (!socket) return;

    socket.on('card_dropped', handleCardDropped as any);
    socket.on('card_passed', handleCardPassed);
    socket.on('card_arranged', handleCardArranged);
    socket.on('player_left', handlePlayerLeft);
    socket.on('turn_change', handleTurnChange as any);
    socket.on('game_over', handleGameOverEvent as any);
    socket.on('lobby_update', handleLobbyUpdate);

    return () => {
      socket.off('card_dropped', handleCardDropped as any);
      socket.off('card_passed', handleCardPassed);
      socket.off('card_arranged', handleCardArranged);
      socket.off('player_left', handlePlayerLeft);
      socket.off('turn_change', handleTurnChange as any);
      socket.off('game_over', handleGameOverEvent as any);
      socket.off('lobby_update', handleLobbyUpdate);
    };
  }, [socket, handleCardDropped, handleCardPassed, handleCardArranged, handlePlayerLeft, handleTurnChange, handleGameOverEvent, handleLobbyUpdate]);

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
    if (selectedIndices.size === 0 || !socket || !isMyTurn) return;
    const indices = Array.from(selectedIndices);
    socket.emit('drop', { cardIndices: indices });
  };

  const handlePass = () => {
    if (!socket || !isMyTurn) return;
    socket.emit('pass');
  };

  const handleArrange = (fromIndex: number, toIndex: number) => {
    if (!socket) return;
    socket.emit('arrange', { fromIndex, toIndex });
  };

  const turnPlayer = opponents.find((o) => o.id === currentTurnId);
  const turnPlayerIsMe = currentTurnId === socket?.id;

  const latestEntry = pile[pile.length - 1];
  const prevEntry = pile[pile.length - 2];

  const getOwnerColor = (playerId: string) =>
    opponents.find((o) => o.id === playerId)?.color ?? myColor;

  const getPlayerName = (playerId: string) =>
    opponents.find((o) => o.id === playerId)?.username ?? 'You';

  return {
    hand,
    opponents,
    myColor,
    selectedIndices,
    pile,
    passBubbles,
    gameOver,
    currentTurnId,
    isNewRound,
    currentTopCombo,
    isMyTurn,
    toggleCard,
    handleDrop,
    handlePass,
    handleArrange,
    turnPlayer,
    turnPlayerIsMe,
    latestEntry,
    prevEntry,
    getOwnerColor,
    getPlayerName,
  };
}
