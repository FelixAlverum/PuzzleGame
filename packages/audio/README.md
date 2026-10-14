# @spielesammlung/audio

Ton-Grundgerüst aller Spiele: Web Audio ohne Audiodateien. Genutzt von Cozy Garden, Minesweeper und den
Kartenspielen (über `packages/cards`).

```js
import { createAudio, pentatonic } from '@spielesammlung/audio';

const a = createAudio({ compressor: true });    // je mount ein eigener Kontext
el.addEventListener('pointerdown', () => a.unlock(), { capture: true });   // Kontext erst nach einer Geste
a.setMaster(platform.audio.volume());           // Gesamtlautstärke der Plattform (quadratisch)
a.setPaused(true);                              // Tab verdeckt: Kontext angehalten
if (a.ok()) a.kalimba(pentatonic(3), 0.2);      // Klänge nur, wenn Ton erlaubt ist
a.close();                                      // beim unmount
```

| Baustein | Wofür |
|---|---|
| `tone(freq, dauer, lautstärke, { type, at, attack, to, sweep, dest })` | Oszillator mit Hüllkurve, optional gleitende Tonhöhe |
| `hiss(freq, q, dauer, lautstärke, { type, at, attack, to, sweep, dest })` | gefiltertes Rauschen: Rascheln, Klicken, Knall |
| `kalimba(freq, lautstärke, at, dest)` | gezupfter, warmer Ton |
| `pentatonic(i, base)`, `semi(f, k)`, `rnd(a, b)` | Tonleiter, Halbtöne, Zufall |
| `onStart(core)` (Option) | eigene Busse und Dauerklänge anlegen, sobald der Kontext steht (Cozy Garden: Musik, Effekte, Atmosphäre) |

Ohne `AudioContext` (Node, alte Browser) bleibt alles still und wirft nicht.
