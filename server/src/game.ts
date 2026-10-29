// Sve što server zna o samoj igri. Sobe, socket-i i rejting ne znaju za pravila Tablića,
// pa se isti server kasnije može iskoristiti za Remi (zameni se samo ovaj fajl).

import { TablicGame, TablicError, chooseMove } from '../../engine/dist/index.js';
import type { PlayerCount, PlayerView, TablicState } from '../../engine/dist/index.js';

export type Game = TablicGame;
export type GameState = TablicState;
export type View = PlayerView;
export type Phase = 'PLAYING' | 'DEAL_END' | 'MATCH_END';

export const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4];
export const isPlayerCount = (n: unknown): n is PlayerCount => PLAYER_COUNTS.includes(n as PlayerCount);

export const newGame = (players: PlayerCount): Game => new TablicGame({ players });
export const restoreGame = (state: GameState): Game => TablicGame.fromState(state);

export const phase = (g: Game): Phase => g.peek().phase;
export const turn = (g: Game): number => g.peek().turn;
export const viewFor = (g: Game, seat: number): View => g.getPlayerView(seat);
export const sideOf = (g: Game, seat: number): number => g.sideOf(seat);
export const sideScores = (g: Game): number[] => g.peek().scores.slice();
export const history = (g: Game): unknown => g.peek().history;
export const nextDeal = (g: Game): void => g.nextDeal();

/** Odigraj potez iz klijenta. Vraća poruku greške za igrača ili null ako je potez prošao. */
export function applyAction(g: Game, seat: number, action: unknown): string | null {
  const a = action as { cardId?: unknown; capture?: unknown } | null;
  if (!a || typeof a.cardId !== 'string' || !Array.isArray(a.capture) || a.capture.length > 52
    || !a.capture.every((id): id is string => typeof id === 'string')) {
    return 'Neispravan potez.';
  }
  try {
    g.play(seat, a.cardId, a.capture);
    return null;
  } catch (e) {
    if (e instanceof TablicError) return e.message;
    throw e;
  }
}

/** Potez računara (isti najjači AI kao u igri protiv računara). */
export function playAi(g: Game, seat: number): void {
  const m = chooseMove(g.getPlayerView(seat), 'hard');
  g.play(seat, m.cardId, m.capture);
}
