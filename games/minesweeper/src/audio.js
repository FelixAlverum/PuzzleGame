// Ton für Minesweeper, ohne Audiodateien: Aufdecken, Flagge, Sieg und der Knall der Minen.
// Kontext, Entsperren, Gesamtlautstärke und Kompressor kommen aus @spielesammlung/audio. Der Kompressor macht den
// Knall laut, ohne dass mehrere schnelle Explosionen übersteuern. Je mount ein eigener Kontext, close() gibt ihn frei.
import { createAudio, pentatonic, rnd } from '@spielesammlung/audio';

export function createSound() {
  const a = createAudio({ compressor: true });
  let played = 0;                        // Anzahl Knalle, für automatisierte Tests

  // Explosion: Knacken + Druckwelle (Rauschen, dessen Filter nach unten fällt) + tiefer Schlag.
  // power 0..1: die getroffene Mine knallt mit 1, die Kettenreaktion leiser und kürzer.
  function bang(power = 1) {
    if (!a.ok()) return;
    played++;
    const p = Math.max(0.2, Math.min(1, power)), at = 0.005;
    const v = 0.92 + Math.random() * 0.16;     // jede Mine klingt etwas anders
    a.hiss(2400 * v, 0.7, 0.07, 0.9 * p, { type: 'highpass', at, attack: 0.004 });
    a.hiss((900 + 3600 * p) * v, 0.7, 0.45 + 0.9 * p, 1.8 * p, { type: 'lowpass', at, attack: 0.004, to: 110, sweep: 0.5 + 0.6 * p });
    a.tone(120 * v, 0.35 + 0.4 * p, 1.6 * p, { at, to: 30, sweep: 0.4 });
    if (p >= 0.9) {                          // großer Knall: nachgrollen
      a.hiss(300, 0.7, 1.4, 0.7, { type: 'lowpass', at: at + 0.12, attack: 0.004, to: 60, sweep: 1.2 });
    }
  }

  // Aufdecken: ein einzelnes Feld klopft leise auf Holz, eine ganze Fläche raschelt wie Moos, dazu ein heller Ton,
  // der mit der Größe der Fläche steigt
  function reveal(cells) {
    if (!a.ok() || !cells) return;
    const p = rnd(0.94, 1.06);
    a.tone(520 * p, 0.05, 0.16, { type: 'triangle', to: 380 * p });
    a.hiss(2200 * p, 2.5, 0.02, 0.07);
    if (cells >= 6) {
      a.hiss(1400, 0.6, 0.22 + Math.min(0.3, cells / 200), 0.16, { type: 'lowpass', attack: 0.03, to: 380 });
      a.kalimba(pentatonic(Math.min(9, 3 + Math.floor(Math.log2(cells))), 392), 0.1, 0.03);
    }
  }

  // Flagge: kurzes Flattern (Stoff) und ein Stecken; Entfernen etwas tiefer und leiser
  function flag(on) {
    if (!a.ok()) return;
    if (on) {
      a.hiss(3200, 1.2, 0.07, 0.12, { type: 'highpass', to: 5200 });
      a.tone(300, 0.05, 0.22, { type: 'triangle', at: 0.04, to: 190 });
    } else {
      a.hiss(2600, 1.2, 0.06, 0.08, { type: 'highpass', to: 1800 });
      a.tone(240, 0.04, 0.12, { type: 'triangle', at: 0.02, to: 170 });
    }
  }

  // Sieg: aufsteigende Kalimba-Folge, bei neuer Bestzeit noch zwei Töne mehr
  function win(newBest) {
    if (!a.ok()) return;
    const steps = newBest ? [0, 2, 4, 5, 7, 9, 10] : [0, 2, 4, 7, 9];
    steps.forEach((k, j) => a.kalimba(pentatonic(5 + k, 392), 0.18, j * 0.1));
    a.hiss(1200, 0.5, 0.8, 0.06, { type: 'lowpass', attack: 0.2, at: 0.1 });
  }

  return {
    unlock: a.unlock,
    bang, reveal, flag, win,
    setMaster: a.setMaster,
    setPaused: a.setPaused,
    get played() { return played; },
    close: a.close,
  };
}
