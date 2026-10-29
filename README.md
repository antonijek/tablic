# Tablić

Web aplikacija za Tablić protiv računara: 1 na 1, u troje (svako za sebe) ili 2 na 2
(partner je računar). Isti principi kao `D:\preferans`: čist TypeScript engine, AI odvojen
od engine-a i tanak Vanilla JS UI. Uživo: https://tablic.igrajmo.online/

## Status
- ✅ Engine po pravilima iz 9 izvora ([RULES.md](RULES.md), [docs/PRAVILA_IZVORI.md](docs/PRAVILA_IZVORI.md)):
  2, 3 i 4 igrača (parovi 0+2 / 1+3), deljenje 6+4 na sto (u troje poslednje po 4), smer suprotan
  kazaljci, nasumičan prvi delilac, nošenje (zbirovi, više grupa, kec 1/11 i na stolu), table
  (ne poslednjom kartom, ne sa 100+), bodovanje po strani, meč do 101. Testovi: `npm test`
- ✅ AI: Monte Carlo pretraga (radi i u troje i u paru); `hard` pobeđuje `medium` u 75% mečeva
  (`npm run sim -- 40 hard medium` u `engine/`)
- ✅ UI: prave karte (CC0 set kao u Preferansu, + 2–6 iz istog seta, WebP), mesta za 2–4 igrača,
  potez računara se vidi pre nego što karte odu, nošene karte skrivene do kraja partije (po
  pravilima), dugme „Predlog“, čuvanje partije u localStorage
- ✅ Pravila (`pravila.html`, sa čestim pitanjima), SEO (canonical, Open Graph, JSON-LD,
  robots.txt, sitemap.xml), PWA (manifest, ikonice, rad bez interneta preko `sw.js`)
- ✅ Online sa ljudima (`server/`, po uzoru na Lorin server): prijava istim nalogom kao Preferans i Lora
  (server prosleđuje /api/login|register|me Preferansu, isti JWT_SECRET), lobi (brza igra, nova soba 1 na 1 /
  troje / 2 na 2, ulaz kodom, link za poziv `?soba=KOD`, poziv igraču koji je online), računar popunjava prazna
  mesta i igra za igrača bez veze posle 20 s, rejting (ELO po stranama, samo sa ≥ 2 čoveka), chat, sobe prežive
  restart (active_rooms). Deo vezan za pravila je u `server/src/game.ts` (za Remi se menja samo on).
  Testovi: `cd server && npm test`, `npm run test:online` (dva igrača kroz pregledač). pm2 `tablic-server`, port 3004
- ✅ Dnevni izazov (ui/daily.js: isto mešanje za sve tog dana, AI seed po danu i broju odigranih karata, jedan pokušaj dnevno, niz dana, „Podeli rezultat“; link `?izazov`)
- ✅ Proslava table (ui/celebrate.js: sto se strese, natpis TABLA!, zvuk udarca iz Web Audio; zvuk se isključuje u meniju)

## Pokretanje
```bash
cd engine && npm install && npm run build && cd ..
npm install
node tools/serve.js         # http://localhost:8001/
npm run test:ui             # igra kroz UI u headless Chromium-u (1 na 1 ceo meč, troje i 2 na 2)
node tools/cards-webp.mjs   # posle promene SVG karata
node tools/make-images.mjs  # posle promene ikonice ili izgleda stola (PNG ikonice, og-image.jpg)
npm run deploy              # objava (prvi put: sh tools/deploy.sh --setup za nginx + sertifikat)
```
Na ovom računaru je Chromium za Playwright u `D:\DevCache\ms-playwright` — pre testova
`PLAYWRIGHT_BROWSERS_PATH=D:\DevCache\ms-playwright`.

Posle promene spiska fajlova ili karata podići `CACHE` u `sw.js`.

## Struktura
```
engine/src/
  types.ts     tipovi
  cards.ts     špil, RNG, vrednosti i bodovi karata
  capture.ts   koje kombinacije karta može da odnese
  sides.ts     ko sa kim igra i koliko karata se deli (zavisi od broja igrača)
  scoring.ts   bodovanje partije
  game.ts      TablicGame: potezi, deljenje, kraj partije i meča
  ai.ts        AI (radi samo nad PlayerView, ne vara)
  search.ts    Monte Carlo pretraga (najjači AI)
tablic.html / app.js / tablic.css   UI (tok igre)
ui/          prikaz karata, mesta i rezultat, kraj partije, čuvanje, poruke
icons/       karte (SVG izvor + WebP), ikonice, og-image
pravila.html                        pravila (SEO)
RULES.md                            tačna pravila koja engine implementira
```
