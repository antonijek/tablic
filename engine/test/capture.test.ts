import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureOptions, clearingRanks, isValidCapture } from '../src/capture.js';
import { cardFromId } from '../src/cards.js';
import { cards, ids } from './helpers.js';

const c = cardFromId;

test('ista karta nosi istu', () => {
  assert.ok(isValidCapture(c('7S'), cards('7H')));
  assert.ok(!isValidCapture(c('7S'), cards('8H')));
});

test('zbir nosi: 9 nosi 4+5', () => {
  assert.ok(isValidCapture(c('9S'), cards('4H 5D')));
  assert.ok(!isValidCapture(c('9S'), cards('4H 4D')));
});

test('više grupa odjednom: 10 nosi 10 + (3+7) + (2+8)', () => {
  assert.ok(isValidCapture(c('10S'), cards('10H 3D 7C 2S 8H')));
  // 3 viška ne može
  assert.ok(!isValidCapture(c('10S'), cards('10H 3D 7C 3S')));
});

test('slike imaju vrednost: J=12, Q=13, K=14', () => {
  assert.ok(isValidCapture(c('JS'), cards('5H 7D')));
  assert.ok(isValidCapture(c('QS'), cards('6H 7D')));
  assert.ok(isValidCapture(c('KS'), cards('9H 5D')));
  assert.ok(isValidCapture(c('KS'), cards('KH')));
  assert.ok(!isValidCapture(c('KS'), cards('QH')));
});

test('kec vredi 1 ili 11 — i kad se igra i na stolu', () => {
  assert.ok(isValidCapture(c('AS'), cards('AH')));          // 1 = 1
  assert.ok(isValidCapture(c('AS'), cards('5H 6D')));       // 11
  assert.ok(isValidCapture(c('AS'), cards('AH 5H 6D')));    // (1) + (11)
  assert.ok(isValidCapture(c('QS'), cards('AH 2D')));       // 11 + 2 = 13
  assert.ok(isValidCapture(c('3S'), cards('AH 2D')));       // 1 + 2 = 3
  assert.ok(isValidCapture(c('JS'), cards('AH AD')));       // 11 + 1 = 12
});

test('ista karta ne može biti u dve grupe', () => {
  // 6 = 3+3 bi zahtevalo istu trojku dvaput
  assert.ok(!isValidCapture(c('6S'), cards('3H')));
});

test('prazno nošenje nije validno', () => {
  assert.ok(!isValidCapture(c('6S'), []));
});

test('captureOptions: sve disjunktne kombinacije', () => {
  const opts = captureOptions(c('10S'), cards('10H 3D 7C 4S'));
  const keys = opts.map(o => ids(o).join(' ')).sort();
  assert.deepEqual(keys, ['10H', '10H 3D 7C', '3D 7C'].sort());
});

test('captureOptions: bez nošenja kad nema zbira', () => {
  assert.deepEqual(captureOptions(c('2S'), cards('5H 9D')), []);
});

test('clearingRanks: koje karte prave tablu', () => {
  assert.deepEqual(clearingRanks(cards('4H 5D')), ['9']);
  // 5+5 → 5 (dve grupe) i 10
  assert.deepEqual(clearingRanks(cards('5H 5D')).sort(), ['10', '5']);
  assert.deepEqual(clearingRanks([]), []);
});
