// Ausführen: node --test games/spider/tests/logic.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Logic from '../src/logic.js';

const allIds = g => Object.values(g.piles).flat().sort((a, b) => a - b);
// Freie Karte einer Farbe und eines Werts (ids, die noch nicht vergeben sind)
function picker(variant) {
  const used = new Set(), cards = Logic.cardsOf(variant);
  return (suit, rank) => {
    const c = cards.find(x => x.suit === suit && x.rank === rank && !used.has(x.id));
    used.add(c.id);
    return c.id;
  };
}

test('Neues Spiel: 104 Karten, 6/6/6/6/5…, oberste offen, 50 auf dem Stapel', () => {
  for (const v of Logic.VARIANTS) {
    const g = Logic.newGame(v, 42);
    assert.deepEqual(Logic.TABLEAU.map(t => g.piles[t].length), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    for (const t of Logic.TABLEAU) g.piles[t].forEach((c, i, a) => assert.equal(g.up[c], i === a.length - 1 ? 1 : 0));
    assert.equal(g.piles.stock.length, 50);
    assert.equal(Logic.dealsLeft(g), 5);
    assert.deepEqual(allIds(g), [...Array(104).keys()]);
    assert.equal(new Set(Logic.cardsOf(v).map(c => c.suit)).size, Logic.SUIT_COUNT[v]);
  }
  assert.deepEqual(Logic.newGame('s2', 1).piles, Logic.newGame('s2', 1).piles);
});

test('Ablegen: auf einen Wert höher (Farbe egal) oder in eine leere Spalte', () => {
  const c = picker('s2');
  const g = Logic.fromPiles('s2', { t0: [c(0, 7)], t1: [c(1, 8)], t2: [c(0, 9)] }, []);
  for (const t of ['t0', 't1', 't2']) g.up[g.piles[t][0]] = 1;
  assert.deepEqual(Logic.apply(g, ['m', 't0', 0, 't1']), ['tableau']);  // Pik-7 auf Herz-8
  assert.equal(Logic.dropMove(g, 't1', 0, 't2'), null);                   // Herz-8 + Pik-7 sind keine Folge in einer Farbe
  assert.ok(Logic.dropMove(g, 't1', 1, 't3'));                            // die 7 allein in die leere Spalte
});

test('Folgen in einer Farbe bewegen sich gemeinsam', () => {
  const c = picker('s1');
  const run = [c(0, 9), c(0, 8), c(0, 7)];
  const g = Logic.fromPiles('s1', { t0: run, t1: [c(0, 10)] }, [...run]);
  g.up[g.piles.t1[0]] = 1;
  assert.ok(Logic.canDrag(g, 't0', 0));
  assert.deepEqual(Logic.apply(g, ['m', 't0', 0, 't1']), ['tableau']);
  assert.equal(g.piles.t1.length, 4);
});

test('Austeilen: eine Karte je Spalte, nicht bei leerer Spalte', () => {
  const g = Logic.newGame('s1', 9);
  assert.deepEqual(Logic.apply(g, ['d']), ['deal']);
  assert.equal(g.piles.stock.length, 40);
  assert.ok(Logic.TABLEAU.every(t => g.up[g.piles[t][g.piles[t].length - 1]]));
  const gap = Logic.fromPiles('s1', { stock: g.piles.stock.slice(0, 10), t0: [g.piles.stock[10]] }, []);
  assert.equal(Logic.dealBlocked(gap), 'gap');
  assert.equal(Logic.apply(gap, ['d']), null);
  assert.equal(Logic.tapMove(gap, 'stock', 0), null);
  assert.equal(Logic.dealBlocked(Logic.fromPiles('s1', {}, [])), 'empty');
});

test('König bis Ass in einer Farbe wird abgeräumt, die Karte darunter dreht sich um', () => {
  const c = picker('s4');
  const hidden = c(2, 5);
  const run = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(r => c(1, r));
  const ace = c(1, 1);
  const g = Logic.fromPiles('s4', { t0: [hidden, ...run], t1: [ace] }, [...run, ace]);
  assert.deepEqual(Logic.apply(g, ['m', 't1', 0, 't0']), ['tableau', 'complete', 'flip']);
  assert.equal(g.piles.f0[g.piles.f0.length - 1], run[0]);              // König liegt oben
  assert.deepEqual(g.piles.t0, [hidden]);
  assert.equal(g.up[hidden], 1);
  assert.equal(Logic.completed(g), 1);
  assert.ok(!g.won);
});

test('Achte fertige Folge: Sieg', () => {
  const c = picker('s4');
  const seq = suit => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => c(suit, r));
  const piles = {};
  [0, 0, 2, 2, 3, 3, 1].forEach((suit, k) => { piles['f' + k] = seq(suit); });
  const last = seq(1);
  piles.t0 = last.slice(0, 12);
  piles.t1 = last.slice(12);
  const g = Logic.fromPiles('s4', piles, last);
  assert.deepEqual(Logic.apply(g, ['m', 't1', 0, 't0']), ['tableau', 'complete', 'won']);
  assert.ok(g.won);
  assert.equal(Logic.hint(g), null);
  assert.equal(Logic.undo(g), null);
});

test('Antippen: gleiche Farbe vor anderer Farbe, leere Spalte zuletzt', () => {
  const c = picker('s2');
  const g = Logic.fromPiles('s2', { t0: [c(1, 9), c(0, 6)], t1: [c(1, 7)], t2: [c(0, 7)] }, []);
  for (const t of ['t0', 't1', 't2']) for (const id of g.piles[t]) g.up[id] = 1;
  assert.deepEqual(Logic.tapMove(g, 't0', 1), ['m', 't0', 1, 't2']);  // Pik-6 auf Pik-7, nicht Herz-7
  assert.equal(Logic.tapMove(g, 't0', 0), null);                       // Herz-9 + Pik-6 sind keine Folge
});

test('Rückgängig, Speichern und zufällige Partien: Nachspielen ergibt dieselbe Lage, keine Karte geht verloren', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const v = Logic.VARIANTS[seed % 3];
    const g = Logic.newGame(v, seed);
    for (let k = 0; k < 200 && !g.won; k++) {
      const m = Logic.hint(g);
      if (!m || !Logic.apply(g, m)) break;
    }
    assert.deepEqual(allIds(g), [...Array(104).keys()], `seed ${seed}`);
    const back = Logic.restore(JSON.parse(JSON.stringify(Logic.toSave(g))));
    assert.deepEqual(back.piles, g.piles);
    if (g.moves.length && !g.won) {
      const u = Logic.undo(g);
      assert.equal(u.moves.length, g.moves.length - 1);
    }
  }
  assert.equal(Logic.restore({ variant: 's1', seed: 1, moves: [['m', 't0', 0, 'stock']] }), null);
});
