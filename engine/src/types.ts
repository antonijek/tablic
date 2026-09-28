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

// MVP: 1 na 1. Tip je ostavljen širi da bi 3 igrača / 2 na 2 kasnije
// ušli bez menjanja potpisa.
export type Position = number;

export interface TablicOptions {
  /** Broj igrača — za sada samo 2. */
  players?: 2;
  /** Seed za mešanje (testovi, replay). Bez seed-a koristi Math.random. */
  seed?: number;
  /** Do koliko poena se igra meč. Podrazumevano 101. */
  targetScore?: number;
  /** Da li se tabla računa i kad je napravljena poslednjom kartom partije. */
  tablaOnLastMove?: boolean;
}

export type Phase = 'PLAYING' | 'DEAL_END' | 'MATCH_END';

export interface PlayerState {
  hand: Card[];
  captured: Card[];
  tablas: number;
  /** Ukupan zbir poena u meču (zaključno sa završenim partijama). */
  score: number;
}

export interface MoveRecord {
  player: Position;
  card: Card;
  captured: Card[];
  tabla: boolean;
}

export interface DealScore {
  player: Position;
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
  /** Deljenje unutar partije: 1..4 za 2 igrača. */
  round: number;
  dealer: Position;
  turn: Position;
  deck: Card[];
  table: Card[];
  players: PlayerState[];
  lastCapturer: Position | null;
  lastMove: MoveRecord | null;
  history: DealResult[];
  winner: Position | null;
}

/** Ono što jedan igrač sme da vidi (tuđa ruka i špil su skriveni). */
export interface PlayerView {
  phase: Phase;
  dealNo: number;
  round: number;
  dealer: Position;
  turn: Position;
  me: Position;
  deckCount: number;
  table: Card[];
  hand: Card[];
  players: {
    handCount: number;
    /** Nošene karte su javne (u igri uživo se vidi šta je ko odneo). */
    captured: Card[];
    tablas: number;
    score: number;
    capturedPoints: number;
  }[];
  lastCapturer: Position | null;
  lastMove: MoveRecord | null;
  history: DealResult[];
  winner: Position | null;
}

export interface Move {
  cardId: CardId;
  /** Id-jevi karata sa stola koje se nose. Prazno = karta se baca na sto. */
  capture: CardId[];
}
