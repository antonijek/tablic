// Dnevni izazov: svi igrači istog dana dobijaju isto mešanje (isti seed) i igraju jednu
// partiju 1 na 1. Karte se dele sa vrha špila bez obzira na poteze, pa svi dobijaju iste
// ruke; računaru je i nasumičnost vezana za dan i broj odigranih karata, pa na iste
// poteze odgovara isto. Jedan pokušaj dnevno, rezultat može da se podeli.

const RESULTS_KEY = 'tablic.daily.results';
const STATE_PREFIX = 'tablic.daily.state.';
export const DAILY_URL = 'https://tablic.igrajmo.online/?izazov';

/** Današnji datum u Srbiji (YYYY-MM-DD) — izazov se menja u ponoć po našem vremenu. */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(now);
}

export function seedFor(key) {
  return Number(key.replaceAll('-', ''));
}

/** Seed za potez računara: isti dan + isti broj odigranih karata = isti izbor. */
export function aiSeed(key, playedCount) {
  return seedFor(key) * 100 + playedCount;
}

export function dayLabel(key) {
  const [y, m, d] = key.split('-');
  return `${Number(d)}.${Number(m)}.${y}.`;
}

function shiftDay(key, days) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Koliko dana zaredom je odigran izazov (zaključno sa danas, ili sa juče ako danas još nije). */
export function streak(results, key) {
  let day = results[key] ? key : shiftDay(key, -1);
  let n = 0;
  while (results[day]) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export function verdict(r) {
  if (r.me > r.opp) return 'pobeda';
  return r.me < r.opp ? 'poraz' : 'nerešeno';
}

export function shareText(key, r, days) {
  const lines = [
    `🃊 Tablić — dnevni izazov ${dayLabel(key)}`,
    `Vi ${r.me} : ${r.opp} računar (${verdict(r)}) · table: ${r.tablas}`,
  ];
  if (days > 1) lines.push(`Niz: ${days} dana zaredom`);
  lines.push(DAILY_URL);
  return lines.join('\n');
}

// ---------- čuvanje (greške se prijavljuju preko onError) ----------

export function loadResults(onError) {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}');
  } catch (e) {
    onError(`Rezultati izazova ne mogu da se pročitaju (${e.message}).`);
    return {};
  }
}

export function saveResult(key, result, onError) {
  const all = loadResults(onError);
  all[key] = result;
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
    localStorage.removeItem(STATE_PREFIX + key);
  } catch (e) {
    onError(`Rezultat izazova nije sačuvan (${e.message}).`);
  }
  return all;
}

/** Ključ pod kojim se čuva nezavršena partija izazova (stari dani se brišu). */
export function stateSlot(key, onError) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(STATE_PREFIX) && k !== STATE_PREFIX + key) localStorage.removeItem(k);
    }
  } catch (e) {
    onError(`Stari izazovi ne mogu da se obrišu (${e.message}).`);
  }
  return STATE_PREFIX + key;
}

/** Podeli rezultat: meni telefona za deljenje, a gde ga nema — kopiranje u clipboard. */
export async function share(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
