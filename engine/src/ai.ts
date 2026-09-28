// AI za Tablić — radi SAMO nad PlayerView (ne vidi tuđe karte ni špil).
//
// Ocena poteza = ono što odmah dobijam − ono što protivnik verovatno može da
// uzme sledećim potezom (uključujući tablu). Verovatnoća da protivnik ima
// neki rang računa se iz karata koje još nisu viđene (brojanje karata).

import type { Card, Move, PlayerView, Rank } from './types.js';
import { cardPoints, createDeck, RANKS, makeCard } from './cards.js';
import { captureOptions } from './capture.js';

export type AiLevel = 'easy' | 'medium' | 'hard';

const POINT = 10;        // 1 poen
const PER_CARD = 1.2;    // doprinos borbi za "najviše karata" (3 poena / ~27 karata)
const TABLA = POINT;

function value(cards: readonly Card[]): number {
  let v = 0;
  for (const c of cards) v += cardPoints(c) * POINT + PER_CARD;
  return v;
}

/** P(protivnik u ruci od `handSize` karata ima bar jednu od `k` karata iz neviđenih `pool`). */
function probHolds(k: number, pool: number, handSize: number): number {
  if (k <= 0 || handSize <= 0 || pool <= 0) return 0;
  let pNone = 1;
  for (let i = 0; i < handSize; i++) {
    if (pool - i <= 0) return 1;
    pNone *= Math.max(0, pool - k - i) / (pool - i);
  }
  return 1 - pNone;
}

interface Scored { move: Move; score: number }

function listMoves(view: PlayerView): { card: Card; capture: Card[] }[] {
  const out: { card: Card; capture: Card[] }[] = [];
  for (const card of view.hand) {
    out.push({ card, capture: [] });
    for (const opt of captureOptions(card, view.table)) out.push({ card, capture: opt });
  }
  return out;
}

export function scoreMoves(view: PlayerView, level: AiLevel = 'medium'): Scored[] {
  const me = view.me;
  const opp = (me + 1) % view.players.length;
  const oppHand = view.players[opp].handCount;

  // Neviđene karte (mogu biti kod protivnika ili u špilu).
  const seen = new Set<string>();
  for (const c of view.hand) seen.add(c.id);
  for (const c of view.table) seen.add(c.id);
  for (const p of view.players) for (const c of p.captured) seen.add(c.id);
  const unseen = createDeck().filter(c => !seen.has(c.id));
  const unseenByRank = new Map<Rank, number>();
  for (const c of unseen) unseenByRank.set(c.rank, (unseenByRank.get(c.rank) ?? 0) + 1);

  const myHandAfter = view.hand.length - 1;
  const finalMove = view.deckCount === 0 && oppHand === 0 && myHandAfter === 0;
  // Sledeći protivnikov potez je iz ove ruke, ili iz nove ruke ako je ova prazna.
  const oppNextHand = oppHand > 0 ? oppHand : (view.deckCount > 0 ? 6 : 0);
  const riskWeight = level === 'hard' ? 1.0 : level === 'medium' ? 0.8 : 0.3;

  return listMoves(view).map(({ card, capture }) => {
    const captureIds = new Set(capture.map(c => c.id));
    const remaining = capture.length > 0
      ? view.table.filter(c => !captureIds.has(c.id))
      : [...view.table, card];

    let gain = 0;
    if (capture.length > 0) {
      gain += value([card, ...capture]);
      if (remaining.length === 0 && !finalMove) gain += TABLA;
    }

    if (finalMove) {
      // Ostatak sa stola nosi poslednji koji je nosio.
      const lastCapturer = capture.length > 0 ? me : view.lastCapturer;
      if (lastCapturer === me) gain += value(remaining);
      else if (lastCapturer !== null) gain -= value(remaining);
    } else if (oppNextHand > 0 && remaining.length > 0) {
      // Najgori očekivani protivnikov odgovor, po rangu.
      let worst = 0;
      for (const rank of RANKS) {
        const k = unseenByRank.get(rank) ?? 0;
        if (k === 0) continue;
        const p = probHolds(k, unseen.length, oppNextHand);
        if (p === 0) continue;
        const probe = makeCard(rank, '♠');
        let best = 0;
        for (const opt of captureOptions(probe, remaining)) {
          // + karta kojom protivnik nosi (boja nepoznata, pa samo kao "karta više")
          let v = value(opt) + PER_CARD;
          if (opt.length === remaining.length) v += TABLA;
          if (v > best) best = v;
        }
        if (p * best > worst) worst = p * best;
      }
      gain -= riskWeight * worst;
    }

    // Blaga sklonost da se baca karta bez bodova i sa što manje "kombinacija".
    if (capture.length === 0) gain -= cardPoints(card) * 2;

    return { move: { cardId: card.id, capture: capture.map(c => c.id) }, score: gain };
  });
}

export function chooseMove(view: PlayerView, level: AiLevel = 'medium', rng: () => number = Math.random): Move {
  const scored = scoreMoves(view, level);
  if (scored.length === 0) throw new Error('AI nema legalan potez');
  if (level === 'easy') {
    // Početnik: često uzme prvo nošenje koje vidi, ponekad samo baci kartu.
    const captures = scored.filter(s => s.move.capture.length > 0);
    if (captures.length > 0 && rng() < 0.8) return captures[Math.floor(rng() * captures.length)].move;
    return scored[Math.floor(rng() * scored.length)].move;
  }
  let best = scored[0];
  for (const s of scored) if (s.score > best.score) best = s;
  return best.move;
}
