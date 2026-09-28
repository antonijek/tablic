// Turnir AI protiv AI — da se vidi da li je "medium"/"hard" stvarno jači.
// Pokretanje: npm run sim -- 200 hard easy

import { TablicGame } from '../src/game.js';
import { chooseMove, type AiLevel } from '../src/ai.js';
import { makeRng } from '../src/cards.js';

const n = Number(process.argv[2] ?? 100);
const a = (process.argv[3] ?? 'medium') as AiLevel;
const b = (process.argv[4] ?? 'easy') as AiLevel;

let winsA = 0, pointsA = 0, pointsB = 0, deals = 0, tablas = 0;
const t0 = Date.now();
for (let seed = 1; seed <= n; seed++) {
  // naizmenično ko je igrač 0, da prvi potez ne utiče na rezultat
  const swap = seed % 2 === 0;
  const levels: AiLevel[] = swap ? [b, a] : [a, b];
  const g = new TablicGame({ seed });
  const rng = makeRng(seed * 7);
  while (g.getState().phase !== 'MATCH_END') {
    const s = g.getState();
    if (s.phase === 'DEAL_END') { g.nextDeal(); continue; }
    const m = chooseMove(g.getPlayerView(s.turn), levels[s.turn], rng);
    g.play(s.turn, m.cardId, m.capture);
  }
  const s = g.getState();
  const ia = swap ? 1 : 0;
  if (s.winner === ia) winsA++;
  pointsA += s.players[ia].score;
  pointsB += s.players[1 - ia].score;
  deals += s.history.length;
  tablas += s.history.reduce((x, h) => x + h.scores.reduce((y, sc) => y + sc.tablas, 0), 0);
}
console.log(`${a} vs ${b}: ${winsA}/${n} pobeda (${(100 * winsA / n).toFixed(1)}%)`);
console.log(`prosek poena u meču: ${(pointsA / n).toFixed(1)} : ${(pointsB / n).toFixed(1)}, partija po meču ${(deals / n).toFixed(1)}, tabli po partiji ${(tablas / deals).toFixed(2)}`);
console.log(`${Date.now() - t0} ms`);
