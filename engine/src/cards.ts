// Špil, mešanje, vrednosti karata i bodovi.

import type { Card, Rank, Suit } from './types.js';

export const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_LETTER: Record<Suit, string> = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' };

export function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}${SUIT_LETTER[suit]}`, rank, suit };
}

/** Parsira id tipa "10D" / "AS" — zgodno za testove. */
export function cardFromId(id: string): Card {
  const letter = id.slice(-1);
  const rank = id.slice(0, -1) as Rank;
  const suit = SUITS.find(s => SUIT_LETTER[s] === letter);
  if (!suit || !RANKS.includes(rank)) throw new Error(`Nepoznata karta: ${id}`);
  return makeCard(rank, suit);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(makeCard(rank, suit));
  return deck;
}

/** mulberry32 — mali deterministički RNG za seed-ovane partije. */
export function makeRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Vrednosti karte za nošenje. Kec vredi 1 ili 11, žandar 12, dama 13, kralj 14.
 */
export function cardValues(card: Card): number[] {
  switch (card.rank) {
    case 'A': return [1, 11];
    case 'J': return [12];
    case 'Q': return [13];
    case 'K': return [14];
    default: return [Number(card.rank)];
  }
}

/**
 * Bodovi karte: 10, J, Q, K, A = 1; 10♦ = 2 ("velika desetka"); 2♣ = 1 ("mala dvojka").
 * Ukupno u špilu: 22 poena.
 */
export function cardPoints(card: Card): number {
  if (card.rank === '10' && card.suit === '♦') return 2;
  if (card.rank === '2' && card.suit === '♣') return 1;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' || card.rank === 'A') return 1;
  return 0;
}

export function sumPoints(cards: readonly Card[]): number {
  return cards.reduce((s, c) => s + cardPoints(c), 0);
}

export const TOTAL_CARD_POINTS = 22;
export const MOST_CARDS_POINTS = 3;
