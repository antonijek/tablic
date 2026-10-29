// Online: server šalje prikaz za moje mesto (mySeat), a ekran uvek crta mene na mestu 0
// (dole). Ovde se prikaz „okrene“: mesta, red, delilac, potezi, a strane tako da je moja
// strana uvek 0 (u četvoro „Mi“). Igra ide istim smerom, pa se red igranja ne menja.

export function rotateView(view, mySeat) {
  const n = view.players.length;
  const pos = p => (p - mySeat + n) % n;          // mesto na serveru → mesto na ekranu
  const flip = n === 4 && mySeat % 2 === 1;
  const side = s => (n === 4 ? (flip ? 1 - s : s) : pos(s));
  const bySide = arr => {
    const out = new Array(arr.length);
    arr.forEach((x, s) => { out[side(s)] = x; });
    return out;
  };
  const players = Array.from({ length: n }, (_, l) => {
    const p = view.players[(l + mySeat) % n];
    return { ...p, side: side(p.side) };
  });
  return {
    ...view,
    me: 0,
    players,
    turn: pos(view.turn),
    dealer: pos(view.dealer),
    scores: bySide(view.scores),
    lastCapturer: view.lastCapturer === null ? null : pos(view.lastCapturer),
    lastMove: view.lastMove ? { ...view.lastMove, player: pos(view.lastMove.player) } : null,
    history: view.history.map(h => ({
      ...h,
      scores: bySide(h.scores).map(sc => ({ ...sc, side: side(sc.side) })),
      leftoverTo: h.leftoverTo === null ? null : pos(h.leftoverTo),
    })),
    winner: view.winner === null ? null : side(view.winner),
  };
}

/** Mesto sa ekrana nazad u mesto na serveru (za imena iz sobe). */
export const serverSeat = (local, mySeat, n) => (local + mySeat) % n;
