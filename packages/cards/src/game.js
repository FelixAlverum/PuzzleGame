// Gemeinsamer Rahmen der Patience-Spiele (Solitaire, Spider): Kopfleiste, Tisch, Zeit, Züge, Rückgängig, Tipp,
// automatisches Zuendespielen, Speichern je Variante, Statistik, Rangliste, Siegesfeier und Lebenszyklus.
// Das Spiel liefert nur Regeln (Logic), Texte und die Lage der Stapel (layout) – siehe mountCardGame unten.
import { LANGS, HTML_LANG, pick } from '@spielesammlung/i18n';
import { createTable } from './table.js';
import { createCardSound } from './sound.js';
import { STR as BASE, cardName } from './strings.js';
import '@spielesammlung/ui/theme.css';
import '../cards.css';

const randSeed = () => (Math.random() * 4294967296) >>> 0;
const AUTO_STEP = 120;    // ms zwischen zwei Karten beim automatischen Zuendespielen
const ARM_TIME = 3000;    // ms, in denen der zweite Tipp auf „Neues Spiel“ bestätigt
const NOTE_TIME = 4500;   // ms, so lange steht ein Hinweis in der Fußzeile
const DEAL_STAGGER = 16;  // ms zwischen zwei Karten beim Austeilen

const ICON = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4l3 2M10 3h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  moves: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="11" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 3.5h9a2 2 0 0 1 2 2V17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v6h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 11A8 8 0 1 1 7 18.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.8 10.6c.7.6 1 1.4 1 2.4h5.6c0-1 .3-1.8 1-2.4A6 6 0 0 0 12 3z" fill="currentColor"/><path d="M9.5 18.5h5M10.5 21h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

const TEMPLATE = `
  <header class="game-bar">
    <button class="pill wood small" data-act="exit" hidden></button>
    <h1 class="game-title"></h1>
    <div class="seg-row game-variants" role="radiogroup"></div>
    <div class="game-counters">
      <span class="counter time">${ICON.clock}<b>0:00</b></span>
      <span class="counter moves">${ICON.moves}<b>0</b></span>
    </div>
    <div class="game-tools">
      <button class="pill ghost small icon" data-act="undo">${ICON.undo}</button>
      <button class="pill ghost small icon" data-act="hint">${ICON.hint}</button>
      <button class="pill primary small" data-act="new"></button>
    </div>
  </header>
  <main class="felt">
    <section class="game-result card" hidden>
      <h2></h2>
      <p class="sub"></p>
      <div class="row">
        <button class="pill primary" data-act="again"></button>
        <button class="pill ghost" data-act="look"></button>
      </div>
    </section>
  </main>
  <footer class="game-help">
    <p class="note-line" aria-live="polite"></p>
    <p class="stats"></p>
    <p class="hint"></p>
  </footer>`;

// Statistik je Variante: beendete oder aufgegebene Spiele, Siege, Bestzeit in ms
const newStat = () => ({ played: 0, won: 0, best: null });
function restoreStat(s) {
  const st = newStat();
  if (!s || typeof s !== 'object') return st;
  if (Number.isInteger(s.played) && s.played >= 0) st.played = s.played;
  if (Number.isInteger(s.won) && s.won >= 0) st.won = Math.min(s.won, st.played);
  if (Number.isFinite(s.best) && s.best > 0) st.best = s.best;
  return st;
}

/**
 * Baut ein Patience-Spiel in `el` auf und gibt { pause, resume, unmount } zurück.
 * @param {HTMLElement} el
 * @param {import('@spielesammlung/game-sdk').Platform} platform
 * @param {{
 *   className: string,
 *   STR: Record<string, Record<string, string>>,  // Spieltexte je Sprache: title, help, je Variante ihr Name
 *   Logic: object,                               // VARIANTS, DEFAULT_VARIANT, newGame, apply, undo, restore, toSave, view,
 *                                                // canDrag, dropMove, tapMove, hint, autoMove
 *   cards: (variant: string) => { id: number, suit: number, rank: number }[],
 *   layout: (variant: string, width: number, height: number) => { cardW: number, cardH: number, slots: object[] },
 *   explain?: (game: object, pile: string, index: number) => string | null,   // Text-Schlüssel, wenn Antippen nichts tut
 * }} def
 */
export function mountCardGame(el, platform, def) {
  const { Logic } = def;
  const root = document.createElement('div');
  root.className = `game-root cardgame ${def.className}`;
  root.innerHTML = TEMPLATE;
  el.append(root);
  const $ = sel => root.querySelector(sel);
  const felt = $('.felt'), result = $('.game-result');
  const ac = new AbortController(), signal = ac.signal;

  // Sprache: von der Plattform, Entwickler-Hilfe ?lang=fr erzwingt eine
  const forced = new URLSearchParams(location.search).get('lang');
  const lang = LANGS.includes(forced) ? forced : pick(platform.language());
  const S = { ...BASE[lang], ...def.STR[lang] }, htmlLang = HTML_LANG[lang];
  root.lang = htmlLang;

  // Zustand (gespeichert): Variante, offener Lauf und Statistik je Variante
  let variant = Logic.DEFAULT_VARIANT, runs = {}, stats = {};
  let game = Logic.newGame(variant, randSeed());
  let ready = false, paused = false, destroyed = false;
  let runningSince = 0;                  // performance.now(), seit dem die Zeit läuft; 0 = steht
  let armed = null, autoTimer = 0, winTimer = 0, noteTimer = 0;
  let table = null, tableFor = '';
  const sound = createCardSound();
  let offVolume = () => {};

  const statOf = v => stats[v] || (stats[v] = newStat());
  const started = () => game.moves.length > 0 && !game.won;
  const fmtClock = ms => {
    const s = Math.floor(ms / 1000);
    return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const fmtTime = ms => (ms >= 60000 ? fmtClock(ms) : (ms / 1000).toLocaleString(htmlLang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s');

  // --- Zeit ------------------------------------------------------------------------------

  const elapsed = () => game.elapsed + (runningSince ? performance.now() - runningSince : 0);
  function commitTime() {
    if (!runningSince) return;
    const now = performance.now();
    game.elapsed += now - runningSince;
    runningSince = now;
  }
  function stopTime() { commitTime(); runningSince = 0; }
  function startTimeIfRunning() {
    if (!runningSince && !paused && started()) runningSince = performance.now();
  }
  const clock = setInterval(() => { if (!destroyed) $('.time b').textContent = fmtClock(elapsed()); }, 250);

  // --- Speichern -------------------------------------------------------------------------

  function save() {
    if (!ready) return;
    commitTime();
    runs[variant] = game;
    const open = {};
    for (const [v, g] of Object.entries(runs)) if (g && g.moves.length && !g.won) open[v] = Logic.toSave(g);
    platform.save.store({ v: 1, variant, stats, runs: open });
  }

  function load(data) {
    if (!data || data.v !== 1) return;
    if (Logic.VARIANTS.includes(data.variant)) variant = data.variant;
    for (const v of Logic.VARIANTS) {
      if (data.stats && data.stats[v]) stats[v] = restoreStat(data.stats[v]);
      const g = data.runs && Logic.restore(data.runs[v]);
      if (g && g.variant === v && !g.won) runs[v] = g;
    }
  }

  // --- Tisch -----------------------------------------------------------------------------

  // Für jede Variante ein eigener Tisch (Spider: andere Farben, also andere Karten)
  function buildTable() {
    if (tableFor === variant && table) return;
    if (table) table.destroy();
    tableFor = variant;
    table = createTable(felt, {
      cards: def.cards(variant),
      label: (c, up) => (up ? cardName(lang, c) : S.faceDown),
      canDrag: (pile, index) => ready && !paused && !game.won && Logic.canDrag(game, pile, index),
      drop: onDrop,
      tap: onTap,
      onPress: () => { sound.unlock(); },
    });
    felt.append(result);                         // Ergebnis über dem Tisch
    layoutTable();
  }

  function layoutTable() {
    if (!table) return;
    const W = felt.clientWidth, H = felt.clientHeight;
    if (W <= 0 || H <= 0) return;
    table.setLayout(def.layout(variant, W, H));
    table.render(Logic.view(game), { instant: true });
  }

  function paintCounters() {
    $('.moves b').textContent = String(game.moves.length);
    $('.time b').textContent = fmtClock(elapsed());
    $('[data-act="undo"]').disabled = !game.moves.length || game.won;
  }

  // Austeilen: alle Karten liegen erst auf dem Stapel und fliegen dann nacheinander an ihren Platz
  function dealAnimation() {
    const all = Logic.view(game), stack = [];
    for (const p of Object.keys(all)) for (const c of all[p]) stack.push({ id: c.id, up: false });
    table.render({ ...Object.fromEntries(Object.keys(all).map(p => [p, []])), stock: stack }, { instant: true });
    requestAnimationFrame(() => { if (!destroyed) table.render(all, { stagger: DEAL_STAGGER }); });
  }

  // --- Züge ------------------------------------------------------------------------------

  function doMove(m) {
    const events = Logic.apply(game, m);
    if (!events) return false;
    disarm();
    note('');
    startTimeIfRunning();
    for (const ev of events) {
      if (ev === 'draw') sound.draw(Math.min(3, game.piles.waste ? game.piles.waste.length : 1));
      else if (ev === 'recycle') sound.recycle();
      else if (ev === 'deal') sound.deal();
      else if (ev === 'foundation') {
        const pile = game.piles[m[3]];
        sound.foundation(def.cards(variant)[pile[pile.length - 1]].rank);
      } else if (ev === 'tableau') sound.place();
      else if (ev === 'flip') sound.flip();
      else if (ev === 'complete') sound.complete();
    }
    table.render(Logic.view(game));
    paintCounters();
    if (game.won) end();
    else scheduleAuto();
    save();
    return true;
  }

  function onDrop(pile, index, target) {
    if (!ready || paused || game.won) return false;
    const m = Logic.dropMove(game, pile, index, target);
    if (!m) { sound.invalid(); return false; }
    return doMove(m);
  }

  function onTap(pile, index) {
    if (!ready || paused || game.won || autoTimer) return;
    const m = Logic.tapMove(game, pile, index);
    if (m && doMove(m)) return;
    sound.invalid();
    table.shake(pile, index);
    const why = def.explain && def.explain(game, pile, index);
    if (why) note(S[why]);
  }

  function undo() {
    if (!ready || paused || game.won) return;
    clearAuto();
    commitTime();
    const back = Logic.undo(game);
    if (!back) return;
    disarm();
    game = runs[variant] = back;
    sound.undo();
    table.render(Logic.view(game));
    paintCounters();
    save();
  }

  function showHint() {
    if (!ready || paused || game.won) return;
    const m = Logic.hint(game);
    if (!m) { note(S.noMoves); sound.invalid(); return; }
    sound.hint();
    const topOf = p => game.piles[p].length - 1;
    if (m[0] === 'd') {
      table.mark('stock', topOf('stock'));
      note(S.drawHint);
      return;
    }
    table.mark(m[1], m[2]);
    table.mark(m[3], topOf(m[3]));
  }

  // Zuendespielen: Die Logik sagt, wann es so weit ist (Solitaire: alles offen, Stapel leer)
  function scheduleAuto() {
    clearAuto();
    if (paused || game.won || !Logic.autoMove(game)) return;
    autoTimer = setTimeout(() => {
      autoTimer = 0;
      const m = Logic.autoMove(game);
      if (m) doMove(m);
    }, AUTO_STEP);
  }
  function clearAuto() { clearTimeout(autoTimer); autoTimer = 0; }

  function end() {
    clearAuto();
    stopTime();
    game.elapsed = Math.round(game.elapsed);
    const st = statOf(variant);
    st.played++;
    st.won++;
    const newBest = st.best == null || game.elapsed < st.best;
    if (newBest) st.best = game.elapsed;
    platform.scores.submit(variant, game.elapsed, { seed: game.seed, moves: game.moves });
    delete runs[variant];
    renderStats();
    sound.win(newBest);
    const dur = table.celebrate();
    winTimer = setTimeout(() => showResult(newBest), Math.min(dur, 2400));
    result.dataset.best = newBest ? '1' : '';
  }

  function showResult(newBest = !!result.dataset.best) {
    clearTimeout(winTimer);
    winTimer = 0;
    $('.game-result h2').textContent = S.won;
    $('.game-result .sub').textContent = `${fmtTime(game.elapsed)} · ${S.moves}: ${game.moves.length}${newBest ? ' · ' + S.newBest : ''}`;
    result.classList.add('won');
    result.hidden = false;
  }

  function newGame() {
    disarm();
    clearAuto();
    clearTimeout(winTimer);
    winTimer = 0;
    if (started()) statOf(variant).played++;   // aufgegebenes Spiel zählt als verloren
    stopTime();
    game = runs[variant] = Logic.newGame(variant, randSeed());
    result.hidden = true;
    note('');
    sound.shuffle();
    dealAnimation();
    paintCounters();
    renderStats();
    save();
  }

  // Ein begonnenes Spiel geht nur nach einem zweiten Tipp (oder N) innerhalb von 3 s verloren
  function confirmNew(btn) {
    if (!started() || (armed && armed.btn === btn)) { newGame(); return; }
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

  function setVariant(v) {
    if (!Logic.VARIANTS.includes(v) || v === variant) return;
    disarm();
    clearAuto();
    if (winTimer) showResult();
    stopTime();
    runs[variant] = game;
    variant = v;
    game = runs[v] && !runs[v].won ? runs[v] : Logic.newGame(v, randSeed());
    runs[v] = game;
    result.hidden = true;
    note('');
    buildTable();
    if (!game.moves.length) dealAnimation();
    startTimeIfRunning();
    renderVariants();
    renderStats();
    paintCounters();
    save();
    scheduleAuto();
  }

  function note(text) {
    clearTimeout(noteTimer);
    $('.note-line').textContent = text || '';
    if (text) noteTimer = setTimeout(() => { if (!destroyed) $('.note-line').textContent = ''; }, NOTE_TIME);
  }

  // --- Darstellung -----------------------------------------------------------------------

  function renderVariants() {
    const seg = $('.game-variants');
    seg.textContent = '';
    for (const v of Logic.VARIANTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg' + (v === variant ? ' on' : '');
      b.dataset.variant = v;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(v === variant));
      b.textContent = S[v];
      b.addEventListener('click', () => setVariant(v));
      seg.append(b);
    }
  }

  function renderStats() {
    const st = statOf(variant);
    $('.stats').textContent = `${S.best}: ${st.best == null ? '–' : fmtTime(st.best)} · ${S.wins}: ${st.won}/${st.played}`;
  }

  function applyStrings() {
    $('[data-act="exit"]').textContent = S.back;
    $('.game-title').textContent = S.title;
    $('[data-act="new"]').textContent = S.newGame;
    $('[data-act="again"]').textContent = S.again;
    $('[data-act="look"]').textContent = S.look;
    for (const [act, label] of [['undo', S.undo], ['hint', S.hint]]) {
      const b = $(`[data-act="${act}"]`);
      b.title = label;
      b.setAttribute('aria-label', label);
    }
    $('.moves').title = S.moves;
    $('.time').title = S.time;
    $('.game-variants').setAttribute('aria-label', S.title);
    $('.game-help .hint').textContent = `${S.help} ${S.keys}.`;
  }

  // --- Eingabe ---------------------------------------------------------------------------

  root.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
  // Während die Karten vom Tisch springen: Klick irgendwohin zeigt sofort das Ergebnis
  root.addEventListener('click', e => {
    if (!winTimer) return;
    e.stopPropagation();
    showResult();
  }, { capture: true });
  // Nach Maus/Touch behält kein Knopf den Fokus, sonst landen Pfeile und Leertaste dort statt auf dem Tisch
  root.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button');
    if (btn && e.detail > 0) btn.blur();
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'exit' && platform.exit) platform.exit();
    else if (a === 'new') confirmNew(b);
    else if (a === 'again') newGame();
    else if (a === 'look') { result.hidden = true; table.render(Logic.view(game), { instant: true }); }
    else if (a === 'undo') undo();
    else if (a === 'hint') showHint();
  });

  window.addEventListener('keydown', e => {
    if (!ready || paused) return;
    sound.unlock();
    if (winTimer) { showResult(); e.preventDefault(); return; }
    if (e.target.closest && e.target.closest('button, input, a')) return;
    const k = e.key;
    if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) { undo(); e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'u' || k === 'U' || k === 'Backspace') { undo(); e.preventDefault(); return; }
    if (k === 'h' || k === 'H') { showHint(); return; }
    if (k === 'n' || k === 'N') { confirmNew($('[data-act="new"]')); return; }
    if (k === 'd' || k === 'D') { onTap('stock', game.piles.stock.length - 1); return; }
    if (!game.won && table && table.key(k)) e.preventDefault();
  }, { signal });

  const resizer = new ResizeObserver(() => { if (!destroyed && ready) layoutTable(); });
  resizer.observe(felt);
  window.addEventListener('pagehide', save, { signal });

  // Entwickler-Hilfe: ?debug macht den Zustand für automatisierte Browser-Tests zugänglich
  const DEBUG = /[?&]debug\b/.test(location.search);
  if (DEBUG) {
    window.__dbg = {
      ready: () => ready, game: () => game, variant: () => variant, stats: () => stats, view: () => Logic.view(game),
      move: m => doMove(m), tap: onTap, drop: onDrop, undo, hint: () => Logic.hint(game), newGame, setVariant,
      // Lage vorgeben (z. B. kurz vor dem Sieg); Rückgängig spielt von dort aus nach
      setPiles: (piles, up) => {
        clearAuto();
        game = runs[variant] = Logic.fromPiles(variant, piles, up);
        table.render(Logic.view(game), { instant: true });
        paintCounters();
        scheduleAuto();
      },
      celebrating: () => !!winTimer, cardCenter: id => table.cardCenter(id), slotCenter: p => table.slotCenter(p),
    };
  }

  // --- Start und Lebenszyklus ------------------------------------------------------------

  async function init() {
    applyStrings();
    $('[data-act="exit"]').hidden = !platform.exit;
    const data = await platform.save.load();
    if (destroyed) return;
    load(data);
    game = runs[variant] || Logic.newGame(variant, randSeed());
    runs[variant] = game;
    sound.setMaster(platform.audio.volume());
    offVolume = platform.audio.onChange(v => sound.setMaster(v));
    ready = true;
    renderVariants();
    renderStats();
    buildTable();
    if (!game.moves.length) dealAnimation();
    paintCounters();
    startTimeIfRunning();
    scheduleAuto();
  }

  function pause() {
    if (paused || destroyed) return;
    if (table) table.cancelPress();
    clearAuto();
    if (winTimer) showResult();
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
    scheduleAuto();
  }

  function unmount() {
    if (destroyed) return;
    save();
    destroyed = true;
    disarm();
    clearAuto();
    clearTimeout(winTimer);
    clearTimeout(noteTimer);
    clearInterval(clock);
    offVolume();
    sound.close();
    ac.abort();
    resizer.disconnect();
    if (table) table.destroy();
    root.remove();
    if (DEBUG) delete window.__dbg;
  }

  init().catch(e => platform.logError(e));
  return { pause, resume, unmount };
}
