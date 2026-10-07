// Ausführen: node --test prototype/tests/i18n.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const I18N = require('../src/i18n.js');
const Logic = require('../src/logic.js');

test('Alle Sprachen haben dieselben Texte', () => {
  const keys = Object.keys(I18N.STR.en).sort();
  for (const l of I18N.LANGS) {
    assert.deepEqual(Object.keys(I18N.STR[l]).sort(), keys, l);
    for (const k of keys) {
      const v = I18N.STR[l][k], e = I18N.STR.en[k];
      assert.equal(typeof v, typeof e, `${l}.${k}`);
      if (Array.isArray(e)) assert.equal(v.length, e.length, `${l}.${k}: gleich viele Einträge`);
      else assert.ok(v.length > 0, `${l}.${k} ist leer`);
    }
  }
});

test('Jedes Biom hat Name, Beschreibung und Anleitungstext', () => {
  for (const l of I18N.LANGS) for (const b of Logic.BIOMES) {
    for (const k of ['name_', 'desc_', 'g_bio_']) assert.ok(I18N.STR[l][k + b], `${l}.${k}${b}`);
  }
});

test('Anleitung stimmt mit der Punkte-Logik überein', () => {
  const pts = I18N.STR.en.g_score.slice(1, 5).map(([, v]) => Number(v.replace('+', '')));
  assert.deepEqual(pts, [1, 2, 3, 4].map(n => Logic.lineScore(n, 1)));
  assert.equal(4 + Logic.lineScore(2, 3), 64, 'Beispiel in g_example');
});

test('Sprachcode wird erkannt', () => {
  assert.equal(I18N.pick('de-AT'), 'de');
  assert.equal(I18N.pick('zh-Hans-CN'), 'zh');
  assert.equal(I18N.pick('zh-TW'), 'zh');
  assert.equal(I18N.pick('fr'), 'en');
  assert.equal(I18N.pick(undefined), 'en');
});
