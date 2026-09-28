// Bodovanje jedne partije (jedan ceo špil).

import type { Card, DealScore, Position } from './types.js';
import { MOST_CARDS_POINTS, sumPoints } from './cards.js';

/**
 * - karte sa bodovima (10/J/Q/K/A = 1, 10♦ = 2, 2♣ = 1) — ukupno 22
 * - 3 poena ko ima najviše karata (pri izjednačenju niko)
 * - 1 poen po tabli
 */
export function scoreDeal(captured: readonly Card[][], tablas: readonly number[]): DealScore[] {
  const counts = captured.map(c => c.length);
  const max = Math.max(...counts);
  const leaders = counts.filter(c => c === max).length;
  return captured.map((cards, player: Position) => {
    const cardPoints = sumPoints(cards);
    const mostCards = leaders === 1 && counts[player] === max ? MOST_CARDS_POINTS : 0;
    return {
      player,
      cardPoints,
      mostCards,
      tablas: tablas[player],
      total: cardPoints + mostCards + tablas[player],
      cardCount: cards.length,
    };
  });
}
