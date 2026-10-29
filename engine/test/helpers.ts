import { cardFromId } from '../src/cards.js';
import { sideCount } from '../src/sides.js';
import type { Card, TablicState } from '../src/types.js';

export const cards = (ids: string): Card[] => ids.trim().split(/\s+/).filter(Boolean).map(cardFromId);
export const ids = (cs: readonly Card[]): string[] => cs.map(c => c.id).sort();

/** Stanje usred partije; broj igrača = broj ruku (2, 3 ili 4). */
export function makeState(p: {
  hands: string[];
  table: string;
  deck?: string;
  turn?: number;
  captured?: string[];
  scores?: number[];
  lastCapturer?: number | null;
}): TablicState {
  return {
    phase: 'PLAYING',
    dealNo: 1,
    round: 4,
    dealer: p.hands.length - 1,
    turn: p.turn ?? 0,
    deck: cards(p.deck ?? ''),
    table: cards(p.table),
    players: p.hands.map((h, i) => ({
      hand: cards(h),
      captured: cards(p.captured?.[i] ?? ''),
      tablas: 0,
    })),
    scores: p.scores ?? new Array(sideCount(p.hands.length)).fill(0),
    lastCapturer: p.lastCapturer ?? null,
    lastMove: null,
    history: [],
    winner: null,
  };
}
