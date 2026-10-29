// Čuvanje partije u pregledaču (localStorage). Igra radi i kad čuvanje ne uspe,
// ali igrač to mora da zna, pa se greška prijavljuje (jednom).
// `slot` je ključ: obična igra ili partija dnevnog izazova (ui/daily.js).

import { TablicGame } from '../engine/dist/index.js';

export const NORMAL_SLOT = 'tablic.save.v2';
const OLD_KEYS = ['tablic.save.v1'];
let warned = false;

export function saveGame(game, onError, slot = NORMAL_SLOT) {
  try {
    localStorage.setItem(slot, JSON.stringify(game.getState()));
  } catch (e) {
    if (!warned) onError(`Igra se ne čuva na ovom uređaju (${e.message}).`);
    warned = true;
  }
}

function isSavedState(s) {
  return s && Array.isArray(s.players) && [2, 3, 4].includes(s.players.length)
    && Array.isArray(s.scores) && Array.isArray(s.table) && Array.isArray(s.history);
}

/** Vrati sačuvanu igru ili null (nema je, ili je iz stare verzije). */
export function loadGame(onError, slot = NORMAL_SLOT) {
  let raw;
  try {
    for (const k of OLD_KEYS) localStorage.removeItem(k);
    raw = localStorage.getItem(slot);
  } catch (e) {
    onError(`Sačuvana igra ne može da se pročita (${e.message}).`);
    return null;
  }
  if (!raw) return null;
  try {
    const state = JSON.parse(raw);
    if (!isSavedState(state)) throw new Error('nepoznat format');
    return TablicGame.fromState(state);
  } catch (e) {
    onError(`Sačuvana igra nije mogla da se učita (${e.message}), počinje nova.`);
    return null;
  }
}
