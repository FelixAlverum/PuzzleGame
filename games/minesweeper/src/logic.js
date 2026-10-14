// Spiellogik Minesweeper: pur und deterministisch, kein DOM – läuft im Browser und in Node.
// Die Minen werden erst beim ersten Aufdecken gelegt, nie auf das erste Feld und seine Nachbarn:
// Der erste Klick öffnet immer eine Fläche. Gleicher Seed + gleiche Züge = gleiche Partie,
// darum lässt sich ein Ergebnis später auf dem Server nachspielen (game.moves).

export const LEVELS = {
  beginner: { w: 9, h: 9, mines: 10 },
  intermediate: { w: 16, h: 16, mines: 40 },
  expert: { w: 30, h: 16, mines: 99 },
};
export const LEVEL_IDS = Object.keys(LEVELS);
export const DEFAULT_LEVEL = 'beginner';

// Eigenes Feld: Größe und Minenzahl frei, aber mindestens 9 Felder ohne Mine (erster Klick + Nachbarn)
export const CUSTOM = 'custom';
export const CUSTOM_LIMITS = { w: [5, 40], h: [5, 30], mines: [1] };
export const maxMines = (w, h) => w * h - 9;
const clampInt = (v, lo, hi, dflt) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : dflt);

/** Gültige Maße für ein eigenes Feld; ungültige Werte werden in die Grenzen gezogen */
export function customSize(s) {
  const o = s && typeof s === 'object' ? s : {};
  const w = clampInt(o.w, ...CUSTOM_LIMITS.w, 20), h = clampInt(o.h, ...CUSTOM_LIMITS.h, 12);
  return { w, h, mines: clampInt(o.mines, 1, maxMines(w, h), Math.round(w * h * 0.16)) };
}

const sizeOf = (level, custom) => (level === CUSTOM ? customSize(custom) : LEVELS[level] || LEVELS[DEFAULT_LEVEL]);
const validLevel = level => level === CUSTOM || !!LEVELS[level];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Felder: mine 0/1, open 0/1, flag 0/1 als flache Listen (Index = r * w + c), gut zu speichern.
// custom: Maße { w, h, mines } für die Stufe 'custom'
export function newGame(level, seed, custom) {
  const L = sizeOf(level, custom);
  const n = L.w * L.h;
  return {
    level: validLevel(level) ? level : DEFAULT_LEVEL,
    w: L.w, h: L.h, mines: L.mines, seed: seed >>> 0,
    mine: new Array(n).fill(0), open: new Array(n).fill(0), flag: new Array(n).fill(0),
    started: false, over: false, won: false, exploded: -1,
    opened: 0, flags: 0, elapsed: 0,   // elapsed: gespielte Zeit in ms, führt die Darstellung nach
    moves: [],                         // ['r' | 'f' | 'c', index] – Beweis für die Rangliste
  };
}

export function neighbors(g, i) {
  const r = Math.floor(i / g.w), c = i % g.w, out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < g.h && cc >= 0 && cc < g.w) out.push(rr * g.w + cc);
    }
  }
  return out;
}

export const adjacent = (g, i) => neighbors(g, i).reduce((s, j) => s + g.mine[j], 0);
export const minesLeft = g => g.mines - g.flags;

// Minen legen: alle Felder außer dem ersten Klick und seinen Nachbarn, gemischt mit dem Seed
function plant(g, first) {
  const safe = new Set([first, ...neighbors(g, first)]);
  const pool = [];
  for (let i = 0; i < g.w * g.h; i++) if (!safe.has(i)) pool.push(i);
  const rnd = mulberry32(g.seed);
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  for (let k = 0; k < g.mines; k++) g.mine[pool[k]] = 1;
  g.started = true;
}

// Fläche aufdecken (Nullen breiten sich aus). Liefert die neu geöffneten Felder.
function flood(g, start) {
  const opened = [], stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (g.open[i] || g.flag[i]) continue;
    g.open[i] = 1;
    g.opened++;
    opened.push(i);
    if (!g.mine[i] && adjacent(g, i) === 0) for (const j of neighbors(g, i)) if (!g.open[j]) stack.push(j);
  }
  return opened;
}

function finish(g, events) {
  if (g.over) return events;
  if (g.opened === g.w * g.h - g.mines) {
    g.over = true;
    g.won = true;
    for (let i = 0; i < g.mine.length; i++) {   // beim Sieg alle Minen markieren
      if (g.mine[i] && !g.flag[i]) { g.flag[i] = 1; g.flags++; }
    }
    events.push({ type: 'won' });
  }
  return events;
}

function openCells(g, cells) {
  const events = [];
  const opened = [];
  for (const i of cells) {
    if (g.open[i] || g.flag[i]) continue;
    if (g.mine[i]) {
      g.open[i] = 1;
      g.over = true;
      g.exploded = i;
      events.push({ type: 'revealed', cells: opened }, { type: 'exploded', index: i });
      return events;
    }
    opened.push(...flood(g, i));
  }
  if (opened.length) events.push({ type: 'revealed', cells: opened });
  return finish(g, events);
}

// Feld aufdecken. null = nichts passiert (offen, Flagge, Spiel vorbei).
export function reveal(g, i) {
  if (g.over || g.open[i] || g.flag[i]) return null;
  if (!g.started) plant(g, i);
  g.moves.push(['r', i]);
  return openCells(g, [i]);
}

// Flagge setzen oder entfernen
export function toggleFlag(g, i) {
  if (g.over || g.open[i]) return null;
  g.flag[i] = g.flag[i] ? 0 : 1;
  g.flags += g.flag[i] ? 1 : -1;
  g.moves.push(['f', i]);
  return [{ type: 'flagged', index: i, on: !!g.flag[i] }];
}

// Auf eine offene Zahl: Stehen ringsum genauso viele Flaggen, werden die übrigen Nachbarn aufgedeckt
export function chord(g, i) {
  if (g.over || !g.open[i]) return null;
  const around = neighbors(g, i);
  const n = adjacent(g, i);
  if (!n || around.filter(j => g.flag[j]).length !== n) return null;
  const targets = around.filter(j => !g.open[j] && !g.flag[j]);
  if (!targets.length) return null;
  g.moves.push(['c', i]);
  return openCells(g, targets);
}

// Gespeicherten Stand prüfen; kaputte oder unpassende Stände ergeben null
export function restore(d) {
  if (!d || typeof d !== 'object' || !validLevel(d.level)) return null;
  const L = sizeOf(d.level, d), n = L.w * L.h;
  const bits = a => Array.isArray(a) && a.length === n && a.every(v => v === 0 || v === 1);
  if (d.w !== L.w || d.h !== L.h || d.mines !== L.mines || !bits(d.mine) || !bits(d.open) || !bits(d.flag)) return null;
  const g = newGame(d.level, d.seed, L);
  Object.assign(g, {
    mine: d.mine.slice(), open: d.open.slice(), flag: d.flag.slice(),
    started: !!d.started, over: !!d.over, won: !!d.won,
    exploded: Number.isInteger(d.exploded) ? d.exploded : -1,
    elapsed: Number.isFinite(d.elapsed) && d.elapsed >= 0 ? d.elapsed : 0,
    moves: Array.isArray(d.moves) ? d.moves.slice() : [],
  });
  g.opened = g.open.reduce((s, v, i) => s + (v && !g.mine[i] ? 1 : 0), 0);
  g.flags = g.flag.reduce((s, v) => s + v, 0);
  return g;
}

// Statistik je Stufe: Spiele (nur beendete), Siege, Bestzeit in ms
export const newStat = () => ({ played: 0, won: 0, best: null });

export function restoreStat(s) {
  const st = newStat();
  if (!s || typeof s !== 'object') return st;
  if (Number.isInteger(s.played) && s.played >= 0) st.played = s.played;
  if (Number.isInteger(s.won) && s.won >= 0) st.won = Math.min(s.won, st.played);
  if (Number.isFinite(s.best) && s.best > 0) st.best = s.best;
  return st;
}

// Ergebnis eintragen; true, wenn es eine neue Bestzeit ist
export function recordResult(stat, game) {
  stat.played++;
  if (!game.won) return false;
  stat.won++;
  const better = stat.best == null || game.elapsed < stat.best;
  if (better) stat.best = game.elapsed;
  return better;
}
