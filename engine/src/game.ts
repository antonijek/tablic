// Game klasa — orkestrira deljenje, poteze, kraj partije i kraj meča.

import type {
  Card, CardId, DealResult, Move, MoveRecord, PlayerCount, PlayerView, Position, Side, TablicOptions, TablicState,
} from './types.js';
import { createDeck, makeRng, shuffle } from './cards.js';
import { captureOptions, isValidCapture } from './capture.js';
import { scoreDeal } from './scoring.js';
import { handSizeFor, INITIAL_TABLE, roundsPerDeal, sideCount, sideOf } from './sides.js';

export class TablicError extends Error {}

export class TablicGame {
  private state: TablicState;
  private readonly rng: () => number;
  readonly playerCount: PlayerCount;
  readonly targetScore: number;
  readonly tablaOnLastMove: boolean;
  readonly roundsPerDeal: number;

  constructor(opts: TablicOptions = {}) {
    this.playerCount = opts.players ?? 2;
    if (![2, 3, 4].includes(this.playerCount)) throw new TablicError('Tablić se igra u dvoje, troje ili četvoro');
    this.targetScore = opts.targetScore ?? 101;
    this.tablaOnLastMove = opts.tablaOnLastMove ?? false;
    this.roundsPerDeal = roundsPerDeal(this.playerCount);
    this.rng = makeRng(opts.seed);
    const firstDealer = opts.firstDealer ?? Math.floor(this.rng() * this.playerCount);
    this.state = {
      phase: 'PLAYING',
      dealNo: 0,
      round: 0,
      // startDeal() pomera delioca za jedno mesto, pa se ovde kreće od mesta pre njega.
      dealer: (firstDealer + this.playerCount - 1) % this.playerCount,
      turn: 0,
      deck: [],
      table: [],
      players: Array.from({ length: this.playerCount }, () => ({ hand: [], captured: [], tablas: 0 })),
      scores: new Array(sideCount(this.playerCount)).fill(0),
      lastCapturer: null,
      lastMove: null,
      history: [],
      winner: null,
    };
    this.startDeal();
  }

  /** Vrati igru iz sačuvanog stanja (server posle restarta, testovi). */
  static fromState(state: TablicState, opts: TablicOptions = {}): TablicGame {
    const game = new TablicGame({ ...opts, players: state.players.length as PlayerCount, firstDealer: 0 });
    game.state = structuredClone(state);
    return game;
  }

  /** Stanje BEZ kopiranja — samo za čitanje (brze simulacije AI-ja). */
  peek(): Readonly<TablicState> {
    return this.state;
  }

  /** Kopija celog stanja (za server / testove — sadrži i tuđe karte). */
  getState(): TablicState {
    return structuredClone(this.state);
  }

  sideOf(player: Position): Side {
    return sideOf(player, this.playerCount);
  }

  /** Stanje kako ga vidi jedan igrač — bez tuđih ruku i redosleda špila. */
  getPlayerView(me: Position): PlayerView {
    const s = this.state;
    return structuredClone({
      phase: s.phase,
      dealNo: s.dealNo,
      round: s.round,
      dealer: s.dealer,
      turn: s.turn,
      me,
      roundsPerDeal: this.roundsPerDeal,
      deckCount: s.deck.length,
      table: s.table,
      hand: s.players[me].hand,
      players: s.players.map((p, i) => ({
        side: this.sideOf(i),
        handCount: p.hand.length,
        captured: p.captured,
        tablas: p.tablas,
      })),
      scores: s.scores,
      lastCapturer: s.lastCapturer,
      lastMove: s.lastMove,
      history: s.history,
      winner: s.winner,
    });
  }

  /** Sve kombinacije koje karta iz ruke može da odnese sa trenutnog stola. */
  getCaptureOptions(player: Position, cardId: CardId): Card[][] {
    const card = this.state.players[player]?.hand.find(c => c.id === cardId);
    if (!card) return [];
    return captureOptions(card, this.state.table);
  }

  /** Svi legalni potezi igrača (svako nošenje + bacanje svake karte). */
  getLegalMoves(player: Position): Move[] {
    const s = this.state;
    if (s.phase !== 'PLAYING' || s.turn !== player) return [];
    const moves: Move[] = [];
    for (const card of s.players[player].hand) {
      moves.push({ cardId: card.id, capture: [] });
      for (const opt of captureOptions(card, s.table)) {
        moves.push({ cardId: card.id, capture: opt.map(c => c.id) });
      }
    }
    return moves;
  }

  /**
   * Odigraj kartu. `capture` = id-jevi karata sa stola koje se nose;
   * prazno = karta se baca na sto (nošenje nije obavezno).
   */
  play(player: Position, cardId: CardId, capture: CardId[] = []): MoveRecord {
    const s = this.state;
    if (s.phase !== 'PLAYING') throw new TablicError('Partija nije u toku');
    if (s.turn !== player) throw new TablicError('Nije vaš red');

    const p = s.players[player];
    const handIdx = p.hand.findIndex(c => c.id === cardId);
    if (handIdx < 0) throw new TablicError('Te karte nema u ruci');
    if (new Set(capture).size !== capture.length) throw new TablicError('Ista karta izabrana dva puta');

    const captured = capture.map(id => {
      const c = s.table.find(t => t.id === id);
      if (!c) throw new TablicError('Te karte nema na stolu');
      return c;
    });
    const card = p.hand[handIdx];
    if (captured.length > 0 && !isValidCapture(card, captured)) {
      throw new TablicError('Ta kombinacija se ne može odneti ovom kartom');
    }

    p.hand.splice(handIdx, 1);
    let tabla = false;
    if (captured.length > 0) {
      const ids = new Set(capture);
      s.table = s.table.filter(c => !ids.has(c.id));
      p.captured.push(card, ...captured);
      s.lastCapturer = player;
      if (s.table.length === 0 && this.tablaCounts(player)) {
        tabla = true;
        p.tablas++;
      }
    } else {
      s.table.push(card);
    }

    const record: MoveRecord = { player, card, captured, tabla };
    s.lastMove = record;
    s.turn = (player + 1) % this.playerCount;
    this.afterMove();
    return structuredClone(record);
  }

  /** Posle DEAL_END — počni sledeću partiju. */
  nextDeal(): void {
    if (this.state.phase !== 'DEAL_END') throw new TablicError('Partija još nije završena');
    this.startDeal();
  }

  // ---------------------------------------------------------------

  /**
   * Tabla se ne piše poslednjom kartom partije, niti strani koja već ima 100 poena
   * (cilj − 1): poslednji poen se ne može dobiti tablom (tablic.live, legalbet.rs, Vreme).
   */
  private tablaCounts(player: Position): boolean {
    if (!this.tablaOnLastMove && this.isLastCardOfDeal()) return false;
    return this.state.scores[this.sideOf(player)] < this.targetScore - 1;
  }

  private isLastCardOfDeal(): boolean {
    const s = this.state;
    return s.deck.length === 0 && s.players.every(p => p.hand.length === 0);
  }

  private startDeal(): void {
    const s = this.state;
    s.dealNo++;
    s.round = 0;
    // Deljenje i igra idu u smeru suprotnom od kazaljke na satu: posle delioca je
    // igrač sa njegove desne strane, on igra prvi i on deli sledeću partiju.
    s.dealer = (s.dealer + 1) % this.playerCount;
    s.turn = (s.dealer + 1) % this.playerCount;
    s.deck = shuffle(createDeck(), this.rng);
    s.table = s.deck.splice(0, INITIAL_TABLE);
    s.lastCapturer = null;
    s.lastMove = null;
    s.phase = 'PLAYING';
    for (const p of s.players) {
      p.hand = [];
      p.captured = [];
      p.tablas = 0;
    }
    this.dealHands();
  }

  private dealHands(): void {
    const s = this.state;
    s.round++;
    const size = handSizeFor(s.deck.length, this.playerCount);
    for (const p of s.players) p.hand = s.deck.splice(0, size);
  }

  private afterMove(): void {
    const s = this.state;
    if (s.players.some(p => p.hand.length > 0)) return;
    if (s.deck.length > 0) {
      this.dealHands();
      return;
    }
    this.endDeal();
  }

  private endDeal(): void {
    const s = this.state;
    const leftover = s.table;
    const leftoverTo = leftover.length > 0 ? s.lastCapturer : null;
    if (leftoverTo !== null) s.players[leftoverTo].captured.push(...leftover);
    s.table = [];

    const sides = s.scores.length;
    const capturedBySide: Card[][] = Array.from({ length: sides }, () => []);
    const tablasBySide = new Array<number>(sides).fill(0);
    s.players.forEach((p, i) => {
      capturedBySide[this.sideOf(i)].push(...p.captured);
      tablasBySide[this.sideOf(i)] += p.tablas;
    });
    const scores = scoreDeal(capturedBySide, tablasBySide);
    scores.forEach(sc => { s.scores[sc.side] += sc.total; });
    const result: DealResult = { dealNo: s.dealNo, scores, leftoverTo, leftover };
    s.history.push(result);

    // Meč: pobeđuje ko dostigne cilj; ako ga dostigne više strana, veći zbir;
    // ako su izjednačeni na vrhu, igra se još jedna partija.
    const best = Math.max(...s.scores);
    if (best >= this.targetScore && s.scores.filter(t => t === best).length === 1) {
      s.winner = s.scores.indexOf(best);
      s.phase = 'MATCH_END';
    } else {
      s.phase = 'DEAL_END';
    }
  }
}
