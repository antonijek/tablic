// UI za Tablić — tanak sloj nad engine-om (engine/dist). Nema poslovne logike:
// validaciju, bodovanje i AI radi engine.

import {
  TablicGame, TablicError, chooseMove, isValidCapture, captureOptions, cardPoints,
} from './engine/dist/index.js';

const ME = 0;
const OPP = 1;
const AI_DELAY = 750;
const SAVE_KEY = 'tablic.save.v1';

const $ = id => document.getElementById(id);

let game;
// jedan nivo AI-ja — najjači (Monte Carlo)
const level = 'hard';
let selectedHand = null;          // id karte iz ruke
const selectedTable = new Set();  // id-jevi karata sa stola
let aiTimer = null;
let toastTimer = null;

// ---------- čuvanje (samo pogodnost — igra radi i bez localStorage) ----------

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state: game.getState() })); } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    game = TablicGame.fromState(data.state);
    return true;
  } catch {
    return false;
  }
}

function newGame() {
  clearTimeout(aiTimer);
  game = new TablicGame();
  clearSelection();
  save();
  render();
  scheduleAi();
}

// ---------- prikaz karata ----------

const RANK_LABEL = { J: 'J', Q: 'Q', K: 'K', A: 'A' };

function cardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.className = 'card';
  if (card.suit === '♥' || card.suit === '♦') el.classList.add('red');
  el.dataset.id = card.id;
  const label = RANK_LABEL[card.rank] ?? card.rank;
  el.innerHTML = `<span class="corner">${label}<small>${card.suit}</small></span><span class="pip">${card.suit}</span>`;
  const pts = cardPoints(card);
  if (pts > 0) {
    const b = document.createElement('span');
    b.className = 'pts';
    b.textContent = pts;
    el.appendChild(b);
  }
  el.setAttribute('aria-label', `${label} ${card.suit}`);
  if (opts.onClick) {
    el.classList.add('clickable');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.addEventListener('click', opts.onClick);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onClick(); } });
  }
  if (opts.selected) el.classList.add('selected');
  return el;
}

function backEl() {
  const el = document.createElement('div');
  el.className = 'card back';
  return el;
}

function cardName(c) {
  return `${RANK_LABEL[c.rank] ?? c.rank}${c.suit}`;
}

// ---------- render ----------

function render() {
  const v = game.getPlayerView(ME);
  const myTurn = v.phase === 'PLAYING' && v.turn === ME;

  $('scoreMe').textContent = v.players[ME].score;
  $('scoreOpp').textContent = v.players[OPP].score;
  $('deckCount').textContent = `U špilu: ${v.deckCount}`;
  $('roundInfo').textContent = `Partija ${v.dealNo} · deljenje ${v.round}/4`;

  const stats = p => `Nošeno <b>${p.captured.length}</b> karata · <b>${p.capturedPoints}</b> poena · table <b>${p.tablas}</b>`;
  $('meStats').innerHTML = stats(v.players[ME]);
  $('oppStats').innerHTML = stats(v.players[OPP]);

  const opp = $('oppHand');
  opp.replaceChildren(...Array.from({ length: v.players[OPP].handCount }, backEl));

  const table = $('table');
  table.replaceChildren(...v.table.map(c => cardEl(c, {
    selected: selectedTable.has(c.id),
    onClick: myTurn ? () => toggleTable(c.id) : undefined,
  })));

  const hand = $('myHand');
  hand.replaceChildren(...v.hand.map(c => cardEl(c, {
    selected: selectedHand === c.id,
    onClick: myTurn ? () => selectHand(c.id) : undefined,
  })));

  updateControls(v, myTurn);
}

function updateControls(v, myTurn) {
  const hint = $('hint');
  const captureBtn = $('captureBtn');
  const throwBtn = $('throwBtn');
  const suggestBtn = $('suggestBtn');

  captureBtn.disabled = throwBtn.disabled = suggestBtn.disabled = !myTurn;
  if (!myTurn) {
    hint.textContent = v.phase === 'PLAYING' ? 'Računar razmišlja…' : '';
    captureBtn.textContent = 'Nosi';
    return;
  }

  const card = v.hand.find(c => c.id === selectedHand);
  const picked = v.table.filter(c => selectedTable.has(c.id));
  const valid = card && picked.length > 0 && isValidCapture(card, picked);

  captureBtn.disabled = !valid;
  captureBtn.textContent = picked.length > 0 ? `Nosi (${picked.length})` : 'Nosi';
  throwBtn.disabled = !card;

  if (!card) {
    hint.textContent = 'Izaberite kartu iz ruke.';
  } else if (picked.length === 0) {
    const n = captureOptions(card, v.table).length;
    hint.textContent = n > 0
      ? `Izaberite karte sa stola koje nosite sa ${cardName(card)} (ili „Predlog“).`
      : `${cardName(card)} ne može ništa da odnese — bacite je na sto.`;
  } else {
    hint.textContent = valid ? 'Može! Pritisnite „Nosi“.' : 'Ova kombinacija ne daje tačan zbir.';
  }
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
  const v = game.getPlayerView(ME);
  // Predlog = potez koji bi odigrao AI (Monte Carlo pretraga)
  const best = chooseMove(v, 'hard');
  selectedHand = best.cardId;
  selectedTable.clear();
  best.capture.forEach(id => selectedTable.add(id));
  render();
}

function doPlay(capture) {
  if (!selectedHand) return;
  try {
    const rec = game.play(ME, selectedHand, capture);
    announce(rec);
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
  const s = game.getState();
  if (s.phase !== 'PLAYING') { setTimeout(showDealEnd, 600); return; }
  scheduleAi();
}

function scheduleAi() {
  clearTimeout(aiTimer);
  const s = game.getState();
  if (s.phase !== 'PLAYING' || s.turn !== OPP) return;
  aiTimer = setTimeout(() => {
    const move = chooseMove(game.getPlayerView(OPP), level);
    const rec = game.play(OPP, move.cardId, move.capture);
    announce(rec);
    afterMove();
    flash([rec.card.id, ...rec.captured.map(c => c.id)]);
  }, AI_DELAY);
}

function announce(rec) {
  const who = rec.player === ME ? 'Vi' : 'Računar';
  if (rec.captured.length === 0) {
    if (rec.player === OPP) toast(`Računar baca ${cardName(rec.card)}`);
    return;
  }
  const what = rec.captured.map(cardName).join(' ');
  if (rec.tabla) toast(`${who}: ${cardName(rec.card)} nosi ${what} — TABLA!`, true);
  else toast(`${who}: ${cardName(rec.card)} nosi ${what}`);
}

function flash(ids) {
  for (const id of ids) document.querySelector(`.table-cards .card[data-id="${id}"]`)?.classList.add('flash');
}

function toast(msg, tabla = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('tabla', tabla);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), tabla ? 2600 : 1800);
}

// ---------- kraj partije / meča ----------

function showDealEnd() {
  const s = game.getState();
  const last = s.history.at(-1);
  if (!last) return;
  const [me, opp] = [last.scores[ME], last.scores[OPP]];
  const row = (label, a, b, cls = '') => `<tr class="${cls}"><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;
  $('dealEndBody').innerHTML =
    row('Karte (broj)', me.cardCount, opp.cardCount) +
    row('Poeni u kartama', me.cardPoints, opp.cardPoints) +
    row('Više karata', me.mostCards, opp.mostCards) +
    row('Table', me.tablas, opp.tablas) +
    row('Partija', me.total, opp.total, 'total') +
    row('Ukupno', s.players[ME].score, s.players[OPP].score, 'total');

  const note = last.leftoverTo === null
    ? ''
    : `Ostatak sa stola (${last.leftover.map(cardName).join(' ')}) ${last.leftoverTo === ME ? 'nosite vi, jer ste poslednji nosili' : 'nosi računar, jer je poslednji nosio'}.`;
  $('dealEndNote').textContent = note;

  if (s.phase === 'MATCH_END') {
    $('dealEndTitle').textContent = s.winner === ME ? 'Pobeda! 🎉' : 'Računar je pobedio';
    $('nextDealBtn').textContent = 'Nova igra';
  } else {
    $('dealEndTitle').textContent = `Kraj partije ${last.dealNo}`;
    $('nextDealBtn').textContent = 'Sledeća partija';
  }
  $('dealEnd').showModal();
}

$('nextDealBtn').addEventListener('click', () => {
  $('dealEnd').close();
  if (game.getState().phase === 'MATCH_END') { newGame(); return; }
  game.nextDeal();
  clearSelection();
  save();
  render();
  scheduleAi();
});

// ---------- dugmad / meni ----------

$('captureBtn').addEventListener('click', () => doPlay([...selectedTable]));
$('throwBtn').addEventListener('click', () => doPlay([]));
$('suggestBtn').addEventListener('click', suggest);
$('menuBtn').addEventListener('click', () => $('menu').showModal());
$('closeMenuBtn').addEventListener('click', () => $('menu').close());
$('newGameBtn').addEventListener('click', () => { $('menu').close(); newGame(); });

// ---------- start ----------

if (load()) {
  render();
  const s = game.getState();
  if (s.phase === 'PLAYING') scheduleAi();
  else showDealEnd();
} else {
  newGame();
}

// za headless testove
window.__tablic = { get game() { return game; }, ME, OPP };
