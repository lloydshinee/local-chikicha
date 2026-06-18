import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import { useSound } from '../hooks/useSound';
import { useGameLogic, getOpponentPosition, getOpponentStyles } from '../hooks/useGameLogic';
import { useComboValidator, COMBO_LABELS } from '../hooks/useComboValidator';
import { useCardScaling } from '../hooks/useCardScaling';
import { PlayerHand } from '../components/PlayerHand';
import { CardComponent } from '../components/CardComponent';
import { Handbook } from '../components/Handbook';
import type { Card, GamePlayer } from '../types';
import type { FinishOrderEntry } from '../types';

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

export function Game({ initialData, onGameOver, isSpectator = false }: Props) {
  const { socket } = useSocket();
  const { playDrop, playPass, playGameOver, playTurnAlert } = useSound();

  const {
    hand, opponents, myColor, selectedIndices,
    pile, passBubbles, gameOver,
    currentTurnId, isNewRound, currentTopCombo,
    isMyTurn,
    toggleCard, handleDrop, handlePass, handleArrange,
    turnPlayer, turnPlayerIsMe,
    latestEntry, prevEntry,
    getOwnerColor, getPlayerName,
  } = useGameLogic({
    socket,
    initialData,
    isSpectator,
    onGameOver,
    playDrop,
    playPass,
    playGameOver,
  });

  const { selectedCombo, canPlay, validationMessage } = useComboValidator({
    selectedIndices,
    hand,
    currentTopCombo,
  });

  const { selfCardScale, selfCardOverlap } = useCardScaling(hand.length);

  const [showHandbook, setShowHandbook] = useState(false);
  const [cardsHidden, setCardsHidden] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        if (showHandbook) return;
        setCardsHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHandbook]);

  const prevIsMyTurn = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current) {
      playTurnAlert();
    }
    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn, playTurnAlert]);

  return (
    <motion.div
      className="min-h-screen bg-green-700 relative overflow-hidden"
      animate={{
        boxShadow: isMyTurn
          ? `inset 0 0 80px ${myColor}66`
          : 'inset 0 0 0px transparent',
      }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
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
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30">
        <button
          onClick={() => setShowHandbook(true)}
          className="text-xl sm:text-2xl opacity-60 hover:opacity-100 transition-opacity"
          title="Rules Book"
        >
          📖
        </button>
      </div>

      {/* Turn indicator */}
      <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-10">
        <AnimatePresence>
          {turnPlayerIsMe && (
            <motion.div
              key="my-turn-banner"
              initial={{ y: -60, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="bg-yellow-400 text-black text-base sm:text-lg font-bold px-4 sm:px-6 py-1 sm:py-2 rounded-full shadow-lg"
            >
              ▶ Your turn
            </motion.div>
          )}
          {!turnPlayerIsMe && turnPlayer && (
            <div className="bg-black/40 text-white text-xs sm:text-sm px-2 sm:px-4 py-0.5 sm:py-1 rounded-full">
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: turnPlayer.color }} />
              {turnPlayer.username}'s turn
            </div>
          )}
          {!turnPlayerIsMe && !turnPlayer && (
            <div className="bg-black/40 text-white text-xs sm:text-sm px-2 sm:px-4 py-0.5 sm:py-1 rounded-full">
              Waiting...
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Pass bubbles */}
      {passBubbles.map((bubble) => {
        const isMine = bubble.playerId === socket?.id;
        const oppIndex = opponents.findIndex((o) => o.id === bubble.playerId);
        const opp = oppIndex !== -1 ? opponents[oppIndex] : undefined;
        const oppPos = oppIndex !== -1 ? getOpponentPosition(oppIndex, opponents.length) : null;

        let bubbleClass = 'bottom-40 left-1/2 -translate-x-1/2';
        if (!isMine && oppPos) {
          switch (oppPos) {
            case 'top': bubbleClass = 'top-8 left-1/2 -translate-x-1/2'; break;
            case 'top-left': bubbleClass = 'top-8 left-[25%] -translate-x-1/2'; break;
            case 'top-right': bubbleClass = 'top-8 right-[25%] translate-x-1/2'; break;
            case 'left': bubbleClass = 'left-4 top-1/2 -translate-y-1/2'; break;
            case 'right': bubbleClass = 'right-4 top-1/2 -translate-y-1/2'; break;
          }
        }

        return (
          <div
            key={bubble.id}
            className={`absolute z-50 pointer-events-none ${bubbleClass}`}
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
          const pos = getOpponentPosition(i, opponents.length);
          const isTurn = opp.id === currentTurnId;
          const seatNumbers = ['\u2460', '\u2461', '\u2462', '\u2463'];
          return (
            <div key={opp.id} className={`absolute ${getOpponentStyles(pos)} flex items-center gap-2`}>
              <div className={`text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap transition-colors ${
                isTurn ? 'bg-yellow-500/60 ring-2 ring-yellow-400' : 'bg-black/30'
              }`}>
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: opp.color }} />
                {seatNumbers[i]} {opp.username}
              </div>
              <PlayerHand
                cards={[]}
                selectedIndices={new Set()}
                isSelf={false}
                cardCount={opp.cardCount}
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
                <div className="text-white text-[10px] sm:text-xs font-semibold bg-black/50 px-1.5 sm:px-2 py-0.5 rounded-full"
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
                    <CardComponent card={card} scale={0.45} />
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
            className="bg-yellow-500/90 text-black text-base sm:text-lg font-bold px-4 sm:px-6 py-1 sm:py-2 rounded-full shadow-xl"
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
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 max-w-[100vw] overflow-x-auto px-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex items-center justify-between mb-1 sm:mb-2 flex-nowrap gap-2">
            <div className="flex items-center gap-1">
              <div className={`text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap transition-colors ${
                isMyTurn ? 'bg-yellow-500/60 ring-2 ring-yellow-400' : 'bg-black/30'
              }`}>
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: myColor }} />
                You ({hand.length})
                {isMyTurn && ' · Turn'}
              </div>
              <button
                onClick={() => setCardsHidden((prev) => !prev)}
                className="text-sm sm:text-base px-1 py-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
                title={cardsHidden ? 'Show cards (H)' : 'Hide cards (H)'}
              >
                {cardsHidden ? '🙈' : '👀'}
              </button>
            </div>
            <div className="flex flex-col items-end gap-0.5 sm:gap-1 shrink-0">
              <div className="flex gap-1 sm:gap-2">
                {isMyTurn && (
                  <>
                    <button
                      onClick={handlePass}
                      disabled={cardsHidden}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                        cardsHidden ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-500 hover:bg-gray-400'
                      }`}
                    >
                      Pass
                    </button>
                    <button
                      onClick={handleDrop}
                      disabled={!canPlay || cardsHidden}
                      className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-colors ${
                        canPlay && !cardsHidden
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Drop{selectedIndices.size > 0 ? ` (${selectedIndices.size})` : ''}
                    </button>
                  </>
                )}
                {!isMyTurn && (
                  <span className="text-white/50 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5">
                    {turnPlayer ? `Waiting for ${turnPlayerIsMe ? 'you' : turnPlayer.username}...` : 'Waiting...'}
                  </span>
                )}
              </div>
              {cardsHidden && isMyTurn && (
                <div className="text-yellow-300/70 text-[10px] sm:text-xs">
                  Reveal cards to play
                </div>
              )}
              {!cardsHidden && validationMessage && isMyTurn && (
                <div className="text-red-300 text-[10px] sm:text-xs">
                  {validationMessage}
                </div>
              )}
              {!cardsHidden && !validationMessage && canPlay && selectedCombo && isMyTurn && (
                <div className="text-green-300 text-[10px] sm:text-xs">
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
            isTurn={isMyTurn}
            faceDown={cardsHidden}
            onCardClick={toggleCard}
            onArrange={handleArrange}
            scale={selfCardScale}
            overlap={selfCardOverlap}
          />
          <div className="text-center mt-1 sm:mt-2 text-white/40 text-[10px] sm:text-xs">
            {cardsHidden ? 'Press H to reveal cards' : 'Drag to rearrange · Click to select'}
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
      {showHandbook && <Handbook onClose={() => setShowHandbook(false)} />}
    </motion.div>
  );
}
