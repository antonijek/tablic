# Tablić

Web aplikacija za Tablić (1 na 1 protiv računara). Isti principi kao `D:\preferans`:
čist TypeScript engine, AI odvojen od engine-a i tanak Vanilla JS UI.

## Status
- ✅ Engine: deljenje, nošenje (zbirovi, više grupa, kec 1/11), table, bodovanje, meč do 101. Testovi: `npm test`
- ✅ AI: 3 nivoa. Broji karte i procenjuje šta protivnik može da odnese. Medium pobeđuje easy u 100% mečeva, a hard ≈ medium (`npm run sim` u `engine/`)
- ✅ UI protiv računara, mobilni i desktop, čuvanje partije u localStorage, dugme „Predlog“
- ✅ Stranica sa pravilima (`pravila.html`, za SEO)
- ⏳ Multiplayer: prebaciti server iz preferansa (auth, sobe, socket.io) u zajedničko jezgro
- ⏳ SVG karte 2–6 (preferans set ima samo 7–A), PWA manifest, zvuk

## Pokretanje
```bash
cd engine && npm install && npm run build && cd ..
npm install
node tools/serve.js         # http://localhost:8001/
npm run test:ui             # odigra ceo meč kroz UI u headless Chromium-u
```

## Struktura
```
engine/src/
  types.ts     tipovi
  cards.ts     špil, RNG, vrednosti i bodovi karata
  capture.ts   koje kombinacije karta može da odnese
  scoring.ts   bodovanje partije
  game.ts      TablicGame: potezi, deljenje, kraj partije i meča
  ai.ts        AI (radi samo nad PlayerView, ne vara)
tablic.html / app.js / tablic.css   UI
pravila.html                        pravila (SEO)
RULES.md                            tačna pravila koja engine implementira
```
