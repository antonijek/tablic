// Service worker: igra radi i bez interneta. Stranice i kod se uvek prvo traže sa mreže
// (da se nova verzija vidi odmah), a keš se koristi samo kad mreže nema. Karte se ne
// menjaju, pa se one uzimaju iz keša. Posle promene karata ili spiska fajlova podići CACHE.

const CACHE = 'tablic-v1';
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const ENGINE = ['index', 'types', 'cards', 'capture', 'scoring', 'sides', 'game', 'ai', 'search'];
const UI = ['cards', 'seats', 'deal-end', 'storage', 'toast'];

const CORE = [
  './', './tablic.html', './pravila.html', './tablic.css', './app.js', './manifest.json', './icons/icon.svg',
  ...ENGINE.map(f => `./engine/dist/${f}.js`),
  ...UI.map(f => `./ui/${f}.js`),
  ...SUITS.flatMap(s => RANKS.map(r => `./icons/cards/${r}${s}.webp`)),
  './icons/cards/back-red.webp',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(req.url.includes('/icons/cards/') ? cacheFirst(req) : networkFirst(req));
});
