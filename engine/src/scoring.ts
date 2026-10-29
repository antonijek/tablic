// Bodovanje jedne partije (jedan ceo špil).

import type { Card, DealScore, Side } from './types.js';
import { MOST_CARDS_POINTS, sumPoints } from './cards.js';

/**
 * Po strani (igrač, a u četvoro par):
 * - karte sa bodovima (10/J/Q/K/A = 1, 10♦ = 2, 2♣ = 1) — ukupno 22
 * - 3 poena ko ima najviše karata (ako ih ima više sa istim najvećim brojem, niko)
 * - 1 poen po tabli
 */
export function scoreDeal(captured: readonly Card[][], tablas: readonly number[]): DealScore[] {
  const counts = captured.map(c => c.length);
  const max = Math.max(...counts);
  const leaders = counts.filter(c => c === max).length;
  return captured.map((cards, side: Side) => {
    const cardPoints = sumPoints(cards);
    const mostCards = leaders === 1 && counts[side] === max ? MOST_CARDS_POINTS : 0;
    return {
      side,
      cardPoints,
      mostCards,
      tablas: tablas[side],
      total: cardPoints + mostCards + tablas[side],
      cardCount: cards.length,
    };
  });
}
