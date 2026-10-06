// Ausführen: node --test prototype/tests/logic.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Shapes = require('../src/shapes.js');
const Logic = require('../src/logic.js');

const N = Logic.DEFAULT_SIZE;
const item = (shape, v = 0) => ({ shape, v });

function emptyGame(tray = ['kiesel', 'kiesel', 'kiesel']) {
  const s = Logic.newGame(1);
  s.board.fill(null);
  s.tray = tray.map(id => item(id));
  return s;
}
const fill = (s, r, c) => { s.board[r * N + c] = { m: 'stone', p: 999, a: 0 }; };
const fillRowExcept = (s, r, skip) => { for (let c = 0; c < N; c++) if (c !== skip) fill(s, r, c); };

test('Varianten: Drehungen werden dedupliziert', () => {
  const n = id => Shapes.BY_ID[id].variants.length;
  assert.equal(n('kiesel'), 1);
  assert.equal(n('moospolster'), 1);
  assert.equal(n('bluete'), 1);
  assert.equal(n('ast'), 2);
  assert.equal(n('laubblatt'), 2);
  assert.equal(n('pilz'), 4);
  assert.ok(n('farnwedel') >= 4);
});

test('canPlace prüft Rand und belegte Felder', () => {
  const s = emptyGame();
  const ast = Logic.pieceOf(item('ast', 0)); // 1×4 waagerecht
  assert.ok(Logic.canPlace(s.board, ast, 0, 4));
  assert.ok(!Logic.canPlace(s.board, ast, 0, 5));
  fill(s, 0, 6);
  assert.ok(!Logic.canPlace(s.board, ast, 0, 4));
});

test('Ablegen belegt Zellen und gibt 1 Punkt pro Zelle', () => {
  const s = emptyGame(['moospolster', 'kiesel', 'kiesel']);
  const ev = Logic.place(s, 0, 2, 2);
  assert.equal(ev[0].type, 'placed');
  assert.equal(s.score, 4);
  assert.ok(s.board[2 * N + 2] && s.board[3 * N + 3]);
  assert.equal(s.tray[0], null);
  assert.equal(Logic.place(s, 1, 2, 2), null, 'belegtes Feld wird abgelehnt');
});

test('Volle Reihe löst sich auf: 10 Punkte', () => {
  const s = emptyGame();
  fillRowExcept(s, 0, 0);
  fill(s, 5, 5); // damit das Feld danach nicht leer ist (sonst Bonus)
  const ev = Logic.place(s, 0, 0, 0);
  const cleared = ev.find(e => e.type === 'cleared');
  assert.equal(cleared.lines, 1);
  assert.equal(cleared.cells.length, N);
  assert.equal(s.score, 1 + 10);
  assert.ok(s.board.slice(0, N).every(c => c === null));
});

test('Reihe + Spalte gleichzeitig: 30 Punkte, Kreuzung nur einmal', () => {
  const s = emptyGame();
  fillRowExcept(s, 3, 3);
  for (let r = 0; r < N; r++) if (r !== 3) fill(s, r, 3);
  const ev = Logic.place(s, 0, 3, 3);
  const cleared = ev.find(e => e.type === 'cleared');
  assert.equal(cleared.lines, 2);
  assert.equal(cleared.cells.length, 2 * N - 1);
  assert.equal(cleared.points, 30);
});

test('Combo steigt bei Folge-Auflösungen und verfällt nach 3 Zügen ohne', () => {
  const s = emptyGame(['kiesel', 'kiesel', 'kiesel']);
  fillRowExcept(s, 0, 0);
  Logic.place(s, 0, 0, 0);
  assert.equal(s.combo, 1);
  fillRowExcept(s, 1, 0);
  const ev = Logic.place(s, 1, 1, 0);
  assert.equal(s.combo, 2);
  assert.equal(ev.find(e => e.type === 'cleared').points, 15); // 10 × 1,5
  s.tray = [item('kiesel'), item('kiesel'), item('kiesel')];
  Logic.place(s, 0, 5, 5);
  Logic.place(s, 1, 5, 6);
  assert.equal(s.combo, 2, 'zwei Züge ohne Auflösung sind erlaubt');
  const ev3 = Logic.place(s, 2, 6, 6);
  assert.equal(s.combo, 0);
  assert.ok(ev3.some(e => e.type === 'comboLost'));
});

test('Frischer Boden: leeres Feld gibt Bonus', () => {
  const s = emptyGame();
  fillRowExcept(s, 7, 7);
  const ev = Logic.place(s, 0, 7, 7);
  assert.ok(ev.some(e => e.type === 'boardCleared'));
  assert.equal(s.score, 1 + 10 + 300);
});

test('Game Over, wenn keine Form mehr passt', () => {
  const s = emptyGame(['kiesel', 'felsplatte', 'felsplatte']);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 0) fill(s, r, c);
  const ev = Logic.place(s, 0, 0, 1);
  assert.ok(ev.some(e => e.type === 'gameOver'));
  assert.ok(s.over);
  assert.equal(Logic.place(s, 1, 0, 0), null);
});

test('Generator: deterministisch, fair, höchstens eine große Form', () => {
  assert.deepEqual(Logic.newGame(42).tray, Logic.newGame(42).tray);
  for (let seed = 1; seed <= 300; seed++) {
    const s = Logic.newGame(seed);
    assert.ok(Logic.anyMove(s));
    const big = s.tray.filter(it => Shapes.BY_ID[it.shape].size >= 7).length;
    assert.ok(big <= 1);
  }
});

test('Nachfüllen auf fast vollem Feld liefert eine passende Form', () => {
  const s = emptyGame();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 0) fill(s, r, c);
  for (let seed = 1; seed <= 50; seed++) {
    s.rng = seed;
    Logic.refill(s);
    assert.ok(Logic.anyMove(s));
  }
});

test('Garten wächst gleichmäßig und erblüht nach 25 Linien', () => {
  const g = Logic.newGarden();
  Logic.growGarden(g, 3);
  assert.deepEqual(g.plots, [1, 1, 1, 0, 0]);
  const ev = Logic.growGarden(g, 22);
  assert.ok(ev.some(e => e.type === 'gardenComplete' && e.level === 0));
  assert.equal(g.level, 1);
  assert.deepEqual(g.plots, [0, 0, 0, 0, 0]);
});

test('restore akzeptiert gültige und verwirft kaputte Spielstände', () => {
  const s = Logic.newGame(7);
  Logic.place(s, 0, 0, 0);
  const copy = Logic.restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(copy.board, s.board);
  assert.equal(Logic.restore({ v: 1, board: [] }), null);
  assert.equal(Logic.restore({ ...s, tray: [item('gibtsnicht'), null, null] }), null);
  assert.equal(Logic.restoreGarden({ level: 2, plots: [1, 2, 3, 4, 5] }).level, 2);
  assert.equal(Logic.restoreGarden({ level: 2, plots: [9] }), null);
});

test('Zurücknehmen stellt Runde und Garten vor dem Zug wieder her', () => {
  const s = emptyGame();
  fillRowExcept(s, 0, 0);
  fill(s, 5, 5);
  const g = Logic.newGarden();
  const history = [];
  const before = JSON.parse(JSON.stringify(s));
  Logic.pushHistory(history, { game: s, garden: g });
  const ev = Logic.place(s, 0, 0, 0);
  Logic.growGarden(g, ev.find(e => e.type === 'cleared').lines);
  assert.equal(g.total, 1);
  Logic.pushHistory(history, { game: s, garden: g });
  Logic.place(s, 1, 7, 7);

  const one = Logic.popHistory(history);
  assert.equal(one.game.score, 11);
  assert.equal(one.game.tray[1].shape, 'kiesel');
  const two = Logic.popHistory(history);
  assert.deepEqual(two.game, before);
  assert.equal(two.garden.total, 0);
  assert.equal(Logic.popHistory(history), null, 'leerer Verlauf');
});

test('Verlauf ist begrenzt', () => {
  const history = [];
  const s = Logic.newGame(3), g = Logic.newGarden();
  for (let i = 0; i < 5; i++) { s.score = i; Logic.pushHistory(history, { game: s, garden: g }, 3); }
  assert.equal(history.length, 3);
  assert.equal(Logic.popHistory(history).game.score, 4);
  assert.equal(JSON.parse(history[0]).game.score, 2);
});

test('Feldgröße: 6×6 und 10×10 lösen Linien ihrer eigenen Länge auf', () => {
  for (const n of [6, 10]) {
    const s = Logic.newGame(5, { size: n });
    assert.equal(s.board.length, n * n);
    assert.equal(Logic.sizeOf(s.board), n);
    s.board.fill(null);
    s.tray = [item('kiesel'), item('kiesel'), item('kiesel')];
    for (let c = 1; c < n; c++) s.board[c] = { m: 'stone', p: 999, a: 0 };
    s.board[n * n - 1] = { m: 'stone', p: 998, a: 0 };
    const ev = Logic.place(s, 0, 0, 0);
    assert.equal(ev.find(e => e.type === 'cleared').cells.length, n);
    assert.ok(!Logic.canPlace(s.board, Logic.pieceOf(item('ast')), 0, n - 3), 'Rand liegt bei n');
  }
  assert.equal(Logic.sizeOf(Logic.newGame(1, { size: 7 }).board), 8, 'unbekannte Größe → 8×8');
});

test('Biome: Extras erscheinen nur im eigenen Biom', () => {
  for (const biome of Logic.BIOMES) {
    const pool = Shapes.pool(biome);
    assert.ok(pool.every(sh => !sh.biome || sh.biome === biome));
    assert.equal(pool.filter(sh => sh.biome).length, 3);
    for (let seed = 1; seed <= 200; seed++) {
      const s = Logic.newGame(seed, { biome });
      assert.equal(s.biome, biome);
      assert.ok(s.tray.every(it => !Shapes.BY_ID[it.shape].biome || Shapes.BY_ID[it.shape].biome === biome));
    }
  }
  // Extras gleichen sich in Zellen und Gewicht → kein Biom ist leichter
  const sig = biome => Shapes.pool(biome).filter(sh => sh.biome).map(sh => `${sh.size}/${sh.weight}`).sort().join();
  assert.equal(sig('pond'), sig('meadow'));
  assert.equal(sig('tropics'), sig('meadow'));
});

test('restore: Läufe aus v0.1 werden Wiese, fremde Biom-Formen werden verworfen', () => {
  const old = Logic.newGame(9);
  delete old.biome;
  assert.equal(Logic.restore(JSON.parse(JSON.stringify(old))).biome, 'meadow');
  const pond = Logic.newGame(9, { biome: 'pond', size: 10 });
  assert.equal(Logic.restore(JSON.parse(JSON.stringify(pond))).board.length, 100);
  assert.equal(Logic.restore({ ...pond, tray: [item('tulpe'), null, null] }), null, 'Tulpe gibt es nur auf der Wiese');
  assert.equal(Logic.restore({ ...pond, biome: 'mars' }), null);
});

test('Statistik: Spiele, Formen, Rekord und Tiefstwert', () => {
  const st = Logic.newStat();
  assert.equal(st.worst, null);
  Logic.statPlaced(st); Logic.statPlaced(st);
  Logic.statGameOver(st, 120);
  Logic.statGameOver(st, 40);
  Logic.statGameOver(st, 300);
  assert.deepEqual(st, { games: 3, tiles: 2, best: 300, worst: 40 });

  const other = Logic.newStat();
  Logic.statPlaced(other);
  const t = Logic.statTotals([st, other]);
  assert.deepEqual(t, { games: 3, tiles: 3, best: 300, worst: 40 }, 'Eintrag ohne Spiele verfälscht den Tiefstwert nicht');

  assert.deepEqual(Logic.restoreStat({ games: 2, tiles: -5, best: 'x', worst: 7.6 }), { games: 2, tiles: 0, best: 0, worst: 7 });
  assert.equal(Logic.restoreStat({ games: 0, worst: 5 }).worst, null);
  assert.equal(Logic.statKey('pond', 10), 'pond-10');
});
