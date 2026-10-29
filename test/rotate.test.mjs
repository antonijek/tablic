// Okretanje online prikaza: ja sam uvek dole (mesto 0), moja strana je uvek 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TablicGame } from '../engine/dist/index.js';
import { rotateView, serverSeat } from '../ui/rotate.js';

test('troje, ja na mestu 2: ja sam 0, posle mene je onaj sa mesta 0', () => {
  const g = new TablicGame({ players: 3, seed: 4, firstDealer: 1 });
  const v = rotateView(g.getPlayerView(2), 2);
  assert.equal(v.me, 0);
  assert.deepEqual(v.hand, g.getPlayerView(2).hand);
  assert.equal(v.players[0].handCount, 6);
  assert.equal(v.dealer, 2);            // server 1 → ekran (1-2+3)%3 = 2
  assert.equal(v.turn, 0);              // server 2 (posle delioca 1) → ekran 0
  assert.deepEqual(v.players.map(p => p.side), [0, 1, 2]);
  assert.equal(serverSeat(1, 2, 3), 0);
  assert.equal(serverSeat(2, 2, 3), 1);
});

test('četvoro, ja na mestu 1: moj par je strana 0 („Mi“)', () => {
  const g = new TablicGame({ players: 4, seed: 5 });
  const s = g.getState();
  s.scores = [30, 70];                  // server: par 0 = 30, par 1 (moj) = 70
  const v = rotateView(TablicGame.fromState(s).getPlayerView(1), 1);
  assert.deepEqual(v.scores, [70, 30]);
  assert.deepEqual(v.players.map(p => p.side), [0, 1, 0, 1]);
});

test('istorija, poslednji potez i pobednik se okreću', () => {
  const view = {
    players: [{ side: 0 }, { side: 1 }], scores: [101, 50], turn: 0, dealer: 1, me: 1,
    lastCapturer: 0, lastMove: { player: 0, card: {}, captured: [], tabla: false },
    history: [{ dealNo: 1, leftoverTo: 0, leftover: [], scores: [{ side: 0, total: 20 }, { side: 1, total: 5 }] }],
    winner: 0,
  };
  const v = rotateView(view, 1);
  assert.deepEqual(v.scores, [50, 101]);
  assert.equal(v.turn, 1);
  assert.equal(v.dealer, 0);
  assert.equal(v.lastCapturer, 1);
  assert.equal(v.lastMove.player, 1);
  assert.equal(v.winner, 1);
  assert.deepEqual(v.history[0].scores.map(x => [x.side, x.total]), [[0, 5], [1, 20]]);
  assert.equal(v.history[0].leftoverTo, 1);
});
