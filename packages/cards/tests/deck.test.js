// Ausführen: node --test packages/cards/tests/deck.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, shuffle, rng, isRed, cardName, STR, validMove, cloneLayout } from '../src/index.js';
import { LANGS } from '@spielesammlung/i18n';

test('Deck: 52 Karten, jede Farbe/Wert-Kombination einmal, ids fortlaufend', () => {
  const d = makeDeck();
  assert.equal(d.length, 52);
  assert.deepEqual(d.map(c => c.id), [...Array(52).keys()]);
  assert.equal(new Set(d.map(c => `${c.suit}-${c.rank}`)).size, 52);
});

test('Zwei Decks mit 1, 2, 4 Farben: immer 104 Karten, je Farbe gleich viele', () => {
  for (const [suits, per] of [[1, 104], [2, 52], [4, 26]]) {
    const d = makeDeck({ decks: 2, suits });
    assert.equal(d.length, 104);
    const count = {};
    for (const c of d) count[c.suit] = (count[c.suit] || 0) + 1;
    assert.equal(Object.keys(count).length, suits);
    for (const n of Object.values(count)) assert.equal(n, per);
    for (let r = 1; r <= 13; r++) assert.equal(d.filter(c => c.rank === r).length, 8);
  }
});

test('Mischen: deterministisch mit Seed, verändert die Eingabe nicht, verliert keine Karte', () => {
  const ids = [...Array(52).keys()];
  const a = shuffle(ids, 7), b = shuffle(ids, 7), c = shuffle(ids, 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.deepEqual(ids, [...Array(52).keys()]);
  assert.deepEqual([...a].sort((x, y) => x - y), ids);
  const r = rng(1);
  for (let k = 0; k < 1000; k++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('Farben: Herz und Karo sind rot', () => {
  assert.deepEqual([0, 1, 2, 3].map(isRed), [false, true, true, false]);
});

test('Kartennamen und gemeinsame Texte in allen Sprachen', () => {
  assert.equal(cardName('de', { suit: 1, rank: 12 }), 'Herz Dame');
  assert.equal(cardName('en', { suit: 0, rank: 1 }), 'Ace of spades');
  assert.equal(cardName('xx', { suit: 3, rank: 10 }), '10 of clubs');
  const keys = Object.keys(STR.en).sort();
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(STR[l]).sort(), keys, l);
    for (const k of keys) assert.ok(STR[l][k].trim(), `${l}.${k}`);
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) assert.ok(cardName(l, { suit: s, rank: r }).trim());
  }
});

test('Züge prüfen und Lage kopieren', () => {
  const piles = ['stock', 't0', 't1'];
  assert.ok(validMove(['d'], piles));
  assert.ok(validMove(['m', 't0', 2, 't1'], piles));
  assert.ok(!validMove(['m', 't0', -1, 't1'], piles));
  assert.ok(!validMove(['m', 't0', 1, 'x'], piles));
  assert.ok(!validMove(['d', 1], piles));
  assert.ok(!validMove('d', piles));
  const a = { piles: { t0: [1, 2] }, up: [0, 1, 1] }, b = cloneLayout(a);
  b.piles.t0.push(3); b.up[0] = 1;
  assert.deepEqual(a, { piles: { t0: [1, 2] }, up: [0, 1, 1] });
});
