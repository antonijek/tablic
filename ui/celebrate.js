// Proslava table: karta „lupi“ o sto (u kafani se kartom jako lupi po stolu kad se nosi
// tabla), kratak natpis TABLA! i zvuk udarca. Zvuk se pravi u pregledaču (Web Audio), bez fajla.

const SOUND_KEY = 'tablic.sound';
let audio = null;

export function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch (e) {
    console.warn('Podešavanje zvuka ne može da se pročita, zvuk ostaje uključen:', e);
    return true;
  }
}

export function setSound(on, onError) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch (e) {
    onError(`Podešavanje zvuka nije sačuvano (${e.message}).`);
  }
}

/** Kratak šum (karta) i dubok ton koji brzo pada (sto). */
function slapSound() {
  audio ??= new AudioContext();
  const t = audio.currentTime;
  const len = Math.floor(audio.sampleRate * 0.18);
  const buf = audio.createBuffer(1, len, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  const noise = audio.createBufferSource();
  noise.buffer = buf;
  const band = audio.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 0.8;
  noise.connect(band).connect(audio.destination);

  const thump = audio.createOscillator();
  thump.frequency.setValueAtTime(140, t);
  thump.frequency.exponentialRampToValueAtTime(50, t + 0.15);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  thump.connect(gain).connect(audio.destination);

  noise.start(t);
  thump.start(t);
  thump.stop(t + 0.2);
}

export function celebrateTabla(who) {
  const area = document.querySelector('.table-area');
  area.classList.remove('slam');
  void area.offsetWidth; // ponovo pokreni animaciju i kad su dve table zaredom
  area.classList.add('slam');
  const burst = document.createElement('div');
  burst.className = 'tabla-burst';
  burst.id = 'tablaBurst';
  burst.textContent = 'TABLA!';
  const small = document.createElement('small');
  small.textContent = who;
  burst.append(small);
  document.getElementById('tablaBurst')?.remove();
  area.append(burst);
  setTimeout(() => burst.remove(), 1500);
  if (soundOn()) slapSound();
}
