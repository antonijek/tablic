// Mesta za stolom, pločice igrača i rezultat. Igra ide suprotno od kazaljke na satu:
// posle mene igra onaj sa moje desne strane, pa onaj preko puta, pa onaj sa leve.

import { backEl } from './cards.js';

export const ME = 0;

const SEATS = { 2: ['me', 'top'], 3: ['me', 'right', 'left'], 4: ['me', 'right', 'top', 'left'] };
// Računari imaju imena kao u Lori; u četvoro je Marko (preko puta) partner.
const NAMES = { 2: ['Vi', 'Marko'], 3: ['Vi', 'Ana', 'Luka'], 4: ['Vi', 'Ana', 'Marko', 'Luka'] };
const PAIR_NAMES = ['Mi', 'Oni'];
let roomNames = null; // online: imena iz sobe, po mestima na ekranu

export function setNames(names) {
  roomNames = names;
}

export function playerName(pos, playerCount) {
  return roomNames?.[pos] ?? NAMES[playerCount][pos];
}

export function sideName(side, playerCount) {
  return playerCount === 4 ? PAIR_NAMES[side] : playerName(side, playerCount);
}

function tablasText(n) {
  if (n === 1) return '1 tabla';
  return n < 5 ? `${n} table` : `${n} tabli`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Pločica: avatar, ime, table (pišu se odmah, pa se vide; nošene karte ne), oznaka delioca. */
function plate(view, pos, active) {
  const n = view.players.length;
  const p = view.players[pos];
  const box = el('div', 'plate');
  box.classList.toggle('active', active);
  const name = playerName(pos, n);
  box.append(el('div', `avatar p${pos}`, name[0]));
  const info = el('div', 'info');
  info.append(el('div', 'name', name));
  const partner = n === 4 && pos !== ME && p.side === view.players[ME].side;
  if (p.tablas > 0) info.append(el('div', 'sub tablas', tablasText(p.tablas)));
  else info.append(el('div', 'sub', partner ? 'partner' : 'bez tabli'));
  box.append(info);
  if (view.dealer === pos) {
    const chip = el('span', 'dealer-chip', 'D');
    chip.title = 'deli';
    box.append(chip);
  }
  return box;
}

/** Protivnici (i partner) oko stola; karte u ruci se vide samo kao poleđine. */
export function renderOpponents(container, view, preview) {
  const n = view.players.length;
  const seats = [];
  for (let pos = 0; pos < n; pos++) {
    if (pos === ME) continue;
    const seat = el('section', `seat seat-${SEATS[n][pos]}`);
    seat.id = `seat${pos}`;
    const active = view.phase === 'PLAYING' && view.turn === pos;
    const hand = el('div', 'mini-hand');
    const count = view.players[pos].handCount - (preview?.player === pos ? 1 : 0);
    hand.append(...Array.from({ length: count }, backEl));
    seat.append(plate(view, pos, active), hand);
    seats.push(seat);
  }
  container.replaceChildren(...seats);
}

export function renderMe(container, view, myTurn) {
  container.replaceChildren(plate(view, ME, myTurn));
}

export function renderScoreBar(container, view) {
  const n = view.players.length;
  const mySide = view.players[ME].side;
  const parts = view.scores.flatMap((score, side) => {
    const span = el('span');
    span.classList.toggle('mine', side === mySide);
    span.append(`${sideName(side, n)} `, el('b', '', score));
    return side === 0 ? [span] : [el('span', 'sep', ':'), span];
  });
  container.replaceChildren(...parts);
}
