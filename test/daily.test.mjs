// Dnevni izazov — čiste funkcije (datum, seed, niz dana, tekst za deljenje).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiSeed, dayLabel, seedFor, shareText, streak, todayKey, verdict } from '../ui/daily.js';

test('datum izazova je po beogradskom vremenu', () => {
  // 23:30 UTC 29.10. je već 30.10. u Beogradu (zimsko vreme, UTC+1)
  assert.equal(todayKey(new Date('2026-10-29T23:30:00Z')), '2026-10-30');
  assert.equal(todayKey(new Date('2026-10-29T22:30:00Z')), '2026-10-29');
});

test('isti dan daje isti seed, drugi dan drugi', () => {
  assert.equal(seedFor('2026-10-30'), 20261030);
  assert.notEqual(seedFor('2026-10-30'), seedFor('2026-10-31'));
  assert.notEqual(aiSeed('2026-10-30', 5), aiSeed('2026-10-30', 6));
  assert.equal(dayLabel('2026-10-05'), '5.10.2026.');
});

test('niz dana zaredom: danas ili juče, prekida se na propuštenom danu', () => {
  const r = { '2026-10-28': {}, '2026-10-29': {}, '2026-10-30': {}, '2026-10-26': {} };
  assert.equal(streak(r, '2026-10-30'), 3);
  assert.equal(streak(r, '2026-10-31'), 3);   // danas još nije odigrano — računa se do juče
  assert.equal(streak(r, '2026-11-01'), 0);
  assert.equal(streak({ '2026-10-31': {}, '2026-11-01': {} }, '2026-11-01'), 2); // preko kraja meseca
});

test('tekst za deljenje', () => {
  assert.equal(verdict({ me: 15, opp: 10 }), 'pobeda');
  assert.equal(verdict({ me: 10, opp: 15 }), 'poraz');
  assert.equal(verdict({ me: 12, opp: 12 }), 'nerešeno');
  const t = shareText('2026-10-30', { me: 18, opp: 9, tablas: 2 }, 3);
  assert.match(t, /dnevni izazov 30\.10\.2026\./);
  assert.match(t, /Vi 18 : 9 računar \(pobeda\) · table: 2/);
  assert.match(t, /Niz: 3 dana zaredom/);
  assert.match(t, /tablic\.igrajmo\.online\/\?izazov/);
  assert.doesNotMatch(shareText('2026-10-30', { me: 1, opp: 2, tablas: 0 }, 1), /Niz/);
});
