// Ausführen: node --test apps/web/tests/platform.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, loadSave, storeSave, submitScore, bestScore, markPlayed, lastPlayed } from '../src/storage.js';
import { createSettings } from '../src/settings.js';
import { createPlatform } from '../src/platform.js';

function backend(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    map: m,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}

const game = {
  id: 'demo',
  legacySaveKeys: ['demo:save', 'old-save'],
  leaderboards: [{ id: 'best', sort: 'desc', format: 'points' }, { id: 'time', sort: 'asc', format: 'time' }],
};

test('Spielstand: speichern und laden je Spiel und Slot', () => {
  const store = createStore(backend());
  assert.equal(loadSave(store, game), null);
  storeSave(store, 'demo', { v: 1, n: 5 });
  storeSave(store, 'demo', { v: 1, n: 9 }, 'b');
  assert.deepEqual(loadSave(store, game), { v: 1, n: 5 });
  assert.deepEqual(loadSave(store, game, 'b'), { v: 1, n: 9 });
});

test('Alter Stand wird einmalig übernommen, der neueste Schlüssel zuerst, danach sind alle alten weg', () => {
  const b = backend({ 'demo:save': '{"v":3}', 'old-save': '{"v":1}' });
  const store = createStore(b);
  assert.deepEqual(loadSave(store, game), { v: 3 });
  assert.equal(b.map.has('demo:save'), false);
  assert.equal(b.map.has('old-save'), false);
  assert.equal(b.map.get('lib:save:demo:default'), '{"v":3}');
});

test('Vorhandener Stand hat Vorrang vor alten Schlüsseln, die dann liegen bleiben', () => {
  const b = backend({ 'lib:save:demo:default': '{"v":3,"neu":true}', 'old-save': '{"v":1}' });
  assert.deepEqual(loadSave(createStore(b), game), { v: 3, neu: true });
  assert.equal(b.map.has('old-save'), true);
});

test('Kaputtes JSON liefert null statt zu werfen', () => {
  const store = createStore(backend({ 'lib:save:demo:default': '{kaputt' }));
  assert.equal(loadSave(store, game), null);
});

test('Rekord: nur Verbesserungen zählen, Richtung je Rangliste', () => {
  const store = createStore(backend());
  submitScore(store, game, 'best', 100);
  submitScore(store, game, 'best', 80);
  submitScore(store, game, 'time', 50);
  submitScore(store, game, 'time', 42);
  submitScore(store, game, 'time', 60);
  submitScore(store, game, 'unbekannt', 5);
  submitScore(store, game, 'best', NaN);
  assert.equal(bestScore(store, 'demo', 'best'), 100);
  assert.equal(bestScore(store, 'demo', 'time'), 42);
  assert.equal(bestScore(store, 'demo', 'unbekannt'), null);
});

test('Zuletzt gespielt je Spiel', () => {
  const store = createStore(backend());
  assert.equal(lastPlayed(store, 'demo'), null);
  markPlayed(store, 'demo', 1000);
  markPlayed(store, 'other', 2000);
  assert.equal(lastPlayed(store, 'demo'), 1000);
  assert.equal(lastPlayed(store, 'other'), 2000);
});

test('Einstellungen: Sprache gewählt oder vom Browser, Lautstärke begrenzt, ungültige Werte ignoriert', () => {
  const store = createStore(backend());
  const s = createSettings(store, () => 'fr-CA');
  assert.equal(s.language(), 'fr');
  s.set({ lang: 'de', volume: 1.7 });
  assert.equal(s.language(), 'de');
  assert.equal(s.get().volume, 1);
  s.set({ lang: 'xx', volume: 'laut' });
  assert.deepEqual(s.get(), { lang: 'de', volume: 1 });
  assert.deepEqual(createSettings(store, () => 'en').get(), { lang: 'de', volume: 1 });   // gespeichert
  assert.equal(createSettings(createStore(backend()), () => 'ja-JP').language(), 'en');
  s.set({ lang: null });
  assert.equal(s.get().lang, null, 'zurück auf Automatisch');
  assert.equal(s.language(), 'fr');
  s.set({ volume: 0.5 });
  assert.equal(s.get().lang, null, 'ein Patch ohne lang lässt die Sprache stehen');
});

test('Plattform: Spielstand, Rekord, Sprache und Lautstärke kommen aus der Hülle', async () => {
  const store = createStore(backend({ 'old-save': '{"v":1}' }));
  const settings = createSettings(store, () => 'de-DE');
  let exited = false;
  const p = createPlatform(game, { store, settings, exit: () => { exited = true; } });
  assert.equal(p.gameId, 'demo');
  assert.equal(p.user.guest, true);
  assert.deepEqual(await p.save.load(), { v: 1 });
  p.save.store({ v: 2 });
  assert.deepEqual(await p.save.load(), { v: 2 });
  p.scores.submit('best', 7);
  assert.equal(bestScore(store, 'demo', 'best'), 7);
  assert.equal(p.language(), 'de');
  assert.equal(p.entitlements.has('demo.dlc'), false);

  const heard = [];
  const off = p.audio.onChange(v => heard.push(v));
  settings.set({ volume: 0.4 });
  off();
  settings.set({ volume: 0.2 });
  assert.deepEqual(heard, [0.4]);
  assert.equal(p.audio.volume(), 0.2);
  p.exit();
  assert.equal(exited, true);
});
