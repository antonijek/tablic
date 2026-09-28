import { cardFromId } from '../src/cards.js';
import type { Card, TablicState } from '../src/types.js';

export const cards = (ids: string): Card[] => ids.trim().split(/\s+/).filter(Boolean).map(cardFromId);
export const ids = (cs: readonly Card[]): string[] => cs.map(c => c.id).sort();

export function makeState(p: {
  hands: [string, string];
  table: string;
  deck?: string;
  turn?: number;
  captured?: [string, string];
  lastCapturer?: number | null;
}): TablicState {
  return {
    phase: 'PLAYING',
    dealNo: 1,
    round: 4,
    dealer: 1,
    turn: p.turn ?? 0,
    deck: cards(p.deck ?? ''),
    table: cards(p.table),
    players: p.hands.map((h, i) => ({
      hand: cards(h),
      captured: cards(p.captured?.[i] ?? ''),
      tablas: 0,
      score: 0,
    })),
    lastCapturer: p.lastCapturer ?? null,
    lastMove: null,
    history: [],
    winner: null,
  };
}
