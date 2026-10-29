// Kratka poruka preko stola (potez računara, tabla, greška).

let timer = null;

export function toast(msg, tabla = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('tabla', tabla);
  t.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('show'), tabla ? 2600 : 2000);
}
