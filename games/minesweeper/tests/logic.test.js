// Ausführen: node --test games/minesweeper/tests/logic.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Logic from '../src/logic.js';

const count = a => a.reduce((s, v) => s + v, 0);

test('Neues Spiel: Größe und Minenzahl je Stufe, noch keine Minen gelegt', () => {
  for (const id of Logic.LEVEL_IDS) {
    const g = Logic.newGame(id, 1), L = Logic.LEVELS[id];
    assert.equal(g.mine.length, L.w * L.h);
    assert.equal(count(g.mine), 0);
    assert.equal(g.started, false);
  }
  assert.equal(Logic.newGame('quatsch', 1).level, 'beginner');
});

test('Erster Klick: nie eine Mine, Nachbarn frei, öffnet eine Fläche, Minenzahl stimmt', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const id of Logic.LEVEL_IDS) {
      const g = Logic.newGame(id, seed);
      const first = (seed * 7) % (g.w * g.h);
      const ev = Logic.reveal(g, first);
      assert.equal(count(g.mine), g.mines, `${id}/${seed}`);
      assert.equal(g.mine[first], 0);
      for (const j of Logic.neighbors(g, first)) assert.equal(g.mine[j], 0);
      assert.equal(Logic.adjacent(g, first), 0);
      assert.ok(ev[0].cells.length > 1, 'Fläche geöffnet');
      assert.equal(g.over && !g.won, false);
    }
  }
});

test('Deterministisch: gleicher Seed und erster Klick ergeben dieselben Minen', () => {
  const a = Logic.newGame('expert', 42), b = Logic.newGame('expert', 42), c = Logic.newGame('expert', 43);
  Logic.reveal(a, 200); Logic.reveal(b, 200); Logic.reveal(c, 200);
  assert.deepEqual(a.mine, b.mine);
  assert.notDeepEqual(a.mine, c.mine);
});

test('Nachbarn: Ecke 3, Rand 5, Mitte 8', () => {
  const g = Logic.newGame('beginner', 1);
  assert.equal(Logic.neighbors(g, 0).length, 3);
  assert.equal(Logic.neighbors(g, 4).length, 5);
  assert.equal(Logic.neighbors(g, 40).length, 8);
});

// Spiel mit selbst gelegten Minen, um Regeln gezielt zu prüfen
function fixed(minesAt) {
  const g = Logic.newGame('beginner', 1);
  for (const i of minesAt) g.mine[i] = 1;
  g.mines = minesAt.length;
  g.started = true;
  return g;
}

test('Mine aufdecken beendet das Spiel als Niederlage', () => {
  const g = fixed([0, 80]);
  const ev = Logic.reveal(g, 0);
  assert.equal(g.over, true);
  assert.equal(g.won, false);
  assert.equal(g.exploded, 0);
  assert.ok(ev.some(e => e.type === 'exploded'));
  assert.equal(Logic.reveal(g, 40), null, 'danach passiert nichts mehr');
});

test('Alle sicheren Felder offen = Sieg, Minen werden markiert', () => {
  const g = fixed([0]);
  const ev = Logic.reveal(g, 80);              // Nullen breiten sich über das ganze Feld aus
  assert.equal(g.won, true);
  assert.equal(g.over, true);
  assert.ok(ev.some(e => e.type === 'won'));
  assert.equal(g.flag[0], 1);
  assert.equal(Logic.minesLeft(g), 0);
});

test('Flaggen: setzen, entfernen, schützen vor Aufdecken, nicht auf offenen Feldern', () => {
  const g = fixed([0, 1]);
  Logic.toggleFlag(g, 0);
  assert.equal(g.flags, 1);
  assert.equal(Logic.minesLeft(g), 1);
  assert.equal(Logic.reveal(g, 0), null);
  Logic.toggleFlag(g, 0);
  assert.equal(g.flags, 0);
  Logic.reveal(g, 9);
  assert.equal(Logic.toggleFlag(g, 9), null);
});

test('Akkord: mit passenden Flaggen werden die übrigen Nachbarn aufgedeckt', () => {
  const g = fixed([0, 80]);
  Logic.reveal(g, 10);                          // Zahl 1 (Nachbar von 0)
  assert.equal(Logic.adjacent(g, 10), 1);
  assert.equal(Logic.chord(g, 10), null, 'ohne Flagge nichts');
  Logic.toggleFlag(g, 0);
  const ev = Logic.chord(g, 10);
  assert.ok(ev && ev[0].cells.length > 0);
  assert.equal(g.open[1], 1);
  assert.equal(g.exploded, -1, 'keine Mine getroffen');
  assert.equal(g.won, true, 'bei nur zwei Minen öffnet der Akkord das ganze Feld');
});

test('Akkord mit falscher Flagge deckt die Mine auf', () => {
  const g = fixed([0, 80]);
  Logic.reveal(g, 10);
  Logic.toggleFlag(g, 1);                       // falsch: Mine liegt auf 0
  Logic.chord(g, 10);
  assert.equal(g.over, true);
  assert.equal(g.exploded, 0);
});

test('Züge werden für die Rangliste mitgeschrieben', () => {
  const g = Logic.newGame('beginner', 7);
  Logic.reveal(g, 40);
  const i = g.open.findIndex(v => !v);
  Logic.toggleFlag(g, i);
  assert.deepEqual(g.moves.slice(0, 2), [['r', 40], ['f', i]]);
});

test('Speichern und Laden: JSON-Rundreise, kaputte Stände ergeben null', () => {
  const g = Logic.newGame('intermediate', 99);
  Logic.reveal(g, 100);
  Logic.toggleFlag(g, g.open.findIndex(v => !v));
  g.elapsed = 12345;
  const r = Logic.restore(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(r, g);
  assert.equal(Logic.restore(null), null);
  assert.equal(Logic.restore({ ...g, level: 'x' }), null);
  assert.equal(Logic.restore({ ...g, mine: g.mine.slice(1) }), null);
  assert.equal(Logic.restore({ ...g, w: 10 }), null);
});

test('Statistik: nur beendete Spiele, Bestzeit nur bei Sieg und Verbesserung', () => {
  const st = Logic.newStat();
  assert.equal(Logic.recordResult(st, { won: false, elapsed: 5000 }), false);
  assert.equal(Logic.recordResult(st, { won: true, elapsed: 30000 }), true);
  assert.equal(Logic.recordResult(st, { won: true, elapsed: 40000 }), false);
  assert.equal(Logic.recordResult(st, { won: true, elapsed: 20000 }), true);
  assert.deepEqual(st, { played: 4, won: 3, best: 20000 });
  assert.deepEqual(Logic.restoreStat({ played: 2, won: 5, best: -1 }), { played: 2, won: 2, best: null });
});
