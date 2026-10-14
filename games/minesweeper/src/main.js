// Minesweeper: Darstellung und Eingabe als HTML-Raster, Spiellogik in logic.js.
// mount() baut das Spiel in einem Element auf und liefert pause/resume/unmount an die Plattform-Hülle.
// Je Stufe gibt es einen eigenen offenen Lauf und eine eigene Statistik; die Zeit läuft nur, solange gespielt wird.
import * as Logic from './logic.js';
import * as I18N from './i18n.js';
import { createAudio } from './audio.js';
import '@spielesammlung/ui/theme.css';
import './style.css';

const randSeed = () => (Math.random() * 4294967296) >>> 0;
const LONG_PRESS = 380;   // ms bis eine Berührung als „Flagge setzen“ zählt
// Niederlage: die getroffene Mine sofort, die übrigen danach nacheinander (nach Entfernung), dann das Menü
const BLAST_FIRST = 450;  // ms bis zur zweiten Explosion
const BLAST_TOTAL = 2600; // ms höchstens für die ganze Kette, egal wie viele Minen
const BLAST_GAP = 220;    // ms höchstens zwischen zwei Explosionen (wenige Minen)
const BLAST_AFTER = 800;  // ms Pause nach der letzten Explosion, bevor das Menü kommt
const BANG_GAP = 45;      // ms Mindestabstand zwischen zwei Knallen, sonst wird es Klangbrei
const rnd = (a, b) => a + Math.random() * (b - a);

const ICON = {
  mine: '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/></g><circle cx="12" cy="12" r="6.5" fill="currentColor"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4l3 2M10 3h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 4l11 4.5L8 13z" fill="currentColor"/></svg>',
};

const TEMPLATE = `
  <header class="bar">
    <button class="pill wood small" data-act="exit" hidden></button>
    <h1 class="title"></h1>
    <div class="seg-row levels" role="radiogroup"></div>
    <div class="counters">
      <span class="counter mines">${ICON.mine}<b>0</b></span>
      <span class="counter time">${ICON.clock}<b>0</b></span>
    </div>
    <div class="tools">
      <button class="pill ghost small flag-mode" aria-pressed="false">${ICON.flag}</button>
      <button class="pill primary small" data-act="new"></button>
    </div>
  </header>
  <div class="flash" aria-hidden="true"></div>
  <main class="field">
    <div class="board" role="grid"></div>
    <section class="result card" hidden>
      <h2></h2>
      <p class="sub"></p>
      <div class="row">
        <button class="pill primary" data-act="again"></button>
        <button class="pill ghost" data-act="look"></button>
      </div>
    </section>
  </main>
  <footer class="help">
    <p class="stats"></p>
    <p class="hint"></p>
  </footer>`;

/** @param {HTMLElement} el @param {import('@spielesammlung/game-sdk').Platform} platform */
export function mount(el, platform) {
  const root = document.createElement('div');
  root.className = 'minesweeper';
  root.innerHTML = TEMPLATE;
  el.append(root);
  const $ = sel => root.querySelector(sel);
  const board = $('.board'), field = $('.field'), result = $('.result');
  const ac = new AbortController(), signal = ac.signal;

  // Sprache: von der Plattform, Entwickler-Hilfe ?lang=fr erzwingt eine
  const forced = new URLSearchParams(location.search).get('lang');
  const lang = I18N.LANGS.includes(forced) ? forced : I18N.pick(platform.language());
  const S = I18N.STR[lang], htmlLang = I18N.HTML_LANG[lang];
  root.lang = htmlLang;

  // Zustand (gespeichert): gewählte Stufe, offener Lauf und Statistik je Stufe
  let level = Logic.DEFAULT_LEVEL, runs = {}, stats = {};
  let game = Logic.newGame(level, randSeed());
  // Ablauf
  let ready = false, paused = false, destroyed = false, flagMode = false;
  let runningSince = 0;                  // performance.now() seit dem die Zeit läuft, 0 = steht
  let press = null;                      // laufende Berührung { i, id, x, y, timer, long }
  let cursor = null;                     // Tastatur-Cursor in Anzeige-Koordinaten { r, c }
  let blast = null;                      // laufende Explosionskette { timers, start, lastBang }
  let burst = new Set();                 // schon explodierte Minen der verlorenen Runde
  const sound = createAudio();
  let offVolume = () => {};
  // Anzeige: Raster kann hochkant gedreht sein (breite Felder auf schmalen Bildschirmen)
  let cellEls = [], dispToIndex = [], indexToDisp = [], dispCols = 0, dispRows = 0, builtFor = '';

  const fmtTime = ms => (ms / 1000).toLocaleString(htmlLang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';
  const statOf = l => stats[l] || (stats[l] = Logic.newStat());

  // --- Zeit ------------------------------------------------------------------------------

  const elapsed = () => game.elapsed + (runningSince ? performance.now() - runningSince : 0);
  function commitTime() {                // laufende Zeit in den Spielstand übernehmen
    if (!runningSince) return;
    const now = performance.now();
    game.elapsed += now - runningSince;
    runningSince = now;
  }
  function stopTime() { commitTime(); runningSince = 0; }
  function startTimeIfRunning() {
    if (!runningSince && !paused && game.started && !game.over) runningSince = performance.now();
  }
  const timer = setInterval(() => {
    if (!destroyed) $('.time b').textContent = String(Math.min(999, Math.floor(elapsed() / 1000)));
  }, 250);

  // --- Speichern -------------------------------------------------------------------------

  function save() {
    if (!ready) return;
    commitTime();
    runs[level] = game;
    platform.save.store({
      v: 1, level, stats,
      runs: Object.fromEntries(Object.entries(runs).filter(([, g]) => g && !g.over && g.started)),
    });
  }

  function load(data) {
    if (!data || data.v !== 1) return;
    if (Logic.LEVELS[data.level]) level = data.level;
    for (const l of Logic.LEVEL_IDS) {
      if (data.stats && data.stats[l]) stats[l] = Logic.restoreStat(data.stats[l]);
      const g = data.runs && Logic.restore(data.runs[l]);
      if (g && g.level === l && !g.over) runs[l] = g;
    }
  }

  // --- Aktionen --------------------------------------------------------------------------

  function act(kind, i) {
    if (!ready || paused || game.over) return;
    let events = null;
    if (kind === 'flag') events = Logic.toggleFlag(game, i);
    else events = game.open[i] ? Logic.chord(game, i) : Logic.reveal(game, i);
    if (!events) return;
    startTimeIfRunning();
    if (game.over) end();
    paint();
    save();
  }

  function end() {
    stopTime();
    game.elapsed = Math.round(game.elapsed);   // ganze Millisekunden für Statistik und Rangliste
    const newBest = Logic.recordResult(statOf(level), game);
    if (game.won) platform.scores.submit(level, game.elapsed, { seed: game.seed, moves: game.moves });
    delete runs[level];
    renderStats();
    if (game.won) showResult(newBest);
    else startBlast();
  }

  function showResult(newBest) {
    $('.result h2').textContent = game.won ? S.won : S.lost;
    $('.result .sub').textContent = game.won ? `${fmtTime(game.elapsed)}${newBest ? ' · ' + S.newBest : ''}` : '';
    result.classList.toggle('won', game.won);
    result.hidden = false;
  }

  // --- Niederlage: Kettenreaktion ------------------------------------------------------

  function startBlast() {
    const hit = game.exploded, hr = Math.floor(hit / game.w), hc = hit % game.w;
    const rest = [];
    for (let i = 0; i < game.mine.length; i++) if (game.mine[i] && i !== hit && !game.flag[i]) rest.push(i);
    const dist = i => Math.hypot(Math.floor(i / game.w) - hr, (i % game.w) - hc);
    rest.sort((a, b) => dist(a) - dist(b));
    // Zeitpunkte: erst einzelne Knalle, dann immer schneller (konkave Kurve), insgesamt höchstens BLAST_TOTAL
    const span = Math.min(BLAST_TOTAL - BLAST_FIRST, rest.length * BLAST_GAP);
    const at = k => BLAST_FIRST + span * Math.pow(k / Math.max(1, rest.length), 0.8);
    blast = { timers: [], start: performance.now(), lastBang: 0 };
    explode(hit, 1);
    rest.forEach((i, k) => {
      const power = Math.max(0.35, 0.75 - k * 0.03);
      blast.timers.push(setTimeout(() => explode(i, power), at(k)));
    });
    const last = rest.length ? at(rest.length - 1) : 300;
    blast.timers.push(setTimeout(finishBlast, last + BLAST_AFTER));
  }

  function explode(i, power) {
    burst.add(i);
    paint();
    const now = performance.now();
    if (power >= 1 || now - blast.lastBang >= BANG_GAP) {
      sound.bang(power);
      blast.lastBang = now;
    }
    shake(power);
    if (power >= 1) flash(i);
    if (navigator.vibrate) navigator.vibrate(power >= 1 ? [90, 40, 140] : 30);
  }

  // Kette beenden (oder überspringen): alle Minen zeigen, Menü öffnen
  function finishBlast() {
    if (!blast) return;
    blast.timers.forEach(clearTimeout);
    blast = null;
    paint();
    showResult(false);
  }

  function cancelBlast() {
    if (!blast) return;
    blast.timers.forEach(clearTimeout);
    blast = null;
  }

  // Ganzer Bildschirm wackelt, abklingend; bei „Bewegung reduzieren“ nur angedeutet
  function shake(power) {
    if (!root.animate) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const a = (reduce ? 2 : 18) * power, n = 9, frames = [];
    for (let k = 0; k < n; k++) {
      const f = 1 - k / n;
      frames.push({ transform: `translate(${(rnd(-a, a) * f).toFixed(1)}px, ${(rnd(-a, a) * f).toFixed(1)}px)` });
    }
    frames.push({ transform: 'none' });
    root.animate(frames, { duration: 320 + 260 * power, easing: 'ease-out' });
  }

  // Lichtblitz, der von der getroffenen Mine ausgeht
  function flash(i) {
    const fl = $('.flash'), cell = cellEls[i];
    if (!fl.animate || !cell) return;
    const r = cell.getBoundingClientRect(), base = root.getBoundingClientRect();
    fl.style.setProperty('--x', `${r.left + r.width / 2 - base.left}px`);
    fl.style.setProperty('--y', `${r.top + r.height / 2 - base.top}px`);
    fl.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 650, easing: 'ease-out' });
  }

  function newGame() {
    cancelBlast();
    burst = new Set();
    stopTime();
    game = runs[level] = Logic.newGame(level, randSeed());
    result.hidden = true;
    cursor = null;
    layoutBoard();
    paint();
    save();
  }

  function setLevel(l) {
    if (!Logic.LEVELS[l] || l === level) return;
    if (blast) finishBlast();
    burst = new Set();
    stopTime();
    runs[level] = game;
    level = l;
    game = runs[l] && !runs[l].over ? runs[l] : Logic.newGame(l, randSeed());
    result.hidden = true;
    cursor = null;
    startTimeIfRunning();
    renderLevels();
    renderStats();
    layoutBoard();
    paint();
    save();
  }

  function setFlagMode(on) {
    flagMode = on;
    const b = $('.flag-mode');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }

  // --- Darstellung -----------------------------------------------------------------------

  function renderLevels() {
    const seg = $('.levels');
    seg.textContent = '';
    for (const l of Logic.LEVEL_IDS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg' + (l === level ? ' on' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(l === level));
      b.textContent = S[l];
      b.addEventListener('click', () => setLevel(l));
      seg.append(b);
    }
  }

  function renderStats() {
    const st = statOf(level);
    $('.stats').textContent = `${S.best}: ${st.best == null ? '–' : fmtTime(st.best)} · ${S.wins}: ${st.won}/${st.played}`;
  }

  // Raster neu aufbauen, wenn sich Stufe oder Ausrichtung ändern; Zellgröße passt sich dem Platz an
  function layoutBoard() {
    const W = field.clientWidth - 16, H = field.clientHeight - 16;
    if (W <= 0 || H <= 0) return;
    const turn = game.w > game.h && H > W;    // breites Feld auf hochkantem Bildschirm drehen
    const cols = turn ? game.h : game.w, rows = turn ? game.w : game.h;
    const gap = 2;
    const size = Math.max(14, Math.floor(Math.min((W - gap * (cols - 1)) / (cols + 0.5), (H - gap * (rows - 1)) / (rows + 0.5), 44)));
    board.style.setProperty('--cs', size + 'px');
    board.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    const key = `${game.level}:${turn}`;
    if (key === builtFor) return;
    builtFor = key;
    dispCols = cols; dispRows = rows;
    board.textContent = '';
    cellEls = new Array(game.w * game.h);
    dispToIndex = []; indexToDisp = new Array(game.w * game.h);
    for (let dr = 0; dr < rows; dr++) {
      for (let dc = 0; dc < cols; dc++) {
        const i = turn ? dc * game.w + dr : dr * game.w + dc;
        const c = document.createElement('div');
        c.className = 'c';
        c.dataset.i = i;
        c.setAttribute('role', 'gridcell');
        cellEls[i] = c;
        indexToDisp[i] = dispToIndex.length;
        dispToIndex.push(i);
        board.append(c);
      }
    }
  }

  function paint() {
    const over = game.over;
    const cur = cursor ? dispToIndex[cursor.r * dispCols + cursor.c] : -1;
    for (let i = 0; i < cellEls.length; i++) {
      const el = cellEls[i];
      let cls = 'c', text = '';
      if (game.open[i]) {
        if (game.mine[i]) cls += ' open mine' + (i === game.exploded ? ' boom' : '') + (burst.has(i) ? ' burst' : '');
        else {
          const n = Logic.adjacent(game, i);
          cls += ' open' + (n ? ' n' + n : '');
          if (n) text = String(n);
        }
      } else if (game.flag[i]) {
        cls += ' hidden flag' + (over && !game.won && !game.mine[i] ? ' wrong' : '');
      } else if (over && game.mine[i] && (!blast || burst.has(i))) {
        cls += ' open mine' + (burst.has(i) ? ' burst' : '');   // nach der Niederlage alle Minen zeigen
      } else {
        cls += ' hidden';
      }
      if (i === cur) cls += ' cursor';
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== text) el.textContent = text;
    }
    $('.mines b').textContent = String(Logic.minesLeft(game));
    $('.time b').textContent = String(Math.min(999, Math.floor(elapsed() / 1000)));
  }

  function applyStrings() {
    $('[data-act="exit"]').textContent = S.back;
    $('.title').textContent = S.title;
    $('[data-act="new"]').textContent = S.newGame;
    $('[data-act="again"]').textContent = S.again;
    $('[data-act="look"]').textContent = S.look;
    $('.flag-mode').title = S.flagMode;
    $('.flag-mode').setAttribute('aria-label', S.flagMode);
    $('.mines').title = S.minesLeft;
    $('.time').title = S.time;
    $('.levels').setAttribute('aria-label', S.title);
    $('.hint').textContent = `${S.help}. ${S.keys}.`;
  }

  // --- Eingabe ---------------------------------------------------------------------------

  const cellIndex = e => {
    const t = e.target.closest && e.target.closest('.c');
    return t ? Number(t.dataset.i) : -1;
  };
  function cancelPress() {
    if (press && press.timer) clearTimeout(press.timer);
    press = null;
  }

  board.addEventListener('contextmenu', e => e.preventDefault());
  // Ton freischalten bei jeder Geste (Autoplay-Regeln)
  root.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  // Während der Explosionskette: ein Klick irgendwohin öffnet sofort das Menü.
  // Der Klick, der die Mine getroffen hat, kommt kurz nach dem Start an und zählt nicht.
  root.addEventListener('click', e => {
    if (!blast || performance.now() - blast.start < 300) return;
    e.stopPropagation();
    e.preventDefault();
    finishBlast();
  }, { capture: true });
  board.addEventListener('pointerdown', e => {
    const i = cellIndex(e);
    if (i < 0) return;
    cursor = null;
    if (e.button === 2) { act('flag', i); return; }
    if (e.button !== 0) return;
    cancelPress();
    press = { i, id: e.pointerId, x: e.clientX, y: e.clientY, long: false, timer: null };
    if (e.pointerType !== 'mouse') {           // Touch: lang drücken = Flagge
      const p = press;
      p.timer = setTimeout(() => {
        p.long = true;
        act('flag', p.i);
        if (navigator.vibrate) navigator.vibrate(15);
      }, LONG_PRESS);
    }
  });
  board.addEventListener('pointermove', e => {
    if (press && e.pointerId === press.id && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress();
  });
  board.addEventListener('pointerup', e => {
    if (!press || e.pointerId !== press.id) return;
    const p = press;
    cancelPress();
    if (p.long) return;
    // Im Flaggen-Modus setzt ein Tippen Flaggen – auf offenen Zahlen deckt es weiterhin die Nachbarn auf
    act(flagMode && !game.open[p.i] ? 'flag' : 'primary', p.i);
  });
  board.addEventListener('pointercancel', cancelPress);

  // Nach einem Maus- oder Touch-Klick behält kein Knopf den Fokus, sonst landen Pfeile und Leertaste dort
  // statt auf dem Feld (Leertaste würde z. B. „Neues Spiel“ noch einmal auslösen). Tastatur-Klicks haben detail 0.
  root.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button');
    if (btn && e.detail > 0) btn.blur();
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'exit' && platform.exit) platform.exit();
    else if (a === 'new' || a === 'again') newGame();
    else if (a === 'look') result.hidden = true;
  });
  $('.flag-mode').addEventListener('click', () => setFlagMode(!flagMode));

  // Tastatur: Pfeile bewegen den Cursor, Leertaste/Enter deckt auf, F setzt Flagge, N neues Spiel
  window.addEventListener('keydown', e => {
    if (!ready || paused) return;
    sound.unlock();
    if (blast) { finishBlast(); e.preventDefault(); return; }
    if (e.target.closest && e.target.closest('button, input, a')) return;   // Knöpfe bedienen sich selbst
    const k = e.key;
    if (k === 'n' || k === 'N') { newGame(); return; }
    if (!dispCols || !dispRows) return;          // Raster noch nicht aufgebaut (z. B. Feld ohne Größe)
    if (k.startsWith('Arrow')) {
      if (!cursor) cursor = { r: Math.floor(dispRows / 2), c: Math.floor(dispCols / 2) };
      else if (k === 'ArrowLeft') cursor.c = Math.max(0, cursor.c - 1);
      else if (k === 'ArrowRight') cursor.c = Math.min(dispCols - 1, cursor.c + 1);
      else if (k === 'ArrowUp') cursor.r = Math.max(0, cursor.r - 1);
      else if (k === 'ArrowDown') cursor.r = Math.min(dispRows - 1, cursor.r + 1);
      paint();
      e.preventDefault();
      return;
    }
    if (!cursor) return;
    const i = dispToIndex[cursor.r * dispCols + cursor.c];
    if (k === ' ' || k === 'Enter') { act('primary', i); e.preventDefault(); }
    else if (k === 'f' || k === 'F') act('flag', i);
  }, { signal });

  const resizer = new ResizeObserver(() => { if (!destroyed) { layoutBoard(); paint(); } });
  resizer.observe(field);
  window.addEventListener('pagehide', save, { signal });

  // Entwickler-Hilfe: ?debug macht den Zustand für automatisierte Browser-Tests zugänglich
  const DEBUG = /[?&]debug\b/.test(location.search);
  if (DEBUG) {
    window.__dbg = {
      ready: () => ready, game: () => game, level: () => level, stats: () => stats,
      reveal: i => act('primary', i), flag: i => act('flag', i), newGame, setLevel,
      turned: () => builtFor.endsWith('true'), cellSize: () => parseFloat(board.style.getPropertyValue('--cs')),
      blasting: () => !!blast, burst: () => burst.size, bangs: () => sound.played,
    };
  }

  // --- Start und Lebenszyklus ------------------------------------------------------------

  async function init() {
    applyStrings();
    $('[data-act="exit"]').hidden = !platform.exit;
    const data = await platform.save.load();
    if (destroyed) return;
    load(data);
    game = runs[level] || Logic.newGame(level, randSeed());
    sound.setMaster(platform.audio.volume());
    offVolume = platform.audio.onChange(v => sound.setMaster(v));
    ready = true;
    renderLevels();
    renderStats();
    layoutBoard();
    paint();
    startTimeIfRunning();
  }

  function pause() {
    if (paused || destroyed) return;
    cancelPress();
    if (blast) finishBlast();                   // verdeckt: Kette nicht im Hintergrund weiterknallen
    save();
    paused = true;
    stopTime();
    sound.setPaused(true);
  }

  function resume() {
    if (!paused || destroyed) return;
    paused = false;
    sound.setPaused(false);
    startTimeIfRunning();
  }

  function unmount() {
    if (destroyed) return;
    save();
    destroyed = true;
    cancelPress();
    cancelBlast();
    clearInterval(timer);
    offVolume();
    sound.close();
    ac.abort();
    resizer.disconnect();
    root.remove();
    if (DEBUG) delete window.__dbg;
  }

  init().catch(e => platform.logError(e));
  return { pause, resume, unmount };
}
