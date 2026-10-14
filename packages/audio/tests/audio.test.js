// Ausführen: node --test packages/audio/tests/audio.test.js
// Node hat keinen AudioContext: geprüft wird, dass alles ohne Kontext still und fehlerfrei bleibt, und die Tonleiter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, pentatonic, semi } from '../src/index.js';

test('Ohne AudioContext: unlock, Klänge und close werfen nicht, ok() bleibt false', () => {
  let started = 0;
  const a = createAudio({ compressor: true, onStart: () => started++ });
  a.unlock();
  a.setMaster(0.5);
  a.setPaused(true);
  a.tone(440, 0.1, 0.2);
  a.hiss(1000, 1, 0.1, 0.2);
  a.kalimba(440);
  assert.equal(a.ok(), false);
  assert.equal(started, 0);
  a.close();
});

test('Pentatonik: Grundton, Stufen und Oktaven', () => {
  assert.equal(pentatonic(0, 400), 400);
  assert.ok(Math.abs(pentatonic(5, 400) - 800) < 1e-9);
  assert.ok(Math.abs(pentatonic(-5, 400) - 200) < 1e-9);
  assert.ok(Math.abs(pentatonic(3, 400) - semi(400, 7)) < 1e-9);   // vierte Stufe = Quinte
});
