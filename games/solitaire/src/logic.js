// Spiellogik Solitaire (Klondike): pur und deterministisch, kein DOM – läuft im Browser und in Node.
// Gleicher Seed + gleiche Züge = gleiche Partie. Darum genügen zum Speichern Seed und Züge, „Rückgängig“ spielt die
// Züge ohne den letzten nach, und eine Bestzeit lässt sich später auf dem Server nachprüfen (proof: seed + moves).
//
// Stapel (unten → oben): stock (verdeckt), waste (Ablage), f0–f3 (Zielstapel, je Farbe von Ass bis König),
// t0–t6 (Spalten: absteigend, Farben abwechselnd rot/schwarz, auf leere Spalten nur Könige).
// Züge: ['d'] = vom Stapel ziehen (1 oder 3 Karten) bzw. Ablage zurückdrehen, ['m', von, index, nach] = Karten ab
// index verschieben. Eine verdeckte Karte, die oben liegen bleibt, wird beim Zug automatisch umgedreht.
import { makeDeck, shuffle, isRed, cloneLayout, validMove } from '@spielesammlung/cards';

export const VARIANTS = ['draw1', 'draw3'];
export const DEFAULT_VARIANT = 'draw1';
export const FOUNDATIONS = ['f0', 'f1', 'f2', 'f3'];
export const TABLEAU = ['t0', 't1', 't2', 't3', 't4', 't5', 't6'];
export const PILES = ['stock', 'waste', ...FOUNDATIONS, ...TABLEAU];

export const CARDS = makeDeck();
const card = id => CARDS[id];
const top = pile => pile[pile.length - 1];
const isFoundation = p => p[0] === 'f';
const isTableau = p => p[0] === 't';

function fromLayout(variant, seed, layout) {
  const { piles, up } = cloneLayout(layout);
  return {
    variant: VARIANTS.includes(variant) ? variant : DEFAULT_VARIANT, seed: seed >>> 0,
    piles, up, start: cloneLayout(layout),
    moves: [], won: false, elapsed: 0,   // elapsed: gespielte Zeit in ms, führt die Darstellung nach
  };
}

/** Neues Spiel: 28 Karten in sieben Spalten (1 bis 7, oberste offen), der Rest auf den Stapel */
export function newGame(variant, seed) {
  const order = shuffle(CARDS.map(c => c.id), seed >>> 0);
  const piles = Object.fromEntries(PILES.map(p => [p, []]));
  const up = new Array(CARDS.length).fill(0);
  let k = 0;
  for (let row = 0; row < 7; row++) {
    for (let col = row; col < 7; col++) piles[TABLEAU[col]].push(order[k++]);
  }
  for (const t of TABLEAU) up[top(piles[t])] = 1;
  piles.stock = order.slice(k);
  return fromLayout(variant, seed, { piles, up });
}

/** Spiel aus einer vorgegebenen Lage (Tests, Entwickler-Hilfen). Fehlende Stapel sind leer. */
export function fromPiles(variant, piles, up) {
  const all = Object.fromEntries(PILES.map(p => [p, (piles[p] || []).slice()]));
  const u = new Array(CARDS.length).fill(0);
  for (const id of up || []) u[id] = 1;
  const g = fromLayout(variant, 0, { piles: all, up: u });
  g.won = isWon(g);
  return g;
}

export const isWon = g => FOUNDATIONS.every(f => g.piles[f].length === 13);

// --- Regeln -------------------------------------------------------------------------------

function fitsFoundation(g, id, f) {
  const pile = g.piles[f], c = card(id);
  if (!pile.length) return c.rank === 1;
  const t = card(top(pile));
  return t.suit === c.suit && c.rank === t.rank + 1;
}

function fitsTableau(g, id, t) {
  const pile = g.piles[t], c = card(id);
  if (!pile.length) return c.rank === 13;
  const below = top(pile);
  return !!g.up[below] && card(below).rank === c.rank + 1 && isRed(card(below).suit) !== isRed(c.suit);
}

/** Lassen sich die Karten ab index aufnehmen? Ablage und Zielstapel: nur die oberste, Spalten: jede offene. */
export function canDrag(g, from, index) {
  const pile = g.piles[from];
  if (!pile || index < 0 || index >= pile.length || g.won) return false;
  if (from === 'stock') return false;
  if (from === 'waste' || isFoundation(from)) return index === pile.length - 1;
  return !!g.up[pile[index]];
}

function legal(g, [, from, index, to]) {
  if (from === to || !canDrag(g, from, index) || !g.piles[to]) return false;
  const pile = g.piles[from], id = pile[index];
  if (isFoundation(to)) return index === pile.length - 1 && fitsFoundation(g, id, to);
  if (isTableau(to)) return fitsTableau(g, id, to);
  return false;
}

/** Zug ausführen. Liefert Ereignisse (['draw'], ['foundation', 'flip', 'won'] …) oder null, wenn er nicht geht. */
export function apply(g, m) {
  if (g.won || !validMove(m, PILES)) return null;
  const events = [];
  if (m[0] === 'd') {
    const { stock, waste } = g.piles;
    if (stock.length) {
      const n = Math.min(g.variant === 'draw3' ? 3 : 1, stock.length);
      for (let k = 0; k < n; k++) {
        const id = stock.pop();
        g.up[id] = 1;
        waste.push(id);
      }
      events.push('draw');
    } else if (waste.length) {
      while (waste.length) {
        const id = waste.pop();
        g.up[id] = 0;
        stock.push(id);
      }
      events.push('recycle');
    } else return null;
  } else {
    if (!legal(g, m)) return null;
    const [, from, index, to] = m;
    const moving = g.piles[from].splice(index);
    g.piles[to].push(...moving);
    events.push(isFoundation(to) ? 'foundation' : 'tableau');
    const rest = g.piles[from];
    if (isTableau(from) && rest.length && !g.up[top(rest)]) {
      g.up[top(rest)] = 1;
      events.push('flip');
    }
  }
  g.moves.push(m.slice());
  if (isWon(g)) {
    g.won = true;
    events.push('won');
  }
  return events;
}

/** Zug für „Karte dorthin ziehen“, oder null */
export function dropMove(g, from, index, to) {
  const m = ['m', from, index, to];
  return legal(g, m) ? m : null;
}

// Erste passende Spalte; auf leere Spalten nur, wenn das etwas bringt (kein König, der schon ganz unten liegt)
function tableauTarget(g, from, index) {
  const id = g.piles[from][index];
  let empty = null;
  for (const t of TABLEAU) {
    if (t === from || !fitsTableau(g, id, t)) continue;
    if (g.piles[t].length) return t;
    if (empty == null && !(isTableau(from) && index === 0)) empty = t;
  }
  return empty;
}

function foundationTarget(g, id) {
  return FOUNDATIONS.find(f => fitsFoundation(g, id, f)) || null;
}

/** Zug für ein Antippen: Stapel → ziehen; Karte → auf einen Zielstapel, sonst in eine passende Spalte */
export function tapMove(g, pile, index) {
  if (g.won) return null;
  if (pile === 'stock') return g.piles.stock.length || g.piles.waste.length ? ['d'] : null;
  const cards = g.piles[pile];
  if (!cards || !cards.length) return null;
  if (pile === 'waste' || isFoundation(pile)) index = cards.length - 1;
  if (!canDrag(g, pile, index)) return null;
  if (index === cards.length - 1 && !isFoundation(pile)) {
    const f = foundationTarget(g, cards[index]);
    if (f) return ['m', pile, index, f];
  }
  const t = tableauTarget(g, pile, index);
  return t ? ['m', pile, index, t] : null;
}

/**
 * Tipp: der nützlichste Zug. Erst auf Zielstapel, dann Züge, die eine verdeckte Karte freilegen oder eine Spalte
 * leeren, dann aus der Ablage, zuletzt ziehen – aber nur, wenn eine Karte im Stapel überhaupt irgendwo passt.
 * null = keine sinnvollen Züge mehr.
 */
export function hint(g) {
  if (g.won) return null;
  let best = null, bestScore = 0;
  const consider = (m, score) => { if (score > bestScore) { best = m; bestScore = score; } };
  const sources = [];
  if (g.piles.waste.length) sources.push(['waste', g.piles.waste.length - 1]);
  for (const t of TABLEAU) {
    const p = g.piles[t];
    for (let i = 0; i < p.length; i++) if (g.up[p[i]]) { sources.push([t, i]); break; }   // ganze offene Folge
    if (p.length && g.up[top(p)] && g.piles[t].length > 1) sources.push([t, p.length - 1]); // oberste allein (Zielstapel)
  }
  for (const [from, index] of sources) {
    const pile = g.piles[from], id = pile[index];
    if (index === pile.length - 1) {
      const f = foundationTarget(g, id);
      if (f) consider(['m', from, index, f], 100 - card(id).rank);
    }
    for (const t of TABLEAU) {
      if (t === from || !fitsTableau(g, id, t)) continue;
      if (from === 'waste') consider(['m', from, index, t], 50);
      else if (index > 0 && !g.up[pile[index - 1]]) consider(['m', from, index, t], 80);
      else if (index === 0 && card(id).rank !== 13 && g.piles[t].length) consider(['m', from, index, t], 40);
    }
  }
  if (best) return best;
  // Ziehen lohnt nur, wenn eine Karte aus Stapel oder Ablage irgendwo angelegt werden könnte
  const reserve = [...g.piles.stock, ...g.piles.waste];
  const useful = reserve.some(id => foundationTarget(g, id) || TABLEAU.some(t => fitsTableau(g, id, t)));
  return useful ? ['d'] : null;
}

/** Automatisch zu Ende spielen: sobald Stapel und Ablage leer und alle Karten offen sind, die kleinste passende Karte */
export function autoMove(g) {
  if (g.won || g.piles.stock.length || g.piles.waste.length) return null;
  if (TABLEAU.some(t => g.piles[t].some(id => !g.up[id]))) return null;
  let best = null;
  for (const t of TABLEAU) {
    const p = g.piles[t];
    if (!p.length) continue;
    const id = top(p), f = foundationTarget(g, id);
    if (f && (!best || card(id).rank < card(best[1]).rank)) best = [t, id, f];
  }
  return best ? ['m', best[0], g.piles[best[0]].length - 1, best[2]] : null;
}

// --- Speichern und Rückgängig ----------------------------------------------------------------

function replay(variant, seed, start, moves) {
  const g = start ? fromLayout(variant, seed, start) : newGame(variant, seed);
  for (const m of moves) if (!apply(g, m)) return null;
  return g;
}

/** Stand ohne den letzten Zug (null, wenn es keinen gibt) */
export function undo(g) {
  if (!g.moves.length || g.won) return null;
  const back = replay(g.variant, g.seed, g.start, g.moves.slice(0, -1));
  if (back) back.elapsed = g.elapsed;
  return back;
}

/** Was gespeichert wird: Seed, Züge, Zeit */
export const toSave = g => ({ variant: g.variant, seed: g.seed, moves: g.moves, elapsed: Math.round(g.elapsed) });

/** Gespeicherten Lauf nachspielen; kaputte Stände ergeben null */
export function restore(d) {
  if (!d || typeof d !== 'object' || !VARIANTS.includes(d.variant) || !Number.isInteger(d.seed) || !Array.isArray(d.moves)) return null;
  const g = replay(d.variant, d.seed, null, d.moves);
  if (!g) return null;
  g.elapsed = Number.isFinite(d.elapsed) && d.elapsed >= 0 ? d.elapsed : 0;
  return g;
}

/** Karten der Stapel mit offen/verdeckt, für die Darstellung */
export function view(g) {
  const out = {};
  for (const p of PILES) out[p] = g.piles[p].map(id => ({ id, up: !!g.up[id] }));
  return out;
}
