// Ko sa kim igra i koliko karata se deli — zavisi samo od broja igrača.

import type { Position, Side } from './types.js';

export const HAND_SIZE = 6;
export const INITIAL_TABLE = 4;
const DECK_SIZE = 52;

/** U četvoro igraju parovi (0 i 2 protiv 1 i 3), inače svako za sebe. */
export function sideCount(playerCount: number): number {
  return playerCount === 4 ? 2 : playerCount;
}

export function sideOf(player: Position, playerCount: number): Side {
  return playerCount === 4 ? player % 2 : player;
}

/**
 * Koliko karata dobija svaki igrač u sledećem deljenju: po 6, a kad ne ostane
 * dovoljno za 6, ostatak se podeli na jednake delove (u troje: 6, 6, pa 4).
 */
export function handSizeFor(deckCount: number, playerCount: number): number {
  return Math.min(HAND_SIZE, Math.floor(deckCount / playerCount));
}

/** Broj deljenja u partiji: 4 u dvoje, 3 u troje, 2 u četvoro. */
export function roundsPerDeal(playerCount: number): number {
  let deck = DECK_SIZE - INITIAL_TABLE;
  let rounds = 0;
  while (deck > 0) {
    deck -= handSizeFor(deck, playerCount) * playerCount;
    rounds++;
  }
  return rounds;
}
