// Headless test: igra kroz UI (klikovi na karte i dugmad) uz proveru da nema JS grešaka
// ni neučitanih slika. 1 na 1 igra ceo meč, troje i 2 na 2 po dve cele partije.
// Tajmeri se ubrzavaju (page.clock), pa računar ne čeka stvarno vreme.
// Pokretanje: npm run test:ui

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 8123;
const server = spawn(process.execPath, ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise(r => server.stdout.once('data', r));

const RUNS = [
  { players: 2, viewport: { width: 390, height: 844 }, deals: Infinity },
  { players: 3, viewport: { width: 1280, height: 800 }, deals: 2 },
  { players: 4, viewport: { width: 390, height: 844 }, deals: 2 },
];

const errors = [];
const browser = await chromium.launch();
try {
  // Rad bez interneta: service worker sačuva sve fajlove, pa se igra učita i bez mreže.
  const ctx = await browser.newContext();
  const offline = await ctx.newPage();
  offline.on('pageerror', e => errors.push(`[offline] ${e}`));
  await offline.goto(`http://localhost:${PORT}/`);
  const cached = await offline.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return (await (await caches.open((await caches.keys())[0])).keys()).length;
  });
  await ctx.setOffline(true);
  await offline.reload();
  await offline.waitForSelector('#myHand .card img', { timeout: 10000 });
  const brokenOffline = await offline.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).length);
  if (brokenOffline) errors.push(`[offline] ${brokenOffline} slika se nije učitalo`);
  console.log(`[offline] u kešu ${cached} fajlova, igra se učitala bez mreže`);
  await ctx.close();

  for (const { players, viewport, deals } of RUNS) {
    const tag = `[${players} igrača, ${viewport.width}px]`;
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(`${tag} ${e}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} ${m.text()}`); });
    page.on('requestfailed', r => errors.push(`${tag} nije učitano: ${r.url()}`));
    await page.clock.install();
    await page.goto(`http://localhost:${PORT}/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('#menuBtn');
    await page.check(`#players${players}`);
    await page.click('#newGameBtn');

    let moves = 0;
    let dealsDone = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 300_000) {
      if (await page.locator('#dealEnd[open]').count()) {
        dealsDone++;
        const title = await page.textContent('#dealEndTitle');
        if (/Pobeda|Pobedi/.test(title) || dealsDone >= deals) {
          console.log(`${tag} ${title} — ${dealsDone} partija, ${moves} mojih poteza`);
          break;
        }
        await page.click('#nextDealBtn');
        continue;
      }
      const myTurn = await page.evaluate(() => {
        const s = window.__tablic.game.peek();
        return s.phase === 'PLAYING' && s.turn === 0 && document.querySelector('#seatMe').classList.contains('turn');
      });
      if (!myTurn) { await page.clock.runFor(800); continue; }

      await page.locator('#myHand .card').first().click();
      await page.click('#suggestBtn');
      if (await page.isEnabled('#captureBtn')) await page.click('#captureBtn');
      else await page.click('#throwBtn');
      moves++;
    }
    if (moves === 0) throw new Error(`${tag} nijedan potez nije odigran`);
    if (dealsDone === 0) throw new Error(`${tag} nijedna partija nije završena`);

    const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).length);
    if (broken) errors.push(`${tag} ${broken} slika se nije učitalo`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) errors.push(`${tag} horizontalni scroll`);
    await page.screenshot({ path: `tools/screenshot-${players}p-${viewport.width}.png` });
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (errors.length) {
  console.error('GREŠKE:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — UI smoke test prošao');
