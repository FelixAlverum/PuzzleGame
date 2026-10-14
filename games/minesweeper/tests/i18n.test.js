// Ausführen: node --test games/minesweeper/tests/i18n.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as I18N from '../src/i18n.js';
import * as Logic from '../src/logic.js';

test('Alle Sprachen haben dieselben Texte, keiner ist leer', () => {
  const keys = Object.keys(I18N.STR.en).sort();
  for (const l of I18N.LANGS) {
    assert.deepEqual(Object.keys(I18N.STR[l]).sort(), keys, l);
    for (const k of keys) assert.ok(String(I18N.STR[l][k]).trim(), `${l}.${k}`);
  }
});

test('Jede Stufe hat einen Namen', () => {
  for (const l of I18N.LANGS) for (const id of Logic.LEVEL_IDS) assert.ok(I18N.STR[l][id], `${l}.${id}`);
});

test('Manifest: Ranglisten entsprechen den Stufen der Logik', async () => {
  const { STR } = I18N;
  assert.ok(STR.de.beginner);
  const src = await import('node:fs').then(fs => fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8'));
  const ids = JSON.parse(src.match(/const LEVEL_IDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(ids, Logic.LEVEL_IDS);
});
