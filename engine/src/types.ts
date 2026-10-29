// SVI TIPOVI za Tablić engine — ništa sem tipova.

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// Id karte je rank + slovo boje (npr. "10D", "AS", "2C") — isto kao imena
// SVG fajlova u preferans/icons/cards, da bi se kasnije mogao deliti isti set.
export type CardId = string;

export interface Card {
  id: CardId;
  suit: Suit;
  rank: Rank;
}

/** Mesto za stolom, po redu igranja (igra se u smeru suprotnom od kazaljke na satu). */
export type Position = number;

/**
 * Strana koja skuplja poene: u igri u dvoje i troje to je igrač, a u četvoro par
 * (mesta 0 i 2 protiv 1 i 3, partneri sede unakrsno).
 */
export type Side = number;

export type PlayerCount = 2 | 3 | 4;

export interface TablicOptions {
  /** Broj igrača: 2, 3 (svako za sebe) ili 4 (2 na 2). Podrazumevano 2. */
  players?: PlayerCount;
  /** Seed za mešanje (testovi, replay). Bez seed-a koristi Math.random. */
  seed?: number;
  /** Do koliko poena se igra meč. Podrazumevano 101. */
  targetScore?: number;
  /** Da li se tabla računa i kad je napravljena poslednjom kartom partije. */
  tablaOnLastMove?: boolean;
  /** Delilac prve partije. Bez ovoga se izvlači nasumično (kao sečenje za delioca). */
  firstDealer?: Position;
}

export type Phase = 'PLAYING' | 'DEAL_END' | 'MATCH_END';

export interface PlayerState {
  hand: Card[];
  captured: Card[];
  tablas: number;
}

export interface MoveRecord {
  player: Position;
  card: Card;
  captured: Card[];
  tabla: boolean;
}

export interface DealScore {
  side: Side;
  cardPoints: number;   // desetke, slike, kečevi, 2♣, 10♦
  mostCards: number;    // 3 ili 0
  tablas: number;
  total: number;
  cardCount: number;
}

export interface DealResult {
  dealNo: number;
  scores: DealScore[];
  /** Kome je pripao ostatak sa stola na kraju partije (ili null ako je sto bio prazan). */
  leftoverTo: Position | null;
  leftover: Card[];
}

export interface TablicState {
  phase: Phase;
  /** Redni broj partije (jedna partija = ceo špil od 52 karte). */
  dealNo: number;
  /** Deljenje unutar partije: 1..4 u dvoje, 1..3 u troje, 1..2 u četvoro. */
  round: number;
  dealer: Position;
  turn: Position;
  deck: Card[];
  table: Card[];
  players: PlayerState[];
  /** Zbir poena u meču po strani (zaključno sa završenim partijama). */
  scores: number[];
  lastCapturer: Position | null;
  lastMove: MoveRecord | null;
  history: DealResult[];
  winner: Side | null;
}

/** Ono što jedan igrač sme da vidi (tuđe ruke i špil su skriveni). */
export interface PlayerView {
  phase: Phase;
  dealNo: number;
  round: number;
  dealer: Position;
  turn: Position;
  me: Position;
  /** Koliko deljenja ima jedna partija (4, 3 ili 2, zavisi od broja igrača). */
  roundsPerDeal: number;
  deckCount: number;
  table: Card[];
  hand: Card[];
  players: {
    side: Side;
    handCount: number;
    /**
     * Šta je ko odneo: svi su gledali poteze, pa to igrač može da zapamti (AI pamti savršeno).
     * Po pravilima se nošene karte okreću licem nadole, pa ih ekran ne prikazuje.
     */
    captured: Card[];
    tablas: number;
  }[];
  scores: number[];
  lastCapturer: Position | null;
  lastMove: MoveRecord | null;
  history: DealResult[];
  winner: Side | null;
}

export interface Move {
  cardId: CardId;
  /** Id-jevi karata sa stola koje se nose. Prazno = karta se baca na sto. */
  capture: CardId[];
}
