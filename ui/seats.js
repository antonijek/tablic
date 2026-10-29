// Mesta za stolom, imena i rezultat. Igra ide suprotno od kazaljke na satu: posle
// mene igra onaj sa moje desne strane, pa onaj preko puta, pa onaj sa leve.

import { backEl } from './cards.js';

export const ME = 0;

const SEATS = { 2: ['me', 'top'], 3: ['me', 'right', 'left'], 4: ['me', 'right', 'top', 'left'] };
const NAMES = { 2: ['Vi', 'Računar'], 3: ['Vi', 'Desni', 'Levi'], 4: ['Vi', 'Desni', 'Partner', 'Levi'] };
const PAIR_NAMES = ['Mi', 'Oni'];
const SCREEN_ORDER = ['left', 'top', 'right'];

export function playerName(pos, playerCount) {
  return NAMES[playerCount][pos];
}

export function sideName(side, playerCount) {
  return playerCount === 4 ? PAIR_NAMES[side] : NAMES[playerCount][side];
}

function tablasText(n) {
  if (n === 1) return '1 tabla';
  return n < 5 ? `${n} table` : `${n} tabli`;
}

/** Ime, oznaka delioca i table (table se pišu odmah, pa se vide; nošene karte ne). */
export function seatLabel(view, pos) {
  const el = document.createElement('div');
  el.className = 'seat-label';
  const name = document.createElement('b');
  name.textContent = playerName(pos, view.players.length);
  el.append(name);
  if (view.dealer === pos) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = 'deli';
    el.append(chip);
  }
  const tablas = view.players[pos].tablas;
  if (tablas > 0) {
    const t = document.createElement('span');
    t.className = 'tablas';
    t.textContent = tablasText(tablas);
    el.append(t);
  }
  return el;
}

function opponentEl(view, pos, seat, preview) {
  const p = view.players[pos];
  const box = document.createElement('section');
  box.className = `opp seat-${seat}`;
  box.id = `seat${pos}`;
  box.classList.toggle('turn', view.phase === 'PLAYING' && view.turn === pos);
  box.classList.toggle('partner', view.players.length === 4 && p.side === view.players[ME].side);
  const hand = document.createElement('div');
  hand.className = 'mini-hand';
  const count = p.handCount - (preview?.player === pos ? 1 : 0);
  hand.append(...Array.from({ length: count }, backEl));
  box.append(seatLabel(view, pos), hand);
  return box;
}

/** Protivnici (i partner) u gornjem redu: levi, preko puta, desni. */
export function renderOpponents(container, view, preview) {
  const n = view.players.length;
  const seats = [];
  for (let pos = 0; pos < n; pos++) if (pos !== ME) seats.push({ pos, seat: SEATS[n][pos] });
  seats.sort((a, b) => SCREEN_ORDER.indexOf(a.seat) - SCREEN_ORDER.indexOf(b.seat));
  container.dataset.players = String(n);
  container.replaceChildren(...seats.map(({ pos, seat }) => opponentEl(view, pos, seat, preview)));
}

export function renderScoreBar(container, view) {
  const n = view.players.length;
  const mySide = view.players[ME].side;
  const parts = view.scores.flatMap((score, side) => {
    const el = document.createElement('span');
    el.classList.toggle('mine', side === mySide);
    const b = document.createElement('b');
    b.textContent = score;
    el.append(`${sideName(side, n)} `, b);
    if (side === 0) return [el];
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = ':';
    return [sep, el];
  });
  container.replaceChildren(...parts);
}
