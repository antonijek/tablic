// Prikaz karata: slike iz icons/cards (CC0 set, isti kao u Preferansu i Lori; WebP radi brzine).

import { cardPoints } from '../engine/dist/index.js';

const SUIT_NAME = { '♠': 'pik', '♥': 'herc', '♦': 'karo', '♣': 'tref' };

export function cardName(card) {
  return `${card.rank}${card.suit}`;
}

function cardImg(file) {
  const img = document.createElement('img');
  img.src = `./icons/cards/${file}.webp`;
  img.alt = '';
  img.draggable = false;
  return img;
}

/**
 * opts: onClick, selected, taking (karta koju upravo nosi računar),
 * incoming (karta koju je računar upravo odigrao).
 */
export function cardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;
  el.append(cardImg(card.id));
  el.setAttribute('aria-label', `${card.rank} ${SUIT_NAME[card.suit]}`);
  const pts = cardPoints(card);
  if (pts > 0) {
    const badge = document.createElement('span');
    badge.className = 'pts';
    badge.textContent = pts;
    badge.title = pts === 1 ? 'nosi 1 poen' : `nosi ${pts} poena`;
    el.append(badge);
  }
  if (opts.onClick) {
    el.classList.add('clickable');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.addEventListener('click', opts.onClick);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onClick(); }
    });
  }
  el.classList.toggle('selected', Boolean(opts.selected));
  el.classList.toggle('taking', Boolean(opts.taking));
  el.classList.toggle('incoming', Boolean(opts.incoming));
  return el;
}

export function backEl() {
  const el = document.createElement('div');
  el.className = 'card back';
  el.append(cardImg('back-red'));
  return el;
}
