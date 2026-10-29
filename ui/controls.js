// Dugmad i uputstvo ispod stola: šta igrač sme i treba sledeće da uradi.

import { captureOptions, isValidCapture } from '../engine/dist/index.js';
import { cardName } from './cards.js';
import { playerName } from './seats.js';

const $ = id => document.getElementById(id);

export function updateControls(view, myTurn, selectedHand, selectedTable) {
  const hint = $('hint');
  const captureBtn = $('captureBtn');
  captureBtn.disabled = $('throwBtn').disabled = $('suggestBtn').disabled = !myTurn;
  captureBtn.textContent = 'Nosi';
  if (!myTurn) {
    hint.textContent = view.phase === 'PLAYING' ? `Na potezu: ${playerName(view.turn, view.players.length)}…` : '';
    return;
  }

  const card = view.hand.find(c => c.id === selectedHand);
  const picked = view.table.filter(c => selectedTable.has(c.id));
  const valid = card && picked.length > 0 && isValidCapture(card, picked);
  captureBtn.disabled = !valid;
  if (picked.length > 0) captureBtn.textContent = `Nosi (${picked.length})`;
  $('throwBtn').disabled = !card;

  if (!card) {
    hint.textContent = 'Vi ste na potezu. Izaberite kartu iz ruke.';
  } else if (picked.length === 0) {
    hint.textContent = captureOptions(card, view.table).length > 0
      ? `Izaberite karte sa stola koje nosite sa ${cardName(card)} (ili „Predlog“).`
      : `${cardName(card)} ne može ništa da odnese — bacite je na sto.`;
  } else {
    hint.textContent = valid ? 'Može! Pritisnite „Nosi“.' : 'Ova kombinacija ne daje tačan zbir.';
  }
}
