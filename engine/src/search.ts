// Monte Carlo pretraga za Tablić (najjači AI).
//
// Za svaki legalan potez: mnogo puta nasumično podeli karte koje ne vidim
// (protivnikova ruka + redosled špila), odigraj partiju do kraja brzom
// pohlepnom politikom za oba igrača i uzmi prosečnu razliku poena partije
// (karte, 3 za više karata, table). Isti uzorci za sve poteze (manja varijansa).

import type { Card, Move, PlayerView, TablicState } from './types.js';
import { TablicGame } from './game.js';
import { captureOptions } from './capture.js';
import { cardPoints, createDeck, shuffle } from './cards.js';

/** Brza politika za simulaciju: najvrednije nošenje, inače baci najjeftiniju kartu. */
export function greedyMove(hand: readonly Card[], table: readonly Card[]): Move {
  let best: Move | null = null;
  let bestVal = -Infinity;
  for (const card of hand) {
    for (const opt of captureOptions(card, table)) {
      let v = cardPoints(card) * 10 + 1;
      for (const c of opt) v += cardPoints(c) * 10 + 1;
      if (opt.length === table.length) v += 10; // tabla
      if (v > bestVal) { bestVal = v; best = { cardId: card.id, capture: opt.map(c => c.id) }; }
    }
  }
  if (best) return best;
  // bacanje: karta bez bodova i što manje "zgodna" za protivnika
  let throwCard = hand[0];
  let throwVal = Infinity;
  for (const card of hand) {
    const v = cardPoints(card) * 20 + (captureOptions(card, [...table, card]).length > 0 ? 3 : 0);
    if (v < throwVal) { throwVal = v; throwCard = card; }
  }
  return { cardId: throwCard.id, capture: [] };
}

function sampleState(view: PlayerView, rng: () => number): TablicState {
  const me = view.me;
  const opp = (me + 1) % view.players.length;
  const seen = new Set<string>();
  for (const c of view.hand) seen.add(c.id);
  for (const c of view.table) seen.add(c.id);
  for (const p of view.players) for (const c of p.captured) seen.add(c.id);
  const unseen = shuffle(createDeck().filter(c => !seen.has(c.id)), rng);
  const oppHand = unseen.slice(0, view.players[opp].handCount);
  const deck = unseen.slice(view.players[opp].handCount);
  return {
    phase: 'PLAYING',
    dealNo: view.dealNo,
    round: view.round,
    dealer: view.dealer,
    turn: view.turn,
    deck,
    table: view.table.slice(),
    players: view.players.map((p, i) => ({
      hand: i === me ? view.hand.slice() : oppHand,
      captured: p.captured.slice(),
      tablas: p.tablas,
      score: 0,
    })),
    lastCapturer: view.lastCapturer,
    lastMove: null,
    history: [],
    winner: null,
  };
}

function rollout(game: TablicGame, me: number): number {
  let guard = 0;
  while (game.peek().phase === 'PLAYING') {
    const s = game.peek();
    const m = greedyMove(s.players[s.turn].hand, s.table);
    game.play(s.turn, m.cardId, m.capture);
    if (++guard > 200) break;
  }
  const last = game.peek().history.at(-1);
  if (!last) return 0;
  let mine = 0, others = 0;
  for (const sc of last.scores) if (sc.player === me) mine = sc.total; else others += sc.total;
  return mine - others;
}

export function searchMove(view: PlayerView, legal: Move[], rng: () => number, samples = 60): Move {
  if (legal.length === 1) return legal[0];
  const totals = new Array(legal.length).fill(0);
  for (let i = 0; i < samples; i++) {
    const base = sampleState(view, rng);
    for (let k = 0; k < legal.length; k++) {
      const g = TablicGame.fromState(base);
      g.play(view.me, legal[k].cardId, legal[k].capture);
      totals[k] += rollout(g, view.me);
    }
  }
  let best = 0;
  for (let k = 1; k < legal.length; k++) if (totals[k] > totals[best]) best = k;
  return legal[best];
}
