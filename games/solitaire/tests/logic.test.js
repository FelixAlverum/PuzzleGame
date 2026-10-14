// Ausführen: node --test games/solitaire/tests/logic.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Logic from '../src/logic.js';

// Karte über Farbe (0 ♠, 1 ♥, 2 ♦, 3 ♣) und Wert (1..13)
const id = (suit, rank) => Logic.CARDS.find(c => c.suit === suit && c.rank === rank).id;
const allIds = g => Object.values(g.piles).flat().sort((a, b) => a - b);

test('Neues Spiel: 1 bis 7 Karten je Spalte, oberste offen, 24 auf dem Stapel, deterministisch', () => {
  const g = Logic.newGame('draw1', 123);
  Logic.TABLEAU.forEach((t, k) => {
    assert.equal(g.piles[t].length, k + 1);
    g.piles[t].forEach((c, i) => assert.equal(g.up[c], i === k ? 1 : 0));
  });
  assert.equal(g.piles.stock.length, 24);
  assert.deepEqual(allIds(g), [...Array(52).keys()]);
  assert.deepEqual(Logic.newGame('draw1', 123).piles, g.piles);
  assert.notDeepEqual(Logic.newGame('draw1', 124).piles, g.piles);
});

test('Ziehen: 1 oder 3 Karten offen auf die Ablage, leerer Stapel dreht die Ablage zurück', () => {
  for (const [variant, n] of [['draw1', 1], ['draw3', 3]]) {
    const g = Logic.newGame(variant, 5);
    assert.deepEqual(Logic.apply(g, ['d']), ['draw']);
    assert.equal(g.piles.waste.length, n);
    assert.ok(g.piles.waste.every(c => g.up[c]));
    while (g.piles.stock.length) Logic.apply(g, ['d']);
    assert.equal(g.piles.waste.length, 24);
    assert.deepEqual(Logic.apply(g, ['d']), ['recycle']);
    assert.equal(g.piles.stock.length, 24);
    assert.ok(g.piles.stock.every(c => !g.up[c]));
  }
  const empty = Logic.fromPiles('draw1', {}, []);
  assert.equal(Logic.apply(empty, ['d']), null);
});

test('Zielstapel: erst das Ass, dann aufsteigend in derselben Farbe', () => {
  const g = Logic.fromPiles('draw1', { t0: [id(1, 1)], t1: [id(1, 2)], t2: [id(2, 2)] }, [id(1, 1), id(1, 2), id(2, 2)]);
  assert.equal(Logic.dropMove(g, 't1', 0, 'f0'), null);          // 2 nicht auf leeren Zielstapel
  assert.deepEqual(Logic.apply(g, ['m', 't0', 0, 'f0']), ['foundation']);
  assert.equal(Logic.dropMove(g, 't2', 0, 'f0'), null);          // Karo-2 nicht auf Herz-Ass
  assert.ok(Logic.apply(g, ['m', 't1', 0, 'f0']));
  assert.deepEqual(g.piles.f0, [id(1, 1), id(1, 2)]);
});

test('Spalten: absteigend und rot/schwarz im Wechsel, König in leere Spalte, verdeckte Karte dreht sich um', () => {
  const hidden = id(0, 5);
  const g = Logic.fromPiles('draw1', {
    t0: [hidden, id(1, 9)],      // verdeckte Pik-5, darauf Herz-9
    t1: [id(0, 10)],             // Pik-10
    t2: [id(3, 10)],             // Kreuz-10
    t3: [id(1, 10)],             // Herz-10
    t4: [id(0, 13)],             // Pik-König
    t5: [id(2, 4), id(2, 13)],   // verdeckte Karo-4, darauf Karo-König
  }, [id(1, 9), id(0, 10), id(3, 10), id(1, 10), id(0, 13), id(2, 13)]);
  assert.equal(Logic.dropMove(g, 't0', 1, 't3'), null);          // rot auf rot
  assert.equal(Logic.dropMove(g, 't0', 0, 't1'), null);          // verdeckte Karte lässt sich nicht nehmen
  assert.deepEqual(Logic.apply(g, ['m', 't0', 1, 't1']), ['tableau', 'flip']);
  assert.equal(g.up[hidden], 1);
  assert.equal(Logic.dropMove(g, 't1', 0, 't0'), null);          // Pik-10 nicht auf Pik-5
  assert.equal(Logic.dropMove(g, 't1', 0, 't2'), null);          // Folge 10–9 nicht auf eine 10
  const g2 = Logic.fromPiles('draw1', { t0: [id(0, 12)], t5: [id(2, 4), id(2, 13)] }, [id(0, 12), id(2, 13)]);
  assert.equal(Logic.dropMove(g2, 't0', 0, 't1'), null);         // Dame nicht in leere Spalte
  assert.deepEqual(Logic.apply(g2, ['m', 't5', 1, 't1']), ['tableau', 'flip']);
  assert.ok(Logic.apply(g2, ['m', 't0', 0, 't1']));               // Pik-Dame auf Karo-König
});

test('Antippen: Ass auf den Zielstapel, Stapel zieht, sonst eine passende Spalte', () => {
  const g = Logic.fromPiles('draw1', {
    stock: [id(3, 7)], t0: [id(0, 1)], t1: [id(1, 8)],
  }, [id(0, 1), id(1, 8)]);
  assert.deepEqual(Logic.tapMove(g, 't0', 0), ['m', 't0', 0, 'f0']);
  assert.deepEqual(Logic.tapMove(g, 'stock', -1), ['d']);
  Logic.apply(g, ['d']);
  assert.deepEqual(Logic.tapMove(g, 'waste', 0), ['m', 'waste', 0, 't1']);   // Kreuz-7 auf Herz-8
  assert.equal(Logic.tapMove(g, 't1', 0), null);                              // Herz-8: nichts passt
});

test('Rückgängig und Speichern: Nachspielen ergibt dieselbe Lage', () => {
  const g = Logic.newGame('draw3', 99);
  for (let k = 0; k < 60; k++) {
    const m = Logic.hint(g) || ['d'];
    if (!Logic.apply(g, m)) break;
  }
  const back = Logic.undo(g);
  assert.equal(back.moves.length, g.moves.length - 1);
  const again = Logic.restore(JSON.parse(JSON.stringify(Logic.toSave(back))));
  assert.deepEqual(again.piles, back.piles);
  assert.deepEqual(again.up, back.up);
  assert.equal(Logic.restore({ ...Logic.toSave(g), moves: [['m', 't0', 0, 'f9']] }), null);
  assert.equal(Logic.restore({ ...Logic.toSave(g), variant: 'draw7' }), null);
  assert.equal(Logic.restore(null), null);
  assert.equal(Logic.undo(Logic.newGame('draw1', 1)), null);
});

test('Zuendespielen: wenn alles offen und der Stapel leer ist, landet alles auf den Zielstapeln', () => {
  // Fast fertig: je Farbe Ass bis 9 abgelegt, 10 bis König liegen offen in den Spalten
  const piles = {}, up = [];
  for (let s = 0; s < 4; s++) piles['f' + s] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => id(s, r));
  piles.t0 = [id(0, 13), id(1, 12), id(0, 11), id(1, 10)];
  piles.t1 = [id(1, 13), id(0, 12), id(1, 11), id(0, 10)];
  piles.t2 = [id(2, 13), id(3, 12), id(2, 11), id(3, 10)];
  piles.t3 = [id(3, 13), id(2, 12), id(3, 11), id(2, 10)];
  for (const p of Object.values(piles)) up.push(...p);
  const g = Logic.fromPiles('draw1', piles, up);
  let m, steps = 0, last = null;
  while ((m = Logic.autoMove(g))) { last = Logic.apply(g, m); steps++; }
  assert.equal(steps, 16);
  assert.ok(g.won);
  assert.ok(last.includes('won'));
  assert.equal(Logic.apply(g, ['d']), null);
});

test('Zuendespielen nicht, solange Karten verdeckt sind oder der Stapel noch Karten hat', () => {
  const g = Logic.newGame('draw1', 3);
  assert.equal(Logic.autoMove(g), null);
});

test('Tipp: Zielstapel zuerst; ohne jede Möglichkeit null', () => {
  const g = Logic.fromPiles('draw1', { t0: [id(1, 5), id(0, 1)], t1: [id(3, 9)] }, [id(0, 1), id(3, 9)]);
  assert.deepEqual(Logic.hint(g), ['m', 't0', 1, 'f0']);
  const stuck = Logic.fromPiles('draw1', { stock: [id(1, 5)], t0: [id(3, 9)] }, [id(3, 9)]);
  assert.equal(Logic.hint(stuck), null);                          // Herz-5 passt nirgends: Ziehen bringt nichts
  const useful = Logic.fromPiles('draw1', { stock: [id(1, 8)], t0: [id(3, 9)] }, [id(3, 9)]);
  assert.deepEqual(Logic.hint(useful), ['d']);
});

test('Zufällige Partien: keine Karte geht verloren, Speichern und Laden passen immer', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = Logic.newGame(seed % 2 ? 'draw1' : 'draw3', seed);
    for (let k = 0; k < 150 && !g.won; k++) {
      const m = Logic.hint(g);
      if (!m || !Logic.apply(g, m)) break;
    }
    assert.deepEqual(allIds(g), [...Array(52).keys()], `seed ${seed}`);
    const back = Logic.restore(Logic.toSave(g));
    assert.deepEqual(back.piles, g.piles);
  }
});
