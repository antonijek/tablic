// UI za Tablić — tanak sloj nad engine-om (engine/dist). Nema poslovne logike:
// validaciju, bodovanje i AI radi engine.

import { TablicGame, TablicError, chooseMove, makeRng } from './engine/dist/index.js';
import { cardEl, cardName } from './ui/cards.js';
import { ME, playerName, renderMe, renderOpponents, renderScoreBar } from './ui/seats.js';
import { fillDealEnd } from './ui/deal-end.js';
import { updateControls } from './ui/controls.js';
import { loadGame, saveGame, NORMAL_SLOT } from './ui/storage.js';
import { celebrateTabla, setSound, soundOn } from './ui/celebrate.js';
import { toast } from './ui/toast.js';
import * as daily from './ui/daily.js';
import { initOnline } from './online.js';
import { fillOnlineEnd } from './ui/online-end.js';

const AI_DELAY = 600;     // pauza pre nego što računar odigra
const PREVIEW_MS = 900;   // koliko se vidi potez računara pre nego što karte odu sa stola

const $ = id => document.getElementById(id);

let game;
let slot = NORMAL_SLOT;           // gde se čuva partija (obična ili dnevni izazov)
let dailyKey = null;              // datum izazova, ili null u običnoj igri
let selectedHand = null;          // id karte iz ruke
const selectedTable = new Set();  // id-jevi karata sa stola
let aiTimer = null;
let preview = null;               // potez koji se upravo prikazuje: { player, card, capture }
let online = null;                // online igra (online.js); dok je online.active, sto crta stanje sa servera

const report = msg => toast(msg);
const save = () => saveGame(game, report, slot);

function start(newGame, newSlot, key) {
  clearTimeout(aiTimer);
  preview = null;
  clearSelection();
  game = newGame;
  slot = newSlot;
  dailyKey = key;
  save();
  render();
  if (game.peek().phase === 'PLAYING') scheduleAi();
  else showDealEnd();
}

const onlineBusy = () => {
  if (online?.active) toast('Prvo napustite online igru (☰ → Napusti online igru).');
  return online?.active;
};
const startNormal = players => { if (!onlineBusy()) start(new TablicGame({ players }), NORMAL_SLOT, null); };
const resumeNormal = () => start(loadGame(report) ?? new TablicGame(), NORMAL_SLOT, null);

function startDaily() {
  if (onlineBusy()) return;
  const key = daily.todayKey();
  const results = daily.loadResults(report);
  if (results[key]) { showDailyDone(key, results); return; }
  const dailySlot = daily.stateSlot(key, report);
  const g = loadGame(report, dailySlot) ?? new TablicGame({ players: 2, seed: daily.seedFor(key), firstDealer: 1 });
  start(g, dailySlot, key);
}

// ---------- render ----------

function render() {
  const v = online?.active ? online.view() : game.getPlayerView(ME);
  const myTurn = v.phase === 'PLAYING' && v.turn === ME && !preview && !online?.waiting;

  renderScoreBar($('scoreBar'), v);
  renderOpponents($('opponents'), v, preview);
  const where = online?.active ? `Soba ${online.room().code} · partija ${v.dealNo}`
    : dailyKey ? `Dnevni izazov ${daily.dayLabel(dailyKey)}` : `Partija ${v.dealNo}`;
  $('roundInfo').textContent = `${where} · deljenje ${v.round}/${v.roundsPerDeal} · u špilu ${v.deckCount}`;

  const taking = new Set(preview?.capture ?? []);
  const table = v.table.map(c => cardEl(c, {
    selected: selectedTable.has(c.id),
    taking: taking.has(c.id),
    onClick: myTurn ? () => toggleTable(c.id) : undefined,
  }));
  if (preview) table.push(cardEl(preview.card, { incoming: true }));
  $('table').replaceChildren(...table);

  renderMe($('seatMe'), v, myTurn);
  $('seatMe').classList.toggle('turn', myTurn);
  $('myHand').replaceChildren(...v.hand.map(c => cardEl(c, {
    selected: selectedHand === c.id,
    onClick: myTurn ? () => selectHand(c.id) : undefined,
  })));

  updateControls(v, myTurn, selectedHand, selectedTable);
  $('suggestBtn').hidden = Boolean(online?.active); // u igri sa ljudima nema pomoći računara
}

// ---------- interakcija ----------

function clearSelection() {
  selectedHand = null;
  selectedTable.clear();
}

function selectHand(id) {
  selectedHand = selectedHand === id ? null : id;
  selectedTable.clear();
  render();
}

function toggleTable(id) {
  if (selectedTable.has(id)) selectedTable.delete(id);
  else selectedTable.add(id);
  render();
}

function suggest() {
  // Predlog = potez koji bi odigrao najjači AI (Monte Carlo pretraga)
  const best = chooseMove(game.getPlayerView(ME), 'hard');
  selectedHand = best.cardId;
  selectedTable.clear();
  best.capture.forEach(id => selectedTable.add(id));
  render();
}

function doPlay(capture) {
  if (!selectedHand) return;
  if (online?.active) {
    online.play(selectedHand, capture); // server proverava potez i šalje novo stanje
    clearSelection();
    render();
    return;
  }
  try {
    announce(game.play(ME, selectedHand, capture));
  } catch (e) {
    if (e instanceof TablicError) { toast(e.message); return; }
    throw e;
  }
  clearSelection();
  afterMove();
}

function afterMove() {
  save();
  render();
  if (game.peek().phase !== 'PLAYING') { setTimeout(showDealEnd, 700); return; }
  scheduleAi();
}

/** Koliko je karata odigrano u partiji (za seed računara u izazovu). */
function playedCount(s) {
  return 52 - 4 - s.deck.length - s.players.reduce((n, p) => n + p.hand.length, 0);
}

/** Računar bira potez, pokaže ga (karta i ono što nosi), pa ga odigra. */
function scheduleAi() {
  clearTimeout(aiTimer);
  const s = game.peek();
  if (online?.active || s.phase !== 'PLAYING' || s.turn === ME) return;
  const player = s.turn;
  aiTimer = setTimeout(() => {
    const rng = dailyKey ? makeRng(daily.aiSeed(dailyKey, playedCount(game.peek()))) : Math.random;
    const move = chooseMove(game.getPlayerView(player), 'hard', rng);
    const card = game.peek().players[player].hand.find(c => c.id === move.cardId);
    preview = { player, card, capture: move.capture };
    render();
    aiTimer = setTimeout(() => {
      preview = null;
      announce(game.play(player, move.cardId, move.capture));
      afterMove();
    }, PREVIEW_MS);
  }, AI_DELAY);
}

function announce(rec) {
  if (rec.captured.length === 0) return;
  const count = online?.active ? online.view().players.length : game.playerCount;
  const who = rec.player === ME ? 'Vi' : playerName(rec.player, count);
  const what = rec.captured.map(cardName).join(' ');
  toast(`${who}: ${cardName(rec.card)} nosi ${what}${rec.tabla ? ' — TABLA!' : ''}`, rec.tabla);
  if (rec.tabla) celebrateTabla(who);
}

// ---------- kraj partije / meča / izazova ----------

function showDealEnd() {
  const state = game.getState();
  if (!fillDealEnd(state, game.sideOf(ME))) return;
  $('shareBtn').hidden = !dailyKey;
  if (dailyKey) {
    const [me, opp] = state.history.at(-1).scores;
    const result = { me: me.total, opp: opp.total, tablas: me.tablas };
    const results = daily.saveResult(dailyKey, result, report);
    const days = daily.streak(results, dailyKey);
    $('dealEndTitle').textContent = `Dnevni izazov ${daily.dayLabel(dailyKey)}: ${daily.verdict(result)}`;
    $('dealEndNote').textContent += days > 1 ? ` Niz: ${days} dana zaredom.` : ' Novi izazov sutra.';
    $('shareBtn').onclick = () => shareResult(daily.shareText(dailyKey, result, days));
    $('nextDealBtn').textContent = 'Nazad na običnu igru';
  }
  $('dealEnd').showModal();
}

function showDailyDone(key, results) {
  const r = results[key];
  const days = daily.streak(results, key);
  $('dailyDoneText').textContent = `Vi ${r.me} : ${r.opp} računar (${daily.verdict(r)}), table: ${r.tablas}.`
    + `${days > 1 ? ` Niz: ${days} dana zaredom.` : ''} Novi izazov stiže u ponoć.`;
  $('dailyShareBtn').onclick = () => shareResult(daily.shareText(key, r, days));
  $('dailyDone').showModal();
}

function shareResult(text) {
  daily.share(text)
    .then(how => { if (how === 'copied') toast('Rezultat je kopiran — nalepite ga prijatelju.'); })
    .catch(e => toast(`Deljenje nije uspelo (${e.message}).`));
}

// Escape ne sme da zatvori prozor bez prelaska na sledeću partiju (igra bi stala).
$('dealEnd').addEventListener('cancel', e => e.preventDefault());

$('nextDealBtn').addEventListener('click', () => {
  if (online?.active) {
    if (online.room().status === 'FINISHED') { $('dealEnd').close(); online.leaveFinished(); return; }
    online.ready(); // sledeća partija kreće kad svi kliknu „Dalje“ (ili posle roka na serveru)
    $('nextDealBtn').disabled = true;
    $('nextDealBtn').textContent = 'Čeka se ostale…';
    return;
  }
  $('dealEnd').close();
  if (dailyKey) { resumeNormal(); return; }
  if (game.peek().phase === 'MATCH_END') { startNormal(game.playerCount); return; }
  game.nextDeal();
  start(game, slot, null);
});

// ---------- dugmad / meni ----------

$('captureBtn').addEventListener('click', () => doPlay([...selectedTable]));
$('throwBtn').addEventListener('click', () => doPlay([]));
$('suggestBtn').addEventListener('click', suggest);
$('menuBtn').addEventListener('click', () => {
  document.querySelector(`input[name="players"][value="${game.playerCount}"]`).checked = true;
  $('leaveOnlineBtn').hidden = !online?.active;
  $('menu').showModal();
});
$('closeMenuBtn').addEventListener('click', () => $('menu').close());
$('newGameBtn').addEventListener('click', () => {
  $('menu').close();
  startNormal(Number(document.querySelector('input[name="players"]:checked').value));
});
$('dailyBtn').addEventListener('click', () => { $('menu').close(); startDaily(); });
function showSound() { $('soundBtn').textContent = soundOn() ? '🔊' : '🔇'; }
$('soundBtn').addEventListener('click', () => { setSound(!soundOn(), report); showSound(); });
showSound();
$('closeDailyBtn').addEventListener('click', () => $('dailyDone').close());
$('leaveOnlineBtn').addEventListener('click', () => { $('menu').close(); online.leave(); });
$('onlineBtn').addEventListener('click', () => online.open());

// ---------- online ----------

online = initOnline({
  render,
  toast,
  announce,
  setPreview: p => { preview = p; render(); },
  enter: () => { clearTimeout(aiTimer); preview = null; clearSelection(); },
  exit: () => { if ($('dealEnd').open) $('dealEnd').close(); resumeNormal(); },
  dealEnd: (view, room) => { fillOnlineEnd(view, room); $('dealEnd').showModal(); },
  closeDealEnd: () => { if ($('dealEnd').open) $('dealEnd').close(); },
});

// ---------- start ----------

resumeNormal();
if (new URLSearchParams(location.search).has('izazov')) startDaily();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(e => console.error('Rad bez interneta nije uključen:', e));
}

// za headless testove
window.__tablic = { get game() { return game; }, get dailyKey() { return dailyKey; }, get online() { return online; }, ME };
