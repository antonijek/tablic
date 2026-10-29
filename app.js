// UI za Tablić — tanak sloj nad engine-om (engine/dist). Nema poslovne logike:
// validaciju, bodovanje i AI radi engine.

import { TablicGame, TablicError, chooseMove, isValidCapture, captureOptions } from './engine/dist/index.js';
import { cardEl, cardName } from './ui/cards.js';
import { ME, playerName, renderOpponents, renderScoreBar, seatLabel } from './ui/seats.js';
import { fillDealEnd } from './ui/deal-end.js';
import { loadGame, saveGame } from './ui/storage.js';
import { toast } from './ui/toast.js';

const AI_DELAY = 600;     // pauza pre nego što računar odigra
const PREVIEW_MS = 900;   // koliko se vidi potez računara pre nego što karte odu sa stola

const $ = id => document.getElementById(id);

let game;
let selectedHand = null;          // id karte iz ruke
const selectedTable = new Set();  // id-jevi karata sa stola
let aiTimer = null;
let preview = null;               // potez računara koji se upravo prikazuje: { player, card, capture }

const save = () => saveGame(game, msg => toast(msg));
const mySide = () => game.sideOf(ME);

function newGame(players) {
  clearTimeout(aiTimer);
  preview = null;
  game = new TablicGame({ players });
  clearSelection();
  save();
  render();
  scheduleAi();
}

// ---------- render ----------

function render() {
  const v = game.getPlayerView(ME);
  const myTurn = v.phase === 'PLAYING' && v.turn === ME && !preview;

  renderScoreBar($('scoreBar'), v);
  renderOpponents($('opponents'), v, preview);
  $('roundInfo').textContent = `Partija ${v.dealNo} · deljenje ${v.round}/${v.roundsPerDeal} · u špilu ${v.deckCount}`;

  const taking = new Set(preview?.capture ?? []);
  const table = v.table.map(c => cardEl(c, {
    selected: selectedTable.has(c.id),
    taking: taking.has(c.id),
    onClick: myTurn ? () => toggleTable(c.id) : undefined,
  }));
  if (preview) table.push(cardEl(preview.card, { incoming: true }));
  $('table').replaceChildren(...table);

  $('meLabel').replaceChildren(seatLabel(v, ME));
  $('seatMe').classList.toggle('turn', myTurn);
  $('myHand').replaceChildren(...v.hand.map(c => cardEl(c, {
    selected: selectedHand === c.id,
    onClick: myTurn ? () => selectHand(c.id) : undefined,
  })));

  updateControls(v, myTurn);
}

function updateControls(v, myTurn) {
  const hint = $('hint');
  const captureBtn = $('captureBtn');
  captureBtn.disabled = $('throwBtn').disabled = $('suggestBtn').disabled = !myTurn;
  captureBtn.textContent = 'Nosi';
  if (!myTurn) {
    hint.textContent = v.phase === 'PLAYING' ? `Na potezu: ${playerName(v.turn, v.players.length)}…` : '';
    return;
  }

  const card = v.hand.find(c => c.id === selectedHand);
  const picked = v.table.filter(c => selectedTable.has(c.id));
  const valid = card && picked.length > 0 && isValidCapture(card, picked);
  captureBtn.disabled = !valid;
  if (picked.length > 0) captureBtn.textContent = `Nosi (${picked.length})`;
  $('throwBtn').disabled = !card;

  if (!card) {
    hint.textContent = 'Vi ste na potezu. Izaberite kartu iz ruke.';
  } else if (picked.length === 0) {
    hint.textContent = captureOptions(card, v.table).length > 0
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
  // Predlog = potez koji bi odigrao najjači AI (Monte Carlo pretraga)
  const best = chooseMove(game.getPlayerView(ME), 'hard');
  selectedHand = best.cardId;
  selectedTable.clear();
  best.capture.forEach(id => selectedTable.add(id));
  render();
}

function doPlay(capture) {
  if (!selectedHand) return;
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

/** Računar bira potez, pokaže ga (karta i ono što nosi), pa ga odigra. */
function scheduleAi() {
  clearTimeout(aiTimer);
  const s = game.peek();
  if (s.phase !== 'PLAYING' || s.turn === ME) return;
  const player = s.turn;
  aiTimer = setTimeout(() => {
    const move = chooseMove(game.getPlayerView(player), 'hard');
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
  const who = rec.player === ME ? 'Vi' : playerName(rec.player, game.playerCount);
  const what = rec.captured.map(cardName).join(' ');
  if (rec.tabla) toast(`${who}: ${cardName(rec.card)} nosi ${what} — TABLA!`, true);
  else toast(`${who}: ${cardName(rec.card)} nosi ${what}`);
}

// ---------- kraj partije / meča ----------

function showDealEnd() {
  if (fillDealEnd(game.getState(), mySide())) $('dealEnd').showModal();
}

// Escape ne sme da zatvori prozor bez prelaska na sledeću partiju (igra bi stala).
$('dealEnd').addEventListener('cancel', e => e.preventDefault());

$('nextDealBtn').addEventListener('click', () => {
  $('dealEnd').close();
  if (game.peek().phase === 'MATCH_END') { newGame(game.playerCount); return; }
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
$('menuBtn').addEventListener('click', () => {
  document.querySelector(`input[name="players"][value="${game.playerCount}"]`).checked = true;
  $('menu').showModal();
});
$('closeMenuBtn').addEventListener('click', () => $('menu').close());
$('newGameBtn').addEventListener('click', () => {
  const players = Number(document.querySelector('input[name="players"]:checked').value);
  $('menu').close();
  newGame(players);
});

// ---------- start ----------

game = loadGame(msg => toast(msg));
if (game) {
  render();
  if (game.peek().phase === 'PLAYING') scheduleAi();
  else showDealEnd();
} else {
  newGame(2);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(e => console.error('Rad bez interneta nije uključen:', e));
}

// za headless testove
window.__tablic = { get game() { return game; }, ME };
