// Spiellogik: pur und deterministisch, kein DOM. Jeder Zug liefert eine Liste von Events,
// auf die Darstellung, Animation und Sound reagieren (siehe Vault: 03 Technik/Architektur).
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./shapes.js') : root.Shapes);
  if (isNode) module.exports = api;
  else root.Logic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Shapes) {
  'use strict';

  const SIZES = [6, 8, 10];       // wählbare Feldgrößen (Kantenlänge)
  const DEFAULT_SIZE = 8;
  const BIOMES = Shapes.BIOMES;
  const TRAY = 3;
  const BIG = 7;                 // ab dieser Zellenzahl gilt eine Form als „groß“
  const COMBO_GRACE = 2;         // Züge ohne Auflösung, die eine Combo überlebt
  const FRESH_SOIL_BONUS = 300;  // Feld komplett leer geräumt
  const PLOTS = 5;               // Beete im Garten
  const STAGES = 5;              // 0 = Saat … 5 = Blüte
  const HOLD = TRAY;             // Slot-Nummer des Ablagefelds (Zwischenspeicher für eine Form)
  const UNDO_LIMIT = 3;          // so viele Züge lassen sich höchstens zurücknehmen

  // Schwierigkeitsgrade: nur der Formen-Mix ändert sich. Die nächste Stufe wird frei, sobald
  // eine Runde der vorherigen Stufe (beliebiges Biom, beliebige Feldgröße) UNLOCK_SCORE erreicht.
  //   mercy/mercyFill: kleine Formen (≤ 3 Zellen) × mercy, wenn das Feld voller als mercyFill ist
  //   small/large: Faktor für kleine (≤ 3) bzw. große (≥ 5 Zellen) Formen
  //   ramp: wie stark Formen ab 6 Zellen mit dem Punktestand häufiger werden
  //   maxBig: so viele sehr große Formen (≥ BIG Zellen) höchstens pro Ablage
  const DIFFS = ['easy', 'normal', 'hard'];
  const DEFAULT_DIFF = DIFFS[0];
  const UNLOCK_SCORE = 1000;
  const DIFF = {
    easy:   { mercy: 3, mercyFill: 0.5, small: 1.4, large: 0.6, ramp: 0.3, maxBig: 1 },
    normal: { mercy: 2, mercyFill: 0.6, small: 1,   large: 1,   ramp: 0.6, maxBig: 1 },
    hard:   { mercy: 1, mercyFill: 1,   small: 0.8, large: 1.4, ramp: 1.2, maxBig: 2 },
  };
  // Spielstände von vor den Schwierigkeitsgraden wurden mit dem heutigen „normal“ gespielt
  const diffOf = state => (DIFFS.includes(state.diff) ? state.diff : 'normal');

  // mulberry32 – Zustand liegt im Spielstand, damit Runden reproduzierbar und speicherbar sind
  function rand(state) {
    state.rng = (state.rng + 0x6D2B79F5) >>> 0;
    let t = state.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function pieceOf(item) {
    const shape = Shapes.BY_ID[item.shape];
    const v = shape.variants[item.v];
    return { shape, cells: v.cells, w: v.w, h: v.h, mat: shape.mat, accent: shape.accent || 0 };
  }

  // Die Kantenlänge steckt im Feld selbst – so funktionieren alle Funktionen mit jeder Feldgröße
  const sizeOf = board => Math.round(Math.sqrt(board.length));

  function canPlace(board, piece, r0, c0) {
    const N = sizeOf(board);
    for (const p of piece.cells) {
      const r = r0 + p.r, c = c0 + p.c;
      if (r < 0 || c < 0 || r >= N || c >= N || board[r * N + c]) return false;
    }
    return true;
  }

  function fits(board, piece) {
    const N = sizeOf(board);
    for (let r = 0; r <= N - piece.h; r++) {
      for (let c = 0; c <= N - piece.w; c++) if (canPlace(board, piece, r, c)) return true;
    }
    return false;
  }

  const itemAt = (state, slot) => (slot === HOLD ? state.hold : state.tray[slot]) || null;
  const anyMove = state => [...state.tray, state.hold].some(it => it && fits(state.board, pieceOf(it)));
  // Steckt die Runde fest? Ausnahme: Die letzte Form ins leere Ablagefeld legen füllt die Ablage neu.
  const stuck = state => !anyMove(state) && !(!state.hold && state.tray.filter(Boolean).length === 1);

  function fullLines(board) {
    const N = sizeOf(board);
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      let rowFull = true, colFull = true;
      for (let j = 0; j < N; j++) {
        if (!board[i * N + j]) rowFull = false;
        if (!board[j * N + i]) colFull = false;
      }
      if (rowFull) rows.push(i);
      if (colFull) cols.push(i);
    }
    return { rows, cols };
  }

  // Welche Linien würden sich auflösen, wenn die Form dort läge? (Vorschau beim Ziehen)
  function previewLines(board, piece, r0, c0) {
    const b = board.slice(), N = sizeOf(board);
    for (const p of piece.cells) b[(r0 + p.r) * N + c0 + p.c] = 1;
    return fullLines(b);
  }

  function lineScore(lines, combo) {
    const base = 10 * lines * (lines + 1) / 2;
    return Math.round(base * (1 + 0.5 * (combo - 1)));
  }

  // --- Formen-Generator -------------------------------------------------------

  function weightOf(shape, score, fill, diff = 'normal') {
    const d = DIFF[diff];
    let w = shape.weight;
    if (shape.size <= 3) {
      w *= d.small;
      if (fill > d.mercyFill) w *= d.mercy;                          // Gnade bei vollem Feld
    }
    if (shape.size >= 5) w *= d.large;
    if (shape.size >= 6) w *= 1 + Math.min(score / 4000, 1) * d.ramp; // wird langsam schwerer
    return w;
  }

  function drawItem(state, fill, allowBig) {
    const pool = Shapes.pool(state.biome).filter(s => allowBig || s.size < BIG);
    const weights = pool.map(s => weightOf(s, state.score, fill, diffOf(state)));
    let x = rand(state) * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && x >= weights[i]) { x -= weights[i]; i++; }
    return { shape: pool[i].id, v: Math.floor(rand(state) * pool[i].variants.length) };
  }

  function refill(state) {
    const fill = state.board.filter(Boolean).length / state.board.length;
    for (let attempt = 0; attempt < 20; attempt++) {
      let big = 0;
      state.tray = [];
      for (let k = 0; k < TRAY; k++) {
        const item = drawItem(state, fill, big < DIFF[diffOf(state)].maxBig);
        if (Shapes.BY_ID[item.shape].size >= BIG) big++;
        state.tray.push(item);
      }
      if (anyMove(state)) return;
    }
    // Notfall: kleinste passende Form erzwingen, damit nie direkt nach dem Nachfüllen Schluss ist
    const bySize = Shapes.pool(state.biome).slice().sort((a, b) => a.size - b.size);
    for (const s of bySize) {
      for (let v = 0; v < s.variants.length; v++) {
        const item = { shape: s.id, v };
        if (fits(state.board, pieceOf(item))) { state.tray[0] = item; return; }
      }
    }
  }

  // --- Spielablauf ------------------------------------------------------------

  // opts: { biome, size, diff } – fehlende oder unbekannte Werte fallen auf Wiese / 8×8 / normal zurück
  function newGame(seed, opts = {}) {
    const biome = BIOMES.includes(opts.biome) ? opts.biome : BIOMES[0];
    const N = SIZES.includes(opts.size) ? opts.size : DEFAULT_SIZE;
    const diff = DIFFS.includes(opts.diff) ? opts.diff : 'normal';
    const state = {
      v: 1, biome, diff, board: new Array(N * N).fill(null), tray: [], score: 0, combo: 0,
      movesSinceClear: 0, rng: seed >>> 0, nextPid: 1, over: false, hold: null,
    };
    refill(state);
    return state;
  }

  function place(state, slot, r0, c0) {
    const item = itemAt(state, slot);
    if (state.over || !item) return null;
    const piece = pieceOf(item);
    if (!canPlace(state.board, piece, r0, c0)) return null;

    const events = [];
    const N = sizeOf(state.board);
    const pid = state.nextPid++;
    const cells = piece.cells.map(p => {
      const r = r0 + p.r, c = c0 + p.c;
      const cell = { m: piece.mat, p: pid, a: p.a ? piece.accent : 0 };
      state.board[r * N + c] = cell;
      return { r, c, ...cell };
    });
    if (slot === HOLD) state.hold = null; else state.tray[slot] = null;
    state.score += cells.length;
    events.push({ type: 'placed', slot, pid, mat: piece.mat, cells, points: cells.length });

    const { rows, cols } = fullLines(state.board);
    const lines = rows.length + cols.length;
    if (lines > 0) {
      state.combo += 1;
      state.movesSinceClear = 0;
      const seen = new Set(), cleared = [];
      const take = (r, c) => {
        const i = r * N + c;
        if (seen.has(i)) return;            // Kreuzung von Reihe und Spalte nur einmal
        seen.add(i);
        cleared.push({ r, c, ...state.board[i] });
      };
      rows.forEach(r => { for (let c = 0; c < N; c++) take(r, c); });
      cols.forEach(c => { for (let r = 0; r < N; r++) take(r, c); });
      seen.forEach(i => { state.board[i] = null; });
      const points = lineScore(lines, state.combo);
      state.score += points;
      events.push({ type: 'cleared', rows, cols, lines, cells: cleared, combo: state.combo, points });
      if (state.board.every(c => !c)) {
        state.score += FRESH_SOIL_BONUS;
        events.push({ type: 'boardCleared', points: FRESH_SOIL_BONUS });
      }
    } else {
      state.movesSinceClear += 1;
      if (state.combo > 0 && state.movesSinceClear > COMBO_GRACE) {
        state.combo = 0;
        events.push({ type: 'comboLost' });
      }
    }

    return finishMove(state, events);
  }

  function finishMove(state, events) {
    if (state.tray.every(t => !t)) {
      refill(state);
      events.push({ type: 'trayRefilled' });
    }
    if (stuck(state)) {
      state.over = true;
      events.push({ type: 'gameOver', score: state.score });
    }
    return events;
  }

  // Form aus der Ablage ins Ablagefeld legen; liegt dort schon eine, werden beide getauscht
  function hold(state, slot) {
    const item = state.tray[slot];
    if (state.over || slot === HOLD || !item) return null;
    const swapped = state.hold;
    state.tray[slot] = swapped;
    state.hold = item;
    return finishMove(state, [{ type: 'held', slot, swapped: !!swapped }]);
  }

  // Gespeicherten Lauf prüfen – kaputte oder fremde Daten führen zu einer neuen Runde.
  // Läufe aus v0.1 haben kein Biom: sie gehören zur Wiese.
  function restore(run) {
    if (!run || run.v !== 1 || run.over) return null;
    const biome = run.biome === undefined ? BIOMES[0] : run.biome;
    if (!BIOMES.includes(biome)) return null;
    if (!Array.isArray(run.board) || !SIZES.some(n => n * n === run.board.length)) return null;
    if (!Array.isArray(run.tray) || run.tray.length !== TRAY) return null;
    const pool = Shapes.pool(biome);
    const okItem = it => it === null || (it && pool.includes(Shapes.BY_ID[it.shape]) &&
      Number.isInteger(it.v) && it.v >= 0 && it.v < Shapes.BY_ID[it.shape].variants.length);
    const okCell = c => c === null || (c && Shapes.MATERIALS.includes(c.m) && Number.isInteger(c.p));
    if (run.hold === undefined) run = { ...run, hold: null };   // Spielstände von vor dem Ablagefeld
    if (!run.tray.every(okItem) || !okItem(run.hold) || !run.board.every(okCell)) return null;
    if (![run.score, run.combo, run.movesSinceClear, run.rng, run.nextPid].every(Number.isFinite)) return null;
    const state = JSON.parse(JSON.stringify(run));
    state.biome = biome;
    state.diff = diffOf(run);
    if (state.tray.every(t => !t)) refill(state);
    return state;
  }

  // --- Garten (Meta-Fortschritt über alle Runden, ein Garten je Biom) ----------
  // level zählt die erblühten Gärten des Bioms; jede Stufe bringt die nächste Pflanzenart.

  const newGarden = () => ({ level: 0, plots: new Array(PLOTS).fill(0), total: 0 });

  function restoreGarden(g) {
    if (!g || !Number.isInteger(g.level) || g.level < 0) return null;
    if (!Array.isArray(g.plots) || g.plots.length !== PLOTS) return null;
    if (!g.plots.every(s => Number.isInteger(s) && s >= 0 && s <= STAGES)) return null;
    return { level: g.level, plots: g.plots.slice(), total: Number.isFinite(g.total) ? g.total : 0 };
  }

  // Jede aufgelöste Linie lässt die kleinste Pflanze eine Stufe wachsen.
  function growGarden(garden, lines) {
    const events = [];
    for (let i = 0; i < lines; i++) {
      let idx = 0;
      garden.plots.forEach((s, k) => { if (s < garden.plots[idx]) idx = k; });
      garden.plots[idx] += 1;
      garden.total += 1;
      events.push({ type: 'grow', plot: idx, stage: garden.plots[idx] });
      if (garden.plots.every(s => s >= STAGES)) {
        events.push({ type: 'gardenComplete', level: garden.level });
        garden.level += 1;
        garden.plots = garden.plots.map(() => 0);
      }
    }
    return events;
  }

  // --- Statistik (je Biom + Feldgröße + Schwierigkeit) ------------------------
  // Gezählt werden nur Runden, die mit Game Over enden; gelegte Formen zählen sofort.

  const statKey = (biome, size, diff = 'normal') => `${biome}-${size}-${diff}`;
  const newStat = () => ({ games: 0, tiles: 0, best: 0, worst: null });

  function restoreStat(st) {
    const n = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    if (!st || typeof st !== 'object') return newStat();
    const games = n(st.games);
    return { games, tiles: n(st.tiles), best: n(st.best), worst: games && Number.isFinite(st.worst) ? n(st.worst) : null };
  }

  function statPlaced(stat) { stat.tiles += 1; }

  function statGameOver(stat, score) {
    stat.games += 1;
    stat.best = Math.max(stat.best, score);
    stat.worst = stat.worst === null ? score : Math.min(stat.worst, score);
  }

  // Summe über mehrere Einträge: Spiele/Formen addiert, Rekord = Maximum, Tiefstwert = Minimum
  function statTotals(stats) {
    const t = newStat();
    for (const st of stats) {
      t.games += st.games;
      t.tiles += st.tiles;
      t.best = Math.max(t.best, st.best);
      if (st.worst !== null) t.worst = t.worst === null ? st.worst : Math.min(t.worst, st.worst);
    }
    return t;
  }

  // --- Freischalten der Schwierigkeitsgrade ------------------------------------
  // unlocked = Index der höchsten freien Stufe. Erreicht eine Runde der höchsten freien Stufe
  // UNLOCK_SCORE, wird die nächste frei. Liefert die neu freigeschaltete Stufe oder null.

  function unlockFor(unlocked, diff, score) {
    const i = DIFFS.indexOf(diff);
    if (i < 0 || i !== unlocked || i + 1 >= DIFFS.length || score < UNLOCK_SCORE) return null;
    return DIFFS[i + 1];
  }

  // Aus gespeicherten Rekorden ableiten, was frei sein muss (z. B. nach dem Laden alter Spielstände)
  function unlockedFrom(unlocked, bestByDiff) {
    let u = Number.isInteger(unlocked) ? Math.max(0, Math.min(DIFFS.length - 1, unlocked)) : 0;
    while (u + 1 < DIFFS.length && (bestByDiff[DIFFS[u]] || 0) >= UNLOCK_SCORE) u++;
    return u;
  }

  // --- Zug zurücknehmen -------------------------------------------------------
  // Vor jedem Zug wird der Stand (z. B. Runde + Garten + Statistik) als JSON abgelegt, damit
  // spätere Änderungen am Live-Zustand die gespeicherten Stände nicht verfälschen.

  function pushHistory(history, state, limit = UNDO_LIMIT) {
    history.push(JSON.stringify(state));
    if (history.length > limit) history.splice(0, history.length - limit);
  }

  function popHistory(history) {
    const s = history.pop();
    return s ? JSON.parse(s) : null;
  }

  const peekHistory = (history, i) => (history[i] ? JSON.parse(history[i]) : null);

  // Alle gespeicherten Stände ändern (z. B. neuer Garten nach einem Reset)
  function mapHistory(history, fn) {
    for (let i = 0; i < history.length; i++) history[i] = JSON.stringify(fn(JSON.parse(history[i])));
  }

  return {
    SIZES, DEFAULT_SIZE, BIOMES, TRAY, HOLD, PLOTS, STAGES, UNDO_LIMIT,
    DIFFS, DEFAULT_DIFF, UNLOCK_SCORE, diffOf, weightOf, unlockFor, unlockedFrom,
    sizeOf, pieceOf, itemAt, canPlace, fits, anyMove, stuck, fullLines, previewLines, lineScore,
    newGame, place, hold, refill, restore,
    newGarden, restoreGarden, growGarden,
    statKey, newStat, restoreStat, statPlaced, statGameOver, statTotals,
    pushHistory, popHistory, peekHistory, mapHistory,
  };
});
