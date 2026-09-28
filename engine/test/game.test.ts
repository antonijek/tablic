import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TablicGame, TablicError, HAND_SIZE, INITIAL_TABLE } from '../src/game.js';
import { chooseMove } from '../src/ai.js';
import { makeRng } from '../src/cards.js';
import { ids, makeState } from './helpers.js';

test('početno deljenje: 6+6 u ruci, 4 na stolu, 36 u špilu', () => {
  const g = new TablicGame({ seed: 1 });
  const s = g.getState();
  assert.equal(s.players[0].hand.length, HAND_SIZE);
  assert.equal(s.players[1].hand.length, HAND_SIZE);
  assert.equal(s.table.length, INITIAL_TABLE);
  assert.equal(s.deck.length, 52 - 12 - 4);
  assert.equal(s.turn, 0); // igra igrač posle delioca
  assert.equal(s.dealer, 1);
});

test('nošenje prebacuje karte, bacanje ostavlja kartu na stolu', () => {
  const g = TablicGame.fromState(makeState({
    hands: ['9S 2H', '3C 4C'], table: '4H 5D 7C', deck: 'KS KH',
  }));
  g.play(0, '9S', ['4H', '5D']);
  let s = g.getState();
  assert.deepEqual(ids(s.players[0].captured), ['4H', '5D', '9S']);
  assert.deepEqual(ids(s.table), ['7C']);
  assert.equal(s.turn, 1);

  g.play(1, '3C');
  s = g.getState();
  assert.deepEqual(ids(s.table), ['3C', '7C']);
});

test('neispravni potezi se odbijaju', () => {
  const g = TablicGame.fromState(makeState({ hands: ['9S', '3C'], table: '4H 6D', deck: '' }));
  assert.throws(() => g.play(1, '3C'), TablicError);            // nije red
  assert.throws(() => g.play(0, '3C'), TablicError);            // nije u ruci
  assert.throws(() => g.play(0, '9S', ['4H', '6D']), TablicError); // 10 ≠ 9
  assert.throws(() => g.play(0, '9S', ['4H', '4H']), TablicError); // duplikat
  assert.throws(() => g.play(0, '9S', ['2C']), TablicError);    // nije na stolu
});

test('tabla: odnet ceo sto = +1 poen', () => {
  const g = TablicGame.fromState(makeState({ hands: ['9S 2H', '3C 4C'], table: '4H 5D', deck: 'KS KH' }));
  const rec = g.play(0, '9S', ['4H', '5D']);
  assert.equal(rec.tabla, true);
  assert.equal(g.getState().players[0].tablas, 1);
});

test('tabla se ne računa poslednjom kartom partije (podrazumevano)', () => {
  const state = makeState({ hands: ['', '9S'], table: '4H 5D', deck: '', turn: 1 });
  const g = TablicGame.fromState(state);
  const rec = g.play(1, '9S', ['4H', '5D']);
  assert.equal(rec.tabla, false);

  const g2 = TablicGame.fromState(state, { tablaOnLastMove: true });
  assert.equal(g2.play(1, '9S', ['4H', '5D']).tabla, true);
});

test('kraj partije: ostatak stola nosi poslednji koji je nosio', () => {
  const g = TablicGame.fromState(makeState({ hands: ['9S', '2C'], table: '4H 5D 7C', deck: '' }));
  g.play(0, '9S', ['4H', '5D']);
  g.play(1, '2C'); // baci — 7C i 2C ostaju, nosi ih igrač 0
  const s = g.getState();
  assert.equal(s.phase, 'DEAL_END');
  const last = s.history.at(-1)!;
  assert.equal(last.leftoverTo, 0);
  assert.deepEqual(ids(last.leftover), ['2C', '7C']);
  assert.ok(s.players[0].captured.some(c => c.id === '2C'));
});

test('kad se ruke isprazne, deli se novih 6+6', () => {
  const deck = '2S 3S 4S 5S 6S 7S 2D 3D 4D 5D 6D 7D';
  const g = TablicGame.fromState(makeState({ hands: ['KS', 'KH'], table: '9C', deck }));
  g.play(0, 'KS');
  g.play(1, 'KH', ['KS']);
  const s = g.getState();
  assert.equal(s.phase, 'PLAYING');
  assert.equal(s.players[0].hand.length, 6);
  assert.equal(s.players[1].hand.length, 6);
  assert.equal(s.deck.length, 0);
});

test('PlayerView ne otkriva protivnikovu ruku ni špil', () => {
  const g = new TablicGame({ seed: 3 });
  const v = g.getPlayerView(0) as unknown as Record<string, unknown>;
  const json = JSON.stringify(v);
  for (const c of g.getState().players[1].hand) assert.equal(json.includes(`"${c.id}"`), false, c.id);
  assert.equal('deck' in v, false);
  assert.equal((v.players as { handCount: number }[])[1].handCount, 6);
});

function playMatch(seed: number, levels: ['easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard']) {
  const g = new TablicGame({ seed });
  const rng = makeRng(seed + 1000);
  let guard = 0;
  while (g.getState().phase !== 'MATCH_END') {
    const s = g.getState();
    if (s.phase === 'DEAL_END') {
      // invarijante po partiji
      const last = s.history.at(-1)!;
      const total = last.scores.reduce((a, x) => a + x.cardPoints, 0);
      assert.equal(total, 22, 'zbir karata u partiji mora biti 22');
      assert.equal(last.scores.reduce((a, x) => a + x.cardCount, 0), 52, 'sve 52 karte moraju biti nošene');
      g.nextDeal();
      continue;
    }
    const p = s.turn;
    const m = chooseMove(g.getPlayerView(p), levels[p], rng);
    g.play(p, m.cardId, m.capture);
    if (++guard > 20000) throw new Error('meč se zaglavio');
  }
  return g.getState();
}

test('ceo meč AI vs AI se završava, invarijante važe (20 mečeva)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = playMatch(seed, ['medium', 'easy']);
    assert.notEqual(s.winner, null);
    assert.ok(s.players[s.winner!].score >= 101);
  }
});
