import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, sumPoints, TOTAL_CARD_POINTS } from '../src/cards.js';
import { scoreDeal } from '../src/scoring.js';
import { cards } from './helpers.js';

test('ceo špil nosi 22 poena u kartama', () => {
  assert.equal(sumPoints(createDeck()), TOTAL_CARD_POINTS);
});

test('10♦ = 2, 2♣ = 1, 10/J/Q/K/A = 1, ostalo 0', () => {
  assert.equal(sumPoints(cards('10D')), 2);
  assert.equal(sumPoints(cards('2C')), 1);
  assert.equal(sumPoints(cards('2D 9S 5H')), 0);
  assert.equal(sumPoints(cards('10S JH QD KC AS')), 5);
});

test('3 poena za više karata; izjednačeno 26:26 — niko', () => {
  const deck = createDeck();
  const a = scoreDeal([deck.slice(0, 27), deck.slice(27)], [0, 0]);
  assert.equal(a[0].mostCards, 3);
  assert.equal(a[1].mostCards, 0);

  const b = scoreDeal([deck.slice(0, 26), deck.slice(26)], [0, 0]);
  assert.equal(b[0].mostCards + b[1].mostCards, 0);
});

test('table se dodaju na zbir', () => {
  const deck = createDeck();
  const r = scoreDeal([deck.slice(0, 30), deck.slice(30)], [2, 1]);
  assert.equal(r[0].total, r[0].cardPoints + 3 + 2);
  assert.equal(r[1].total, r[1].cardPoints + 1);
  assert.equal(r[0].cardPoints + r[1].cardPoints, 22);
});
