// Kraj partije i meča u online igri: isti prozor kao protiv računara, plus rejting i „Dalje“.

import { fillDealEnd } from './deal-end.js';

const $ = id => document.getElementById(id);

export function fillOnlineEnd(view, room) {
  fillDealEnd(view, 0); // prikaz je okrenut: ja sam mesto 0, moja strana je 0
  $('shareBtn').hidden = true;
  const btn = $('nextDealBtn');
  btn.disabled = false;
  if (view.phase === 'MATCH_END') {
    const r = room.rating;
    const d = r?.deltas[room.mySeat] ?? 0;
    $('dealEndNote').textContent += r?.rated
      ? ` Rejting: ${d >= 0 ? '+' : ''}${d} → ${r.newRatings[room.mySeat]}.`
      : ' Meč nije rangiran (rangirano je kad za stolom sede bar dva čoveka).';
    btn.textContent = 'Nazad u lobi';
  } else {
    $('dealEndNote').textContent += ' Sledeća partija počinje kad svi kliknu „Dalje“ (najviše 15 s).';
    btn.textContent = 'Dalje';
  }
}
