import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { PlayerHand } from '../components/PlayerHand';
import { CardComponent } from '../components/CardComponent';
import { detectCombo, canBeat } from '@backend/rules';
import type { ComboType } from '@backend/rules';
import type {
  Card, GamePlayer, CardDroppedData,
  CardPassedData, CardArrangedData,
  PlayerLeftData, GameOverData, TurnChangeData,
  FinishOrderEntry,
} from '../types';

interface Props {
  initialData: {
    hand: Card[];
    players: GamePlayer[];
    myColor: string;
    currentTurnPlayerId?: string;
  };
  onGameOver: () => void;
  isSpectator?: boolean;
}

interface PileEntry {
  playerId: string;
  cards: Card[];
  comboType?: ComboType;
}

const COMBO_LABELS: Record<ComboType, string> = {
  SINGLE: 'Single',
  PAIR: 'Pair',
  THREE: 'Three of a Kind',
  STRAIGHT: 'Straight',
  FLUSH: 'Flush',
  FULL_HOUSE: 'Full House',
  FOUR: 'Four of a Kind',
  STRAIGHT_FLUSH: 'Straight Flush',
};

export function Game({ initialData, onGameOver, isSpectator = false }: Props) {
  const { socket } = useSocket();
  const { playDrop, playPass, playGameOver } = useSound();
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

  const selectedCards = useMemo(() => {
    return Array.from(selectedIndices).sort((a, b) => a - b).map((i) => hand[i]).filter(Boolean);
  }, [selectedIndices, hand]);

  const selectedCombo = useMemo(() => {
    if (selectedCards.length === 0) return null;
    return detectCombo(selectedCards);
  }, [selectedCards]);

  const canPlay = useMemo(() => {
    if (selectedIndices.size === 0) return false;
    if (!selectedCombo) return false;
    if (!currentTopCombo) return true;
    return canBeat(selectedCombo, currentTopCombo);
  }, [selectedIndices, selectedCombo, currentTopCombo]);

  const validationMessage = useMemo(() => {
    if (selectedIndices.size === 0) return null;
    if (!selectedCombo) return 'Invalid combination';
    if (currentTopCombo && !canBeat(selectedCombo, currentTopCombo)) {
      const topLabel = COMBO_LABELS[currentTopCombo.type];
      return `Must beat ${topLabel}`;
    }
    return null;
  }, [selectedIndices, selectedCombo, currentTopCombo]);

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
  }, [socket?.id]);

  const handleCardPassed = useCallback((data: CardPassedData) => {
    playPass();
    const bubbleId = `${data.playerId}-${Date.now()}`;
    setPassBubbles((prev) => [...prev, { id: bubbleId, playerId: data.playerId }]);
    setTimeout(() => {
      setPassBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
    }, 3000);
  }, []);

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
  }, []);

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
    if (selectedIndices.size === 0 || !socket || !isMyTurn) return;
    const indices = Array.from(selectedIndices);
    socket.emit('drop', { cardIndices: indices });
  };

  const handlePass = () => {
    if (!socket || !isMyTurn) return;
    socket.emit('pass');
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

  const turnPlayer = opponents.find((o) => o.id === currentTurnId);
  const turnPlayerIsMe = currentTurnId === socket?.id;

  const latestEntry = pile[pile.length - 1];
  const prevEntry = pile[pile.length - 2];

  const getOwnerColor = (playerId: string) =>
    opponents.find((o) => o.id === playerId)?.color ?? myColor;

  const getPlayerName = (playerId: string) =>
    opponents.find((o) => o.id === playerId)?.username ?? 'You';

  return (
    <div className="min-h-screen bg-green-700 relative overflow-hidden">
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

      {/* Turn indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/40 text-white text-sm px-4 py-1 rounded-full">
          {turnPlayerIsMe ? (
            <span className="font-bold">&#9654; Your turn</span>
          ) : turnPlayer ? (
            <span>
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: turnPlayer.color }} />
              {turnPlayer.username}'s turn
            </span>
          ) : (
            <span>Waiting...</span>
          )}
        </div>
      </div>

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
          const isTurn = opp.id === currentTurnId;
          return (
            <div key={opp.id} className={`absolute ${getOpponentStyles(pos)} flex items-center gap-2`}>
              <div className={`text-white text-xs font-semibold px-2 py-1 rounded whitespace-nowrap transition-colors ${
                isTurn ? 'bg-yellow-500/60 ring-2 ring-yellow-400' : 'bg-black/30'
              }`}>
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
        <div className="flex flex-col items-center gap-2 max-w-xl p-4">
          <AnimatePresence>
            {/* Previous hand (faded) */}
            {prevEntry && (
              <motion.div
                key={`prev-${pile.length - 2}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.35, scale: 0.7 }}
                className="flex gap-1"
              >
                {prevEntry.cards.map((card, cardIdx) => (
                  <div key={cardIdx} className="rounded-lg"
                    style={{
                      boxShadow: `0 0 0 2px ${getOwnerColor(prevEntry.playerId)}44`,
                    }}
                  >
                    <CardComponent card={card} scale={0.45} />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current hand (prominent) */}
          <AnimatePresence>
            {latestEntry && (
              <motion.div
                key={`current-${pile.length - 1}`}
                initial={{ opacity: 0, scale: 0.5, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="text-white text-xs font-semibold bg-black/50 px-2 py-0.5 rounded-full"
                  style={{ boxShadow: `0 0 8px ${getOwnerColor(latestEntry.playerId)}88` }}
                >
                  {latestEntry.comboType ? COMBO_LABELS[latestEntry.comboType] : 'Drop'} by {getPlayerName(latestEntry.playerId)}
                </div>
                <div className="flex gap-1">
                  {latestEntry.cards.map((card, cardIdx) => (
                    <div
                      key={cardIdx}
                      className="rounded-lg animate-pulse"
                      style={{
                        boxShadow: `0 0 0 4px ${getOwnerColor(latestEntry.playerId)}, 0 0 16px ${getOwnerColor(latestEntry.playerId)}88`,
                      }}
                    >
                      <CardComponent card={card} scale={0.6} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New round indicator */}
      {isMyTurn && isNewRound && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-yellow-500/90 text-black text-lg font-bold px-6 py-2 rounded-full shadow-xl"
          >
            New round — play any combination!
          </motion.div>
        </div>
      )}

      {/* Self hand */}
      {isSpectator ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="text-white text-xs font-semibold bg-black/30 px-2 py-1 rounded text-center">
            Spectating
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-white text-xs font-semibold px-2 py-1 rounded transition-colors ${
              isMyTurn ? 'bg-yellow-500/60 ring-2 ring-yellow-400' : 'bg-black/30'
            }`}>
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: myColor }} />
              You ({hand.length} cards)
              {isMyTurn && ' — Your turn'}
            </div>
            <div className="flex flex-col items-end gap-1 ml-4">
              <div className="flex gap-2">
                {isMyTurn && (
                  <>
                    <button
                      onClick={handlePass}
                      className="px-3 py-1.5 bg-gray-500 hover:bg-gray-400 text-white text-sm font-bold rounded-lg transition-colors"
                    >
                      Pass
                    </button>
                    <button
                      onClick={handleDrop}
                      disabled={!canPlay}
                      className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${
                        canPlay
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Drop{selectedIndices.size > 0 ? ` (${selectedIndices.size})` : ''}
                    </button>
                  </>
                )}
                {!isMyTurn && (
                  <span className="text-white/50 text-xs px-3 py-1.5">
                    {turnPlayer ? `Waiting for ${turnPlayerIsMe ? 'you' : turnPlayer.username}...` : 'Waiting...'}
                  </span>
                )}
              </div>
              {validationMessage && isMyTurn && (
                <div className="text-red-300 text-xs">
                  {validationMessage}
                </div>
              )}
              {!validationMessage && canPlay && selectedCombo && isMyTurn && (
                <div className="text-green-300 text-xs">
                  {COMBO_LABELS[selectedCombo.type]}
                </div>
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
              className="text-4xl font-bold text-white mb-6"
            >
              Game Over!
            </motion.div>

            {gameOver.finishOrder && gameOver.finishOrder.length > 0 ? (
              <div className="flex flex-col gap-2 mb-6">
                {gameOver.finishOrder.map((entry: FinishOrderEntry, idx: number) => {
                  const isLoser = entry.playerId === gameOver.loserId;
                  return (
                    <motion.div
                      key={entry.playerId}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + idx * 0.15 }}
                      className={`text-lg font-semibold px-4 py-2 rounded-lg ${
                        isLoser ? 'bg-red-900/60 text-red-200' : 'bg-white/10 text-white'
                      }`}
                    >
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
                      {entry.position === 1 ? '🥇 ' : entry.position === 2 ? '🥈 ' : entry.position === 3 ? '🥉 ' : ''}
                      {isLoser ? `Loser: ${entry.username}` : `${entry.position}st: ${entry.username}`}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-5xl font-bold text-white mb-4"
                >
                  Loser: {gameOver.loserUsername}
                </motion.div>
                {gameOver.loserColor && (
                  <div className="text-sm text-white/70 mb-6">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: gameOver.loserColor }} />
                  </div>
                )}
              </>
            )}

            {gameOver.cards && gameOver.cards.length > 0 && (
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
            )}

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
