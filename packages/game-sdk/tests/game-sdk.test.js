// Ausführen: node --test packages/game-sdk/tests/game-sdk.test.js (Node ≥ 22.18 lädt .ts direkt)
import test from 'node:test';
import assert from 'node:assert/strict';
import { defineGame, createFakePlatform } from '../src/index.ts';

const mount = () => ({ pause() {}, resume() {}, unmount() {} });

test('defineGame prüft ID, saveVersion und mount', () => {
  const g = { id: 'mine-sweeper', title: { en: 'Minesweeper' }, saveVersion: 1, mount };
  assert.equal(defineGame(g), g);
  assert.throws(() => defineGame({ ...g, id: 'Mine Sweeper' }), /Spiel-ID/);
  assert.throws(() => defineGame({ ...g, saveVersion: 0 }), /saveVersion/);
  assert.throws(() => defineGame({ ...g, mount: undefined }), /mount/);
});

test('Fake-Plattform: Spielstand je Slot, Sprache, Lautstärke, DLC', async () => {
  const p = createFakePlatform({ gameId: 'demo', storage: null, language: 'de', volume: 0.5, entitlements: ['demo.extra'] });
  assert.equal(await p.save.load(), null);
  p.save.store({ v: 1 });
  p.save.store({ v: 2 }, 'zwei');
  assert.deepEqual(await p.save.load(), { v: 1 });
  assert.deepEqual(await p.save.load('zwei'), { v: 2 });
  assert.equal(p.language(), 'de');
  assert.equal(p.audio.volume(), 0.5);
  assert.equal(p.entitlements.has('demo.extra'), true);
  assert.equal(p.entitlements.has('demo.other'), false);
  assert.equal(p.exit, undefined);
});
