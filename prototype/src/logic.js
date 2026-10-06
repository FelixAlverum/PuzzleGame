// Spiellogik: pur und deterministisch, kein DOM. Jeder Zug liefert eine Liste von Events,
// auf die Darstellung, Animation und Sound reagieren (siehe Vault: 03 Technik/Architektur).
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./shapes.js') : root.Shapes);
  if (isNode) module.exports = api;
  else root.Logic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Shapes) {
  'use strict';

  const N = 8;
  const TRAY = 3;
  const BIG = 7;                 // ab dieser Zellenzahl gilt eine Form als „groß“
  const COMBO_GRACE = 2;         // Züge ohne Auflösung, die eine Combo überlebt
  const FRESH_SOIL_BONUS = 300;  // Feld komplett leer geräumt
  const PLOTS = 5;               // Beete im Garten
  const STAGES = 5;              // 0 = Saat … 5 = Blüte
  const THEMES = 3;              // Wiese, Teich, Tropen – wechseln mit jedem erblühten Garten
  const UNDO_LIMIT = 100;        // so viele Züge lassen sich zurücknehmen

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

  function canPlace(board, piece, r0, c0) {
    for (const p of piece.cells) {
      const r = r0 + p.r, c = c0 + p.c;
      if (r < 0 || c < 0 || r >= N || c >= N || board[r * N + c]) return false;
    }
    return true;
  }

  function fits(board, piece) {
    for (let r = 0; r <= N - piece.h; r++) {
      for (let c = 0; c <= N - piece.w; c++) if (canPlace(board, piece, r, c)) return true;
    }
    return false;
  }

  const anyMove = state => state.tray.some(it => it && fits(state.board, pieceOf(it)));

  function fullLines(board) {
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
    const b = board.slice();
    for (const p of piece.cells) b[(r0 + p.r) * N + c0 + p.c] = 1;
    return fullLines(b);
  }

  function lineScore(lines, combo) {
    const base = 10 * lines * (lines + 1) / 2;
    return Math.round(base * (1 + 0.5 * (combo - 1)));
  }

  // --- Formen-Generator -------------------------------------------------------

  function weightOf(shape, score, fill) {
    let w = shape.weight;
    if (shape.size <= 3 && fill > 0.6) w *= 2;                    // Gnade bei vollem Feld
    if (shape.size >= 6) w *= 1 + Math.min(score / 4000, 1) * 0.6; // wird langsam schwerer
    return w;
  }

  function drawItem(state, fill, allowBig) {
    const pool = Shapes.SHAPES.filter(s => allowBig || s.size < BIG);
    const weights = pool.map(s => weightOf(s, state.score, fill));
    let x = rand(state) * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < pool.length - 1 && x >= weights[i]) { x -= weights[i]; i++; }
    return { shape: pool[i].id, v: Math.floor(rand(state) * pool[i].variants.length) };
  }

  function refill(state) {
    const fill = state.board.filter(Boolean).length / (N * N);
    for (let attempt = 0; attempt < 20; attempt++) {
      let big = 0;
      state.tray = [];
      for (let k = 0; k < TRAY; k++) {
        const item = drawItem(state, fill, big === 0);
        if (Shapes.BY_ID[item.shape].size >= BIG) big++;
        state.tray.push(item);
      }
      if (anyMove(state)) return;
    }
    // Notfall: kleinste passende Form erzwingen, damit nie direkt nach dem Nachfüllen Schluss ist
    const bySize = Shapes.SHAPES.slice().sort((a, b) => a.size - b.size);
    for (const s of bySize) {
      for (let v = 0; v < s.variants.length; v++) {
        const item = { shape: s.id, v };
        if (fits(state.board, pieceOf(item))) { state.tray[0] = item; return; }
      }
    }
  }

  // --- Spielablauf ------------------------------------------------------------

  function newGame(seed) {
    const state = {
      v: 1, board: new Array(N * N).fill(null), tray: [], score: 0, combo: 0,
      movesSinceClear: 0, rng: seed >>> 0, nextPid: 1, over: false,
    };
    refill(state);
    return state;
  }

  function place(state, slot, r0, c0) {
    const item = state.tray[slot];
    if (state.over || !item) return null;
    const piece = pieceOf(item);
    if (!canPlace(state.board, piece, r0, c0)) return null;

    const events = [];
    const pid = state.nextPid++;
    const cells = piece.cells.map(p => {
      const r = r0 + p.r, c = c0 + p.c;
      const cell = { m: piece.mat, p: pid, a: p.a ? piece.accent : 0 };
      state.board[r * N + c] = cell;
      return { r, c, ...cell };
    });
    state.tray[slot] = null;
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

    if (state.tray.every(t => !t)) {
      refill(state);
      events.push({ type: 'trayRefilled' });
    }
    if (!anyMove(state)) {
      state.over = true;
      events.push({ type: 'gameOver', score: state.score });
    }
    return events;
  }

  // Gespeicherten Lauf prüfen – kaputte oder fremde Daten führen zu einer neuen Runde
  function restore(run) {
    if (!run || run.v !== 1 || run.over) return null;
    if (!Array.isArray(run.board) || run.board.length !== N * N) return null;
    if (!Array.isArray(run.tray) || run.tray.length !== TRAY) return null;
    const okItem = it => it === null || (it && Shapes.BY_ID[it.shape] &&
      Number.isInteger(it.v) && it.v >= 0 && it.v < Shapes.BY_ID[it.shape].variants.length);
    const okCell = c => c === null || (c && Shapes.MATERIALS.includes(c.m) && Number.isInteger(c.p));
    if (!run.tray.every(okItem) || !run.board.every(okCell)) return null;
    if (![run.score, run.combo, run.movesSinceClear, run.rng, run.nextPid].every(Number.isFinite)) return null;
    const state = JSON.parse(JSON.stringify(run));
    if (state.tray.every(t => !t)) refill(state);
    return state;
  }

  // --- Garten (Meta-Fortschritt über alle Runden) -----------------------------

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

  // Garten-Stufe → Thema und Pflanzenart darin: erst alle Themen reihum, dann die nächste Art
  const gardenStyle = level => ({ theme: level % THEMES, species: Math.floor(level / THEMES) });

  // --- Zug zurücknehmen -------------------------------------------------------
  // Vor jedem Zug wird der Stand (Runde + Garten) als JSON abgelegt, damit spätere
  // Änderungen am Live-Zustand die gespeicherten Stände nicht verfälschen.

  function pushHistory(history, game, garden, limit = UNDO_LIMIT) {
    history.push(JSON.stringify({ game, garden }));
    if (history.length > limit) history.splice(0, history.length - limit);
  }

  function popHistory(history) {
    const s = history.pop();
    return s ? JSON.parse(s) : null;
  }

  return {
    N, TRAY, PLOTS, STAGES, THEMES, UNDO_LIMIT,
    pieceOf, canPlace, fits, anyMove, fullLines, previewLines, lineScore,
    newGame, place, refill, restore,
    newGarden, restoreGarden, growGarden, gardenStyle,
    pushHistory, popHistory,
  };
});
