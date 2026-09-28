// Nošenje: koje kombinacije sa stola može da odnese odigrana karta.
//
// Pravilo: odigrana karta nosi jednu ili više DISJUNKTNIH grupa karata sa
// stola, gde svaka grupa ima zbir jednak vrednosti odigrane karte. Kec vredi
// 1 ili 11 (i kad se igra i kad leži na stolu). Grupa može biti i jedna karta.
//
// Maske su bigint jer sto teoretski može imati i više od 31 karte.

import type { Card, Rank } from './types.js';
import { cardValues, RANKS } from './cards.js';

type Mask = bigint;

const GROUP_LIMIT = 50_000;
const OPTION_LIMIT = 5_000;

function bit(i: number): Mask {
  return 1n << BigInt(i);
}

/** Sve podskupove `cards` čiji je zbir jednak nekoj od `targets` vrednosti. */
function findGroups(cards: readonly Card[], targets: readonly number[]): Mask[] {
  const maxT = Math.max(...targets);
  const vals = cards.map(cardValues);
  const out = new Set<Mask>();
  const dfs = (start: number, sum: number, mask: Mask): void => {
    if (out.size >= GROUP_LIMIT) return;
    for (let j = start; j < cards.length; j++) {
      for (const v of vals[j]) {
        const s = sum + v;
        if (s > maxT) continue;
        const m = mask | bit(j);
        if (targets.includes(s)) out.add(m);
        dfs(j + 1, s, m);
      }
    }
  };
  dfs(0, 0, 0n);
  return [...out];
}

function lowestBit(mask: Mask): number {
  let i = 0;
  while (((mask >> BigInt(i)) & 1n) === 0n) i++;
  return i;
}

/** Da li se SVE karte iz `cards` mogu podeliti u grupe čiji je zbir iz `targets`. */
export function canPartition(cards: readonly Card[], targets: readonly number[]): boolean {
  if (cards.length === 0) return false;
  const groups = findGroups(cards, targets);
  const memo = new Map<Mask, boolean>();
  const cover = (mask: Mask): boolean => {
    if (mask === 0n) return true;
    const cached = memo.get(mask);
    if (cached !== undefined) return cached;
    const b = bit(lowestBit(mask));
    let ok = false;
    for (const g of groups) {
      if ((g & b) !== 0n && (g & ~mask) === 0n && cover(mask & ~g)) { ok = true; break; }
    }
    memo.set(mask, ok);
    return ok;
  };
  return cover((1n << BigInt(cards.length)) - 1n);
}

/** Da li `played` sme da odnese baš ove karte sa stola. */
export function isValidCapture(played: Card, captured: readonly Card[]): boolean {
  return canPartition(captured, cardValues(played));
}

/**
 * Sve različite kombinacije koje `played` može da odnese sa `table`
 * (svaka kombinacija = unija disjunktnih grupa). Ne uključuje "baci na sto".
 */
export function captureOptions(played: Card, table: readonly Card[]): Card[][] {
  const groups = findGroups(table, cardValues(played));
  if (groups.length === 0) return [];
  const seen = new Set<Mask>();
  const extend = (used: Mask): void => {
    for (const g of groups) {
      if (seen.size >= OPTION_LIMIT) return;
      if ((g & used) !== 0n) continue;
      const u = used | g;
      if (seen.has(u)) continue;
      seen.add(u);
      extend(u);
    }
  };
  extend(0n);
  return [...seen].map(mask => table.filter((_, i) => (mask & bit(i)) !== 0n));
}

/** Rangovi karata koje bi, odigrane, odnele CEO sto (tj. napravile tablu). */
export function clearingRanks(table: readonly Card[]): Rank[] {
  if (table.length === 0) return [];
  return RANKS.filter(rank => canPartition(table, cardValues({ id: '', rank, suit: '♠' })));
}
