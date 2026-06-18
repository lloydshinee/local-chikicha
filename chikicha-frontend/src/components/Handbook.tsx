import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardComponent } from './CardComponent';
import { RANK_ORDER, SUIT_ORDER } from '../rules';
import type { Card } from '../types';

type Tab = 'hierarchy' | 'combos' | 'howto' | 'tips';

const TABS: { key: Tab; label: string }[] = [
  { key: 'hierarchy', label: 'Card Hierarchy' },
  { key: 'combos', label: 'Combo Types' },
  { key: 'howto', label: 'How to Play' },
  { key: 'tips', label: 'Tips & Strategy' },
];

const RANK_DISPLAY: Record<string, string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
  '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', '2': '2',
};

const SUIT_SYMBOLS: Record<string, string> = {
  diamonds: '\u2666',
  clubs: '\u2663',
  hearts: '\u2665',
  spades: '\u2660',
};

const SUIT_COLORS: Record<string, string> = {
  diamonds: 'text-red-400',
  clubs: 'text-gray-300',
  hearts: 'text-red-400',
  spades: 'text-gray-300',
};

function makeCard(rank: string, suit: string): Card {
  return { rank: rank as Card['rank'], suit: suit as Card['suit'] };
}

function ComboExample({ title, description, cards }: { title: string; description: string; cards: Card[] }) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3">
      <div className="text-sm font-semibold text-yellow-300 mb-1">{title}</div>
      <div className="text-xs text-gray-300 mb-2">{description}</div>
      <div className="flex gap-1 justify-center flex-wrap">
        {cards.map((card, i) => (
          <CardComponent key={i} card={card} scale={0.28} />
        ))}
      </div>
    </div>
  );
}

export function Handbook({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('hierarchy');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const comboExamples = [
    { title: 'Single (1 card)', description: 'Any single card. Higher rank wins, then higher suit.', cards: [makeCard('A', 'spades')] },
    { title: 'Pair (2 cards)', description: 'Two cards of the same rank.', cards: [makeCard('K', 'hearts'), makeCard('K', 'spades')] },
    { title: 'Three of a Kind (3 cards)', description: 'Three cards of the same rank.', cards: [makeCard('Q', 'diamonds'), makeCard('Q', 'clubs'), makeCard('Q', 'hearts')] },
    { title: 'Two Pair (4 cards)', description: 'Two sequential pairs. Example: 7-7-8-8. A-A-2-2 is NOT allowed.', cards: [makeCard('7', 'diamonds'), makeCard('7', 'clubs'), makeCard('8', 'hearts'), makeCard('8', 'spades')] },
    { title: 'Four of a Kind (4 cards) \u2014 BOMB', description: 'Four cards of the same rank. Beats ANY non-bomb combo.', cards: [makeCard('3', 'diamonds'), makeCard('3', 'clubs'), makeCard('3', 'hearts'), makeCard('3', 'spades')] },
    { title: 'Straight (5 cards)', description: 'Five cards in sequential rank order. Valid: 3-4-5-6-7 through 10-J-Q-K-A, plus A-2-3-4-5 (wheel, lowest straight).', cards: [makeCard('5', 'hearts'), makeCard('6', 'diamonds'), makeCard('7', 'clubs'), makeCard('8', 'spades'), makeCard('9', 'hearts')] },
    { title: 'Flush (5 cards)', description: 'Five cards of the same suit, any ranks. Higher high card wins.', cards: [makeCard('3', 'spades'), makeCard('6', 'spades'), makeCard('9', 'spades'), makeCard('J', 'spades'), makeCard('K', 'spades')] },
    { title: 'Full House (5 cards)', description: 'Three of a kind plus a pair. Higher three-of-a-kind wins.', cards: [makeCard('10', 'diamonds'), makeCard('10', 'clubs'), makeCard('10', 'hearts'), makeCard('4', 'diamonds'), makeCard('4', 'spades')] },
    { title: 'Straight Flush (5 cards) \u2014 BOMB', description: 'Five cards in sequential rank, all same suit. Beats Four of a Kind.', cards: [makeCard('5', 'clubs'), makeCard('6', 'clubs'), makeCard('7', 'clubs'), makeCard('8', 'clubs'), makeCard('9', 'clubs')] },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white">Rules Book</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl leading-none px-2 py-1 rounded transition-colors"
            >
              \u2715
            </button>
          </div>

          <div className="flex border-b border-gray-700 px-2 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs px-3 py-2 rounded-t font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-gray-700 text-yellow-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto p-4 flex-1">
            {activeTab === 'hierarchy' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-yellow-300 mb-2">Rank Order (Low \u2192 High)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {RANK_ORDER.map((rank) => (
                      <div key={rank} className="flex flex-col items-center">
                        <CardComponent card={makeCard(rank, 'diamonds')} scale={0.28} />
                        <span className="text-xs text-gray-400 mt-0.5">{RANK_DISPLAY[rank]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-yellow-300 mb-2">Suit Order (Low \u2192 High)</h3>
                  <div className="flex gap-4 text-lg">
                    {SUIT_ORDER.map((suit) => (
                      <div key={suit} className="text-center">
                        <span className={`text-3xl ${SUIT_COLORS[suit]}`}>{SUIT_SYMBOLS[suit]}</span>
                        <div className="text-xs text-gray-400 capitalize">{suit}</div>
                      </div>
                    ))}
                    <div className="flex items-end pb-1">
                      <span className="text-xs text-gray-500">&lt;</span>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl text-red-400">{SUIT_SYMBOLS['diamonds']}</span>
                      <div className="text-xs text-gray-400">diamonds</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'combos' && (
              <div className="space-y-3">
                {comboExamples.map((ex) => (
                  <ComboExample key={ex.title} {...ex} />
                ))}
              </div>
            )}

            {activeTab === 'howto' && (
              <div className="space-y-3 text-sm text-gray-200">
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">1. Join the Game</div>
                  <div className="text-gray-400 text-xs">Enter your username and click Join to enter the lobby.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">2. Ready Up</div>
                  <div className="text-gray-400 text-xs">Click the Ready button. When all players (2\u20135) are ready, a 3-second countdown begins.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">3. Game Starts</div>
                  <div className="text-gray-400 text-xs">52 cards are dealt evenly. The player holding 3\u2666 (three of diamonds) goes first.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">4. First Play</div>
                  <div className="text-gray-400 text-xs">The first play of the game must include the 3\u2666. You can play any valid combo that contains it.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">5. Taking Turns</div>
                  <div className="text-gray-400 text-xs">On your turn, either Drop a valid combo that beats the current combo on the table, or Pass. Turns go counter-clockwise.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">6. Beating the Current Combo</div>
                  <div className="text-gray-400 text-xs">Your combo must be the SAME TYPE as the current combo, but with a higher rank. Suit breaks ties. Exception: Bombs beat anything.</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">7. New Rounds</div>
                  <div className="text-gray-400 text-xs">If all other players pass consecutively, the last person who dropped wins the round and starts a NEW round (can play any combo).</div>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-yellow-300">8. Winning &amp; Losing</div>
                  <div className="text-gray-400 text-xs">The first player to empty their hand wins! The last player with cards remaining is the loser. Rankings are shown at game over.</div>
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="space-y-2 text-xs text-gray-300">
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Save your high singles (A, 2) for late-game \u2014 they are hard to beat.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Keep your bombs (Four of a Kind, Straight Flush) to escape when someone plays an unbeatable combo.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Watch opponent card counts \u2014 target the player with the fewest cards.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Force opponents to pass by playing high-ranked combos, then start a new round with a combo they can\u2019t match.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Break up your strong pairs to form straights and flushes when possible.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>If you hold 3\u2666, plan a strong opening combo that includes it \u2014 you control the first round.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Arrange your hand (drag cards to reorder) to group combos together for faster play.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-400 shrink-0">\u2022</span>
                  <span>Pass strategically \u2014 letting someone else win the round can reset the combo to something you can beat.</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
