// Spiellogik Spider Solitaire: pur und deterministisch, kein DOM – läuft im Browser und in Node.
// Gleicher Seed + gleiche Züge = gleiche Partie: gespeichert werden nur Seed und Züge, „Rückgängig“ spielt nach,
// eine Bestzeit lässt sich später auf dem Server prüfen (proof: seed + moves).
//
// 104 Karten (zwei Decks) in 1, 2 oder 4 Farben. Stapel: stock (50 Karten = 5 Runden à 10), f0–f7 (fertige Folgen),
// t0–t9 (Spalten: 6, 6, 6, 6, 5, 5, 5, 5, 5, 5 Karten, oberste offen).
// Regeln: Eine Karte darf auf jede Karte, die genau einen Wert höher ist (Farbe egal), oder in eine leere Spalte.
// Mehrere Karten bewegen sich nur zusammen, wenn sie eine absteigende Folge in derselben Farbe bilden.
// Liegt in einer Spalte König bis Ass in einer Farbe, wandert die Folge von selbst auf einen Zielstapel.
// Eine neue Runde ['d'] legt auf jede Spalte eine Karte – nur, wenn keine Spalte leer ist.
// Züge: ['d'] = Runde austeilen, ['m', von, index, nach] = Karten ab index verschieben.
import { makeDeck, shuffle, cloneLayout, validMove } from '@spielesammlung/cards';

export const VARIANTS = ['s1', 's2', 's4'];
export const DEFAULT_VARIANT = 's1';
export const SUIT_COUNT = { s1: 1, s2: 2, s4: 4 };
export const FOUNDATIONS = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
export const TABLEAU = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9'];
export const PILES = ['stock', ...FOUNDATIONS, ...TABLEAU];

const DECKS = Object.fromEntries(VARIANTS.map(v => [v, makeDeck({ decks: 2, suits: SUIT_COUNT[v] })]));
/** Karten einer Variante: 104 Stück, ids 0..103 */
export const cardsOf = variant => DECKS[variant] || DECKS[DEFAULT_VARIANT];
const top = pile => pile[pile.length - 1];
const isTableau = p => p[0] === 't';

function fromLayout(variant, seed, layout) {
  const { piles, up } = cloneLayout(layout);
  const v = VARIANTS.includes(variant) ? variant : DEFAULT_VARIANT;
  return { variant: v, cards: cardsOf(v), seed: seed >>> 0, piles, up, start: cloneLayout(layout), moves: [], won: false, elapsed: 0 };
}

export function newGame(variant, seed) {
  const cards = cardsOf(variant);
  const order = shuffle(cards.map(c => c.id), seed >>> 0);
  const piles = Object.fromEntries(PILES.map(p => [p, []]));
  const up = new Array(cards.length).fill(0);
  let k = 0;
  for (let n = 0; n < 54; n++) piles[TABLEAU[n % 10]].push(order[k++]);
  for (const t of TABLEAU) up[top(piles[t])] = 1;
  piles.stock = order.slice(k);
  return fromLayout(variant, seed, { piles, up });
}

/** Spiel aus einer vorgegebenen Lage (Tests, Entwickler-Hilfen). Fehlende Stapel sind leer. */
export function fromPiles(variant, piles, up) {
  const all = Object.fromEntries(PILES.map(p => [p, (piles[p] || []).slice()]));
  const u = new Array(cardsOf(variant).length).fill(0);
  for (const id of up || []) u[id] = 1;
  const g = fromLayout(variant, 0, { piles: all, up: u });
  g.won = isWon(g);
  return g;
}

export const isWon = g => FOUNDATIONS.every(f => g.piles[f].length === 13);
export const dealsLeft = g => Math.floor(g.piles.stock.length / 10);
export const completed = g => FOUNDATIONS.filter(f => g.piles[f].length).length;

// --- Regeln -------------------------------------------------------------------------------

/** Karten ab index bilden eine absteigende, offene Folge in einer Farbe */
function isRun(g, pile, index) {
  for (let i = index; i < pile.length; i++) {
    if (!g.up[pile[i]]) return false;
    if (i > index) {
      const a = g.cards[pile[i - 1]], b = g.cards[pile[i]];
      if (a.suit !== b.suit || a.rank !== b.rank + 1) return false;
    }
  }
  return true;
}

export function canDrag(g, from, index) {
  const pile = g.piles[from];
  if (!pile || !isTableau(from) || g.won || index < 0 || index >= pile.length) return false;
  return isRun(g, pile, index);
}

function fits(g, id, to) {
  const pile = g.piles[to];
  if (!pile.length) return true;
  return g.cards[top(pile)].rank === g.cards[id].rank + 1;
}

function legal(g, [, from, index, to]) {
  return from !== to && isTableau(to) && canDrag(g, from, index) && fits(g, g.piles[from][index], to);
}

/** Gründe, warum gerade nicht ausgeteilt werden kann: 'empty' (Stapel leer), 'gap' (leere Spalte), sonst null */
export function dealBlocked(g) {
  if (!g.piles.stock.length) return 'empty';
  if (TABLEAU.some(t => !g.piles[t].length)) return 'gap';
  return null;
}

function flipTop(g, t, events) {
  const p = g.piles[t];
  if (p.length && !g.up[top(p)]) {
    g.up[top(p)] = 1;
    events.push('flip');
  }
}

// König bis Ass in einer Farbe am Ende der Spalte → auf den nächsten freien Zielstapel (König liegt dort oben)
function collect(g, t, events) {
  const p = g.piles[t];
  if (p.length < 13) return;
  const from = p.length - 13;
  if (g.cards[p[from]].rank !== 13 || !isRun(g, p, from)) return;
  const f = FOUNDATIONS.find(x => !g.piles[x].length);
  if (!f) return;
  g.piles[f] = p.splice(from).reverse();
  events.push('complete');
  flipTop(g, t, events);
}

/** Zug ausführen. Liefert Ereignisse (['deal'], ['tableau', 'flip', 'complete', 'won'] …) oder null. */
export function apply(g, m) {
  if (g.won || !validMove(m, PILES)) return null;
  const events = [];
  if (m[0] === 'd') {
    if (dealBlocked(g)) return null;
    for (const t of TABLEAU) {
      const id = g.piles.stock.pop();
      g.up[id] = 1;
      g.piles[t].push(id);
    }
    events.push('deal');
    for (const t of TABLEAU) collect(g, t, events);
  } else {
    if (!legal(g, m)) return null;
    const [, from, index, to] = m;
    g.piles[to].push(...g.piles[from].splice(index));
    events.push('tableau');
    flipTop(g, from, events);
    collect(g, to, events);
  }
  g.moves.push(m.slice());
  if (isWon(g)) {
    g.won = true;
    events.push('won');
  }
  return events;
}

export function dropMove(g, from, index, to) {
  const m = ['m', from, index, to];
  return legal(g, m) ? m : null;
}

// Bestes Ziel für eine Folge: gleiche Farbe vor anderer Farbe, leere Spalte zuletzt (und nur, wenn die Folge
// nicht schon die ganze Spalte ist)
function bestTarget(g, from, index) {
  const id = g.piles[from][index], suit = g.cards[id].suit;
  let other = null, empty = null;
  for (const t of TABLEAU) {
    if (t === from || !fits(g, id, t)) continue;
    const p = g.piles[t];
    if (!p.length) { if (empty == null && index > 0) empty = t; continue; }
    if (g.cards[top(p)].suit === suit) return t;
    if (other == null) other = t;
  }
  return other || empty;
}

/** Zug für ein Antippen: Stapel → austeilen; Karte → die Folge ab dort an die beste Stelle */
export function tapMove(g, pile, index) {
  if (g.won) return null;
  if (pile === 'stock') return dealBlocked(g) ? null : ['d'];
  if (!canDrag(g, pile, index)) return null;
  const t = bestTarget(g, pile, index);
  return t ? ['m', pile, index, t] : null;
}

/**
 * Tipp: Folgen in gleicher Farbe verlängern, verdeckte Karten freilegen, sonst irgendein Zug, der nicht nur
 * hin- und herschiebt; zuletzt austeilen. null = nichts mehr zu tun.
 */
export function hint(g) {
  if (g.won) return null;
  let best = null, bestScore = 0;
  for (const from of TABLEAU) {
    const p = g.piles[from];
    // Nur die längste bewegliche Folge jeder Spalte (kleinerer Teil wäre derselbe Zug in kürzer)
    let index = p.length - 1;
    if (index < 0) continue;
    while (index > 0 && isRun(g, p, index - 1)) index--;
    for (let i = index; i < p.length; i++) {
      const id = p[i];
      for (const to of TABLEAU) {
        if (to === from || !fits(g, id, to) || !g.piles[to].length) continue;
        const same = g.cards[top(g.piles[to])].suit === g.cards[id].suit;
        const below = i > 0 ? p[i - 1] : null;
        // Was bleibt liegen? Verdeckte Karte → freilegen; gleiche Farbe darunter, die schon passt → sinnlos
        const reveals = below != null && !g.up[below];
        const breaks = below != null && g.up[below] && g.cards[below].rank === g.cards[id].rank + 1 && g.cards[below].suit === g.cards[id].suit;
        if (breaks) continue;
        const sitsWell = below != null && g.up[below] && g.cards[below].rank === g.cards[id].rank + 1;
        if (sitsWell && !same) continue;
        let score = (same ? 60 : 20) + (reveals ? 30 : 0) + (below == null ? 15 : 0) + (p.length - i);
        if (score > bestScore) { best = ['m', from, i, to]; bestScore = score; }
      }
    }
  }
  if (best) return best;
  // Leere Spalte nutzen, wenn eine Spalte darunter verdeckte Karten hat
  for (const from of TABLEAU) {
    const p = g.piles[from];
    if (p.length < 2) continue;
    let index = p.length - 1;
    while (index > 0 && isRun(g, p, index - 1)) index--;
    if (index > 0 && !g.up[p[index - 1]]) {
      const to = TABLEAU.find(t => !g.piles[t].length);
      if (to) return ['m', from, index, to];
    }
  }
  return dealBlocked(g) ? null : ['d'];
}

/** Spider spielt nicht von selbst zu Ende: fertige Folgen räumt schon apply() ab */
export const autoMove = () => null;

// --- Speichern und Rückgängig ----------------------------------------------------------------

function replay(variant, seed, start, moves) {
  const g = start ? fromLayout(variant, seed, start) : newGame(variant, seed);
  for (const m of moves) if (!apply(g, m)) return null;
  return g;
}

export function undo(g) {
  if (!g.moves.length || g.won) return null;
  const back = replay(g.variant, g.seed, g.start, g.moves.slice(0, -1));
  if (back) back.elapsed = g.elapsed;
  return back;
}

export const toSave = g => ({ variant: g.variant, seed: g.seed, moves: g.moves, elapsed: Math.round(g.elapsed) });

export function restore(d) {
  if (!d || typeof d !== 'object' || !VARIANTS.includes(d.variant) || !Number.isInteger(d.seed) || !Array.isArray(d.moves)) return null;
  const g = replay(d.variant, d.seed, null, d.moves);
  if (!g) return null;
  g.elapsed = Number.isFinite(d.elapsed) && d.elapsed >= 0 ? d.elapsed : 0;
  return g;
}

export function view(g) {
  const out = {};
  for (const p of PILES) out[p] = g.piles[p].map(id => ({ id, up: !!g.up[id] }));
  return out;
}
