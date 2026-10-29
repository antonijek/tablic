// Prozor na kraju partije: bodovi po strani, ostatak sa stola i kraj meča.

import { cardName } from './cards.js';
import { ME, playerName, sideName } from './seats.js';

const $ = id => document.getElementById(id);

function row(label, values, cls = '') {
  const tr = document.createElement('tr');
  if (cls) tr.className = cls;
  for (const text of [label, ...values]) {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  }
  return tr;
}

function leftoverNote(last, n) {
  if (last.leftoverTo === null) return '';
  const cards = last.leftover.map(cardName).join(' ');
  if (last.leftoverTo === ME) return `Ostatak sa stola (${cards}) nosite vi, jer ste poslednji nosili.`;
  return `Ostatak sa stola (${cards}) dobija poslednji koji je nosio: ${playerName(last.leftoverTo, n)}.`;
}

function matchTitle(state, n, mySide) {
  if (state.winner === mySide) return 'Pobeda! 🎉';
  if (n === 4) return 'Pobedili su oni';
  return `Pobednik: ${playerName(state.winner, n)}`;
}

/** Popuni prozor iz stanja igre; vraća false ako još nema završene partije. */
export function fillDealEnd(state, mySide) {
  const last = state.history.at(-1);
  if (!last) return false;
  const n = state.players.length;
  const sc = last.scores;

  const head = document.createElement('tr');
  for (const text of ['', ...sc.map(s => sideName(s.side, n))]) {
    const th = document.createElement('th');
    th.textContent = text;
    head.append(th);
  }
  $('dealEndHead').replaceChildren(head);
  $('dealEndBody').replaceChildren(
    row('Karte (broj)', sc.map(s => s.cardCount)),
    row('Poeni u kartama', sc.map(s => s.cardPoints)),
    row('Više karata', sc.map(s => s.mostCards)),
    row('Table', sc.map(s => s.tablas)),
    row('Partija', sc.map(s => s.total), 'total'),
    row('Ukupno', state.scores, 'total'),
  );
  $('dealEndNote').textContent = leftoverNote(last, n);

  const over = state.phase === 'MATCH_END';
  $('dealEndTitle').textContent = over ? matchTitle(state, n, mySide) : `Kraj partije ${last.dealNo}`;
  $('nextDealBtn').textContent = over ? 'Nova igra' : 'Sledeća partija';
  return true;
}
