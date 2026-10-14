// Minesweeper: Darstellung und Eingabe als HTML-Raster, Spiellogik in logic.js.
// mount() baut das Spiel in einem Element auf und liefert pause/resume/unmount an die Plattform-Hülle.
// Je Stufe (auch „Eigenes“ Feld) gibt es einen eigenen offenen Lauf und eine eigene Statistik;
// die Zeit läuft nur, solange gespielt wird.
import * as Logic from './logic.js';
import * as I18N from './i18n.js';
import { createSound } from './audio.js';
import mineIcon from '../assets/icon-mine.svg?raw';
import clockIcon from '../assets/icon-clock.svg?raw';
import flagIcon from '../assets/icon-flag.svg?raw';
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
const WIN_DELAY = 750;    // ms Welle über das Feld, bevor die Siegmeldung kommt
const ARM_TIME = 3000;    // ms, in denen der zweite Tipp auf „Neues Spiel“ bestätigt
const LEVELS = [...Logic.LEVEL_IDS, Logic.CUSTOM];
const rnd = (a, b) => a + Math.random() * (b - a);

// Symbole der Kopfleiste: games/minesweeper/assets/icon-*.svg (currentColor)
const ICON = { mine: mineIcon, clock: clockIcon, flag: flagIcon };

const TEMPLATE = `
  <header class="game-bar">
    <button class="pill wood small" data-act="exit" hidden></button>
    <h1 class="game-title"></h1>
    <div class="seg-row game-variants levels" role="radiogroup"></div>
    <div class="game-counters">
      <span class="counter mines">${ICON.mine}<b>0</b></span>
      <span class="counter time">${ICON.clock}<b>0</b></span>
    </div>
    <div class="game-tools">
      <button class="pill ghost small icon flag-mode" aria-pressed="false">${ICON.flag}</button>
      <button class="pill primary small" data-act="new"></button>
    </div>
  </header>
  <div class="flash" aria-hidden="true"></div>
  <main class="field">
    <div class="board" role="grid"></div>
    <section class="game-result card" hidden>
      <h2></h2>
      <p class="sub"></p>
      <div class="row">
        <button class="pill primary" data-act="again"></button>
        <button class="pill ghost" data-act="look"></button>
      </div>
    </section>
    <section class="custom card" hidden>
      <h2></h2>
      <label class="setting"><span data-t="width"></span><input type="range" data-k="w"><output></output></label>
      <label class="setting"><span data-t="height"></span><input type="range" data-k="h"><output></output></label>
      <label class="setting"><span data-t="mineCount"></span><input type="range" data-k="mines"><output></output></label>
      <div class="row">
        <button class="pill primary" data-act="custom-start"></button>
        <button class="pill ghost" data-act="custom-cancel"></button>
      </div>
    </section>
  </main>
  <footer class="game-help">
    <p class="stats"></p>
    <p class="hint"></p>
  </footer>`;

/** @param {HTMLElement} el @param {import('@spielesammlung/game-sdk').Platform} platform */
export function mount(el, platform) {
  const root = document.createElement('div');
  root.className = 'game-root minesweeper';
  root.innerHTML = TEMPLATE;
  el.append(root);
  const $ = sel => root.querySelector(sel);
  const board = $('.board'), field = $('.field'), result = $('.game-result'), customBox = $('.custom');
  const ac = new AbortController(), signal = ac.signal;

  // Sprache: von der Plattform, Entwickler-Hilfe ?lang=fr erzwingt eine
  const forced = new URLSearchParams(location.search).get('lang');
  const lang = I18N.LANGS.includes(forced) ? forced : I18N.pick(platform.language());
  const S = I18N.STR[lang], htmlLang = I18N.HTML_LANG[lang];
  root.lang = htmlLang;

  // Zustand (gespeichert): gewählte Stufe, offener Lauf und Statistik je Stufe, Maße des eigenen Felds
  let level = Logic.DEFAULT_LEVEL, runs = {}, stats = {}, custom = Logic.customSize();
  let game = Logic.newGame(level, randSeed());
  // Ablauf
  let ready = false, paused = false, destroyed = false, flagMode = false;
  let runningSince = 0;                  // performance.now() seit dem die Zeit läuft, 0 = steht
  let press = null;                      // laufende Berührung { i, id, x, y, timer, long }
  let cursor = null;                     // Tastatur-Cursor in Anzeige-Koordinaten { r, c }
  let blast = null;                      // laufende Explosionskette { timers, start, lastBang }
  let burst = new Set();                 // schon explodierte Minen der verlorenen Runde
  let popping = new Map();               // gerade aufspringende Felder → Verzögerung in s
  let popTimer = 0, winTimer = 0;
  let armed = null;                      // Zwei-Tipp-Bestätigung für „Neues Spiel“ { btn, label, timer }
  const sound = createSound();
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
      v: 1, level, stats, custom,
      runs: Object.fromEntries(Object.entries(runs).filter(([, g]) => g && !g.over && g.started)),
    });
  }

  function load(data) {
    if (!data || data.v !== 1) return;
    if (LEVELS.includes(data.level)) level = data.level;
    if (data.custom) custom = Logic.customSize(data.custom);
    for (const l of LEVELS) {
      if (data.stats && data.stats[l]) stats[l] = Logic.restoreStat(data.stats[l]);
      const g = data.runs && Logic.restore(data.runs[l]);
      if (g && g.level === l && !g.over) runs[l] = g;
    }
  }

  const freshGame = l => Logic.newGame(l, randSeed(), custom);

  // --- Aktionen --------------------------------------------------------------------------

  function act(kind, i) {
    if (!ready || paused || game.over || !customBox.hidden) return;
    let events = null;
    if (kind === 'flag') events = Logic.toggleFlag(game, i);
    else events = game.open[i] ? Logic.chord(game, i) : Logic.reveal(game, i);
    if (!events) return;
    disarm();
    startTimeIfRunning();
    for (const ev of events) {
      if (ev.type === 'revealed' && ev.cells.length) {
        if (!game.over || game.won) sound.reveal(ev.cells.length);
        pop(ev.cells, i);
      } else if (ev.type === 'flagged') sound.flag(ev.on);
    }
    if (game.over) end();
    paint();
    save();
  }

  function end() {
    stopTime();
    game.elapsed = Math.round(game.elapsed);   // ganze Millisekunden für Statistik und Rangliste
    // Eigene Felder: keine Rangliste und keine Bestzeit, über verschiedene Größen hinweg sagt sie nichts
    const newBest = Logic.recordResult(statOf(level), game) && level !== Logic.CUSTOM;
    if (game.won && level !== Logic.CUSTOM) platform.scores.submit(level, game.elapsed, { seed: game.seed, moves: game.moves });
    delete runs[level];
    renderStats();
    if (game.won) celebrate(newBest);
    else startBlast();
  }

  // Neu geöffnete Felder springen nacheinander auf, ausgehend vom angeklickten Feld
  function pop(cells, from) {
    const fr = Math.floor(from / game.w), fc = from % game.w;
    for (const i of cells) {
      const d = Math.hypot(Math.floor(i / game.w) - fr, (i % game.w) - fc);
      popping.set(i, Math.min(0.4, d * 0.03));
    }
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { popping.clear(); if (!destroyed) paint(); }, 700);
  }

  // Sieg: Ton, eine Welle über das Feld, danach die Meldung
  function celebrate(newBest) {
    sound.win(newBest);
    for (let k = 0; k < dispToIndex.length; k++) {
      const el = cellEls[dispToIndex[k]];
      el.style.setProperty('--d', `${(Math.floor(k / dispCols) + (k % dispCols)) * 0.018}s`);
    }
    board.classList.add('won');
    clearTimeout(winTimer);
    winTimer = setTimeout(() => showResult(newBest), WIN_DELAY);
  }

  function showResult(newBest) {
    $('.game-result h2').textContent = game.won ? S.won : S.lost;
    $('.game-result .sub').textContent = game.won ? `${fmtTime(game.elapsed)}${newBest ? ' · ' + S.newBest : ''}` : '';
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

  // Aufräumen, bevor ein anderes Spiel aufs Feld kommt (neues Spiel, andere Stufe)
  function clearBoardEffects() {
    cancelBlast();
    burst = new Set();
    popping.clear();
    clearTimeout(winTimer);
    board.classList.remove('won');
    result.hidden = true;
    cursor = null;
  }

  function newGame() {
    disarm();
    clearBoardEffects();
    stopTime();
    game = runs[level] = freshGame(level);
    customBox.hidden = true;
    layoutBoard();
    paint();
    save();
  }

  // Ein begonnener Lauf geht nur nach einem zweiten Tipp (oder Druck auf N) innerhalb von 3 s verloren
  const inProgress = () => game.started && !game.over;
  function confirmNew(btn, action) {
    if (!inProgress() || (armed && armed.btn === btn)) { disarm(); action(); return; }
    disarm();
    armed = { btn, label: btn.textContent, timer: setTimeout(disarm, ARM_TIME) };
    btn.textContent = S.sure;
    btn.classList.add('armed');
  }
  function disarm() {
    if (!armed) return;
    clearTimeout(armed.timer);
    armed.btn.textContent = armed.label;
    armed.btn.classList.remove('armed');
    armed = null;
  }

  function setLevel(l) {
    if (!LEVELS.includes(l)) return;
    if (l === level) {                           // „Eigenes“ ein zweites Mal: Maße ändern
      if (l === Logic.CUSTOM) openCustom();
      return;
    }
    disarm();
    if (blast) finishBlast();
    clearBoardEffects();
    stopTime();
    runs[level] = game;
    level = l;
    game = runs[l] && !runs[l].over ? runs[l] : freshGame(l);
    customBox.hidden = true;
    startTimeIfRunning();
    renderLevels();
    renderStats();
    layoutBoard();
    paint();
    save();
    if (l === Logic.CUSTOM && !game.started) openCustom();
  }

  // --- Eigenes Feld ----------------------------------------------------------------------

  const customInput = k => customBox.querySelector(`input[data-k="${k}"]`);
  function openCustom() {
    disarm();
    const [wl, wh] = Logic.CUSTOM_LIMITS.w, [hl, hh] = Logic.CUSTOM_LIMITS.h;
    Object.assign(customInput('w'), { min: wl, max: wh, value: custom.w });
    Object.assign(customInput('h'), { min: hl, max: hh, value: custom.h });
    customInput('mines').min = Logic.CUSTOM_LIMITS.mines[0];
    syncCustom(custom.mines);
    result.hidden = true;
    customBox.hidden = false;
  }
  // Minen-Regler folgt der Feldgröße (höchstens alle Felder bis auf 9)
  function syncCustom(mines) {
    const w = Number(customInput('w').value), h = Number(customInput('h').value), m = customInput('mines');
    m.max = Logic.maxMines(w, h);
    m.value = Math.min(Number(m.max), mines ?? Number(m.value));
    for (const k of ['w', 'h', 'mines']) customInput(k).nextElementSibling.textContent = customInput(k).value;
  }
  function startCustom() {
    custom = Logic.customSize({ w: Number(customInput('w').value), h: Number(customInput('h').value), mines: Number(customInput('mines').value) });
    newGame();
    renderStats();
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
    for (const l of LEVELS) {
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
    $('.stats').textContent = level === Logic.CUSTOM
      ? `${game.w} × ${game.h} · ${S.mineCount}: ${game.mines} · ${S.wins}: ${st.won}/${st.played}`
      : `${S.best}: ${st.best == null ? '–' : fmtTime(st.best)} · ${S.wins}: ${st.won}/${st.played}`;
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
    const key = `${game.level}:${game.w}x${game.h}:${turn}`;
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
      if (popping.has(i) && game.open[i] && !game.mine[i] && !game.won) {
        cls += ' pop';
        el.style.setProperty('--d', popping.get(i) + 's');
      }
      if (el.className !== cls) el.className = cls;
      if (el.textContent !== text) el.textContent = text;
    }
    $('.mines b').textContent = String(Logic.minesLeft(game));
    $('.time b').textContent = String(Math.min(999, Math.floor(elapsed() / 1000)));
  }

  function applyStrings() {
    $('[data-act="exit"]').textContent = S.back;
    $('.game-title').textContent = S.title;
    root.querySelectorAll('[data-t]').forEach(n => { n.textContent = S[n.dataset.t]; });
    $('.custom h2').textContent = S.customTitle;
    $('[data-act="custom-start"]').textContent = S.start;
    $('[data-act="custom-cancel"]').textContent = S.cancel;
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
    else if (a === 'new') confirmNew(b, newGame);
    else if (a === 'again') newGame();
    else if (a === 'look') result.hidden = true;
    else if (a === 'custom-start') confirmNew(b, startCustom);
    else if (a === 'custom-cancel') customBox.hidden = true;
  });
  customBox.addEventListener('input', e => { if (e.target.matches('input')) syncCustom(); });
  $('.flag-mode').addEventListener('click', () => setFlagMode(!flagMode));

  // Tastatur: Pfeile bewegen den Cursor, Leertaste/Enter deckt auf, F setzt Flagge, N neues Spiel
  window.addEventListener('keydown', e => {
    if (!ready || paused) return;
    sound.unlock();
    if (blast) { finishBlast(); e.preventDefault(); return; }
    const k = e.key;
    if (!customBox.hidden) {                     // Dialog „Eigenes Feld“ offen: nur Esc schließt ihn
      if (k === 'Escape') customBox.hidden = true;
      return;
    }
    if (e.target.closest && e.target.closest('button, input, a')) return;   // Knöpfe bedienen sich selbst
    if (k === 'n' || k === 'N') { confirmNew($('[data-act="new"]'), newGame); return; }
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
      setCustom: size => { custom = Logic.customSize(size); newGame(); renderStats(); },
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
    game = runs[level] || freshGame(level);
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
    disarm();
    clearTimeout(popTimer);
    clearTimeout(winTimer);
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
