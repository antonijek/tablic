// Troje (svako za sebe) i četvoro (2 na 2) — deljenje, parovi, bodovanje, kraj meča.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TablicGame } from '../src/game.js';
import { chooseMove } from '../src/ai.js';
import { createDeck, makeRng } from '../src/cards.js';
import { scoreDeal } from '../src/scoring.js';
import { roundsPerDeal, sideOf } from '../src/sides.js';
import { makeState } from './helpers.js';

/** Svako baca prvu kartu iz ruke dok se ne podeli sledeće deljenje. */
function throwUntilRound(g: TablicGame, round: number): void {
  while (g.peek().round < round) {
    const s = g.peek();
    g.play(s.turn, s.players[s.turn].hand[0].id);
  }
}

test('broj deljenja u partiji: 4 u dvoje, 3 u troje, 2 u četvoro', () => {
  assert.equal(roundsPerDeal(2), 4);
  assert.equal(roundsPerDeal(3), 3);
  assert.equal(roundsPerDeal(4), 2);
});

test('troje: po 6, pa 6, pa u zadnjem deljenju po 4 karte', () => {
  const g = new TablicGame({ seed: 5, players: 3 });
  let s = g.getState();
  assert.deepEqual(s.players.map(p => p.hand.length), [6, 6, 6]);
  assert.equal(s.table.length, 4);
  assert.equal(s.deck.length, 52 - 4 - 18);
  throwUntilRound(g, 3);
  s = g.getState();
  assert.deepEqual(s.players.map(p => p.hand.length), [4, 4, 4]);
  assert.equal(s.deck.length, 0);
});

test('četvoro: dva deljenja po 6, parovi 0+2 protiv 1+3', () => {
  const g = new TablicGame({ seed: 7, players: 4 });
  assert.deepEqual(g.getState().players.map(p => p.hand.length), [6, 6, 6, 6]);
  assert.equal(g.getState().scores.length, 2);
  throwUntilRound(g, 2);
  assert.equal(g.getState().deck.length, 0);
  assert.deepEqual([0, 1, 2, 3].map(p => sideOf(p, 4)), [0, 1, 0, 1]);
  assert.deepEqual([0, 1, 2].map(p => sideOf(p, 3)), [0, 1, 2]);
});

test('četvoro: karte i table partnera se sabiraju, ostatak ide paru poslednjeg koji je nosio', () => {
  const g = TablicGame.fromState(makeState({
    hands: ['', '', '9S', ''], turn: 2, table: '4H 5D 7C',
    captured: ['AS AH', 'KS', '', '10D'],
  }));
  g.play(2, '9S', ['4H', '5D']);
  const s = g.getState();
  assert.equal(s.phase, 'DEAL_END');
  const [a, b] = s.history[0].scores;
  assert.equal(s.history[0].leftoverTo, 2);
  assert.deepEqual([a.cardCount, a.cardPoints, a.mostCards, a.total], [6, 2, 3, 5]);
  assert.deepEqual([b.cardCount, b.cardPoints, b.mostCards, b.total], [2, 3, 0, 3]);
  assert.deepEqual(s.scores, [5, 3]);
});

test('četvoro: paru sa 100 poena se tabla ne piše ni kod jednog partnera', () => {
  const hands = ['2H', '3C 2S', '9S 2D', '4C'];
  const side0 = makeState({ hands, turn: 2, table: '4H 5D', deck: 'KS KH', scores: [100, 0] });
  assert.equal(TablicGame.fromState(side0).play(2, '9S', ['4H', '5D']).tabla, false);
  const side1 = makeState({ hands, turn: 1, table: '3H', deck: 'KS KH', scores: [100, 0] });
  assert.equal(TablicGame.fromState(side1).play(1, '3C', ['3H']).tabla, true);
});

test('troje: ako dvojica imaju isto najviše karata, 3 poena ne dobija niko', () => {
  const deck = createDeck();
  const r = scoreDeal([deck.slice(0, 20), deck.slice(20, 40), deck.slice(40)], [0, 0, 1]);
  assert.deepEqual(r.map(x => x.mostCards), [0, 0, 0]);
  assert.equal(r[2].total, r[2].cardPoints + 1);
});

test('kraj meča: oba preko 101 → veći zbir; izjednačeni → još jedna partija', () => {
  const end = (scores: number[]) => {
    const g = TablicGame.fromState(makeState({
      hands: ['9S', ''], table: '4H 5D', captured: ['10D 10S 10H', '2C'], scores,
    }));
    g.play(0, '9S', ['4H', '5D']); // 7 poena : 1 poen, bez table (poslednja karta)
    return g.getState();
  };
  const won = end([100, 100]);
  assert.deepEqual(won.scores, [107, 101]);
  assert.equal(won.phase, 'MATCH_END');
  assert.equal(won.winner, 0);

  const tie = end([94, 100]);
  assert.deepEqual(tie.scores, [101, 101]);
  assert.equal(tie.phase, 'DEAL_END');
  assert.equal(tie.winner, null);
});

test('PlayerView u četvoro: strana svakog igrača, poeni po paru, bez tuđih ruku', () => {
  const g = new TablicGame({ seed: 11, players: 4 });
  const v = g.getPlayerView(0);
  assert.deepEqual(v.players.map(p => p.side), [0, 1, 0, 1]);
  assert.deepEqual(v.scores, [0, 0]);
  assert.equal(v.roundsPerDeal, 2);
  const json = JSON.stringify(v);
  for (const p of [1, 2, 3]) {
    for (const c of g.getState().players[p].hand) assert.equal(json.includes(`"${c.id}"`), false, c.id);
  }
});

test('najjači AI igra legalno u troje i u četvoro', () => {
  const rng = makeRng(3);
  for (const players of [3, 4] as const) {
    const g = new TablicGame({ seed: 21, players });
    for (let i = 0; i < 12; i++) {
      const s = g.peek();
      const m = chooseMove(g.getPlayerView(s.turn), 'hard', rng, 8);
      g.play(s.turn, m.cardId, m.capture);
    }
  }
});
