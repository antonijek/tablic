// Headless test: otvori igru i odigraj CEO meč kroz UI (klikovi na karte i dugmad),
// uz proveru da nema JS grešaka. Pokretanje: npm run test:ui

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 8123;
const server = spawn(process.execPath, ['tools/serve.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
await new Promise(r => server.stdout.once('data', r));

const errors = [];
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://localhost:${PORT}/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#myHand .card');

    // Ubrzaj AI za test
    let moves = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 240_000) {
      if (await page.locator('#dealEnd[open]').count()) {
        const title = await page.textContent('#dealEndTitle');
        if (/Pobeda|pobedio/.test(title)) { console.log(`[${viewport.width}px] ${title} posle ${moves} poteza`); break; }
        await page.click('#nextDealBtn');
        continue;
      }
      const myTurn = await page.evaluate(() => {
        const s = window.__tablic.game.getState();
        return s.phase === 'PLAYING' && s.turn === 0;
      });
      if (!myTurn) { await page.waitForTimeout(100); continue; }

      // Izaberi kartu, uzmi predlog, pa odigraj
      await page.locator('#myHand .card').first().click();
      await page.click('#suggestBtn');
      if (await page.isEnabled('#captureBtn')) await page.click('#captureBtn');
      else await page.click('#throwBtn');
      moves++;
    }
    if (moves === 0) throw new Error('nijedan potez nije odigran');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) errors.push(`horizontalni scroll na ${viewport.width}px`);
    await page.screenshot({ path: `tools/screenshot-${viewport.width}.png` });
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
