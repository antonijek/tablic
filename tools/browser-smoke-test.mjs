// Headless test: igra kroz UI (klikovi na karte i dugmad) uz proveru da nema JS grešaka
// ni neučitanih slika. 1 na 1 igra ceo meč, troje i 2 na 2 po dve cele partije, pa dnevni
// izazov i rad bez interneta. Tajmeri se ubrzavaju (page.clock), pa računar ne čeka.
// Pokretanje: npm run test:ui

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 8123;
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise(r => server.stdout.once('data', r));

const RUNS = [
  { players: 2, viewport: { width: 390, height: 844 }, deals: Infinity },
  { players: 3, viewport: { width: 1280, height: 800 }, deals: 2 },
  { players: 4, viewport: { width: 390, height: 844 }, deals: 2 },
];

const errors = [];
const browser = await chromium.launch();

async function openPage(tag, viewport, ctx = browser) {
  const page = await ctx.newPage({ viewport });
  page.on('pageerror', e => errors.push(`${tag} ${e}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} ${m.text()}`); });
  page.on('requestfailed', r => errors.push(`${tag} nije učitano: ${r.url()}`));
  // broji proslave table (natpis TABLA! se doda pa ukloni)
  await page.addInitScript(() => {
    window.__bursts = 0;
    new MutationObserver(list => {
      for (const m of list) for (const n of m.addedNodes) if (n.id === 'tablaBurst') window.__bursts++;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.clock.install();
  return page;
}

/** Igraj (uz „Predlog“) dok se ne otvori prozor kraja partije. */
async function playUntilDealEnd(page) {
  let moves = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) {
    if (await page.locator('#dealEnd[open]').count()) return moves;
    const myTurn = await page.evaluate(() => document.querySelector('#seatMe').classList.contains('turn'));
    if (!myTurn) { await page.clock.runFor(800); continue; }
    await page.locator('#myHand .card').first().click();
    await page.click('#suggestBtn');
    if (await page.isEnabled('#captureBtn')) await page.click('#captureBtn');
    else await page.click('#throwBtn');
    moves++;
  }
  throw new Error('partija se nije završila za 2 minuta');
}

async function checkPage(page, tag) {
  const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).length);
  if (broken) errors.push(`${tag} ${broken} slika se nije učitalo`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) errors.push(`${tag} horizontalni scroll`);
}

try {
  // Rad bez interneta: service worker sačuva sve fajlove, pa se igra učita i bez mreže.
  const ctx = await browser.newContext();
  const offline = await ctx.newPage();
  offline.on('pageerror', e => errors.push(`[offline] ${e}`));
  await offline.goto(`${BASE}/`);
  const cached = await offline.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return (await (await caches.open((await caches.keys())[0])).keys()).length;
  });
  await ctx.setOffline(true);
  await offline.reload();
  await offline.waitForSelector('#myHand .card img', { timeout: 10000 });
  console.log(`[offline] u kešu ${cached} fajlova, igra se učitala bez mreže`);
  await ctx.close();

  for (const { players, viewport, deals } of RUNS) {
    const tag = `[${players} igrača, ${viewport.width}px]`;
    const page = await openPage(tag, viewport);
    await page.goto(`${BASE}/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('#menuBtn');
    await page.check(`#players${players}`);
    await page.click('#newGameBtn');

    let moves = 0;
    for (let d = 1; ; d++) {
      moves += await playUntilDealEnd(page);
      const title = await page.textContent('#dealEndTitle');
      if (/Pobeda|Pobedi/.test(title) || d >= deals) {
        console.log(`${tag} ${title} — ${d} partija, ${moves} mojih poteza`);
        break;
      }
      await page.click('#nextDealBtn');
    }
    const bursts = await page.evaluate(() => window.__bursts);
    if (deals === Infinity && bursts === 0) errors.push(`${tag} ceo meč bez ijedne proslave table`);
    await checkPage(page, tag);
    await page.screenshot({ path: `tools/screenshot-${players}p-${viewport.width}.png` });
    await page.close();
  }

  // Dnevni izazov: isto deljenje u dva odvojena pregledača, kraj, deljenje rezultata, jedan pokušaj dnevno.
  const tag = '[izazov]';
  const viewport = { width: 390, height: 844 };
  const other = await browser.newContext();
  const deal = p => p.evaluate(() => {
    const s = window.__tablic.game.peek();
    return JSON.stringify([s.players.map(x => x.hand.map(c => c.id)), s.table.map(c => c.id), s.deck.map(c => c.id)]);
  });
  const a = await openPage(tag, viewport);
  await a.goto(`${BASE}/?izazov`);
  const b = await openPage(tag, viewport, other);
  await b.goto(`${BASE}/?izazov`);
  if (await deal(a) !== await deal(b)) errors.push(`${tag} dva igrača nisu dobila isto deljenje`);
  await other.close();

  const moves = await playUntilDealEnd(a);
  const title = await a.textContent('#dealEndTitle');
  if (!/Dnevni izazov/.test(title)) errors.push(`${tag} naslov kraja: ${title}`);
  if (!(await a.isVisible('#shareBtn'))) errors.push(`${tag} nema dugmeta „Podeli rezultat“`);
  await a.screenshot({ path: 'tools/screenshot-izazov-390.png' });
  await a.click('#nextDealBtn');
  if (await a.evaluate(() => window.__tablic.dailyKey) !== null) errors.push(`${tag} nije se vratio na običnu igru`);
  await a.click('#menuBtn');
  await a.click('#dailyBtn');
  if (!(await a.locator('#dailyDone[open]').count())) errors.push(`${tag} drugi pokušaj istog dana nije odbijen`);
  console.log(`${tag} ${title} — ${moves} mojih poteza`);
  await checkPage(a, tag);
  await a.close();
} finally {
  await browser.close();
  server.kill();
}

if (errors.length) {
  console.error('GREŠKE:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — UI smoke test prošao');
