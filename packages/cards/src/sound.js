// Klänge der Kartenspiele, ohne Audiodateien: Karte aufnehmen, ablegen, umdrehen, austeilen, Zielstapel, Sieg.
// Papier klingt nach kurzem, hellem Rauschen; Zielstapel klingen als Kalimba, die mit dem Kartenwert steigt.
import { createAudio, pentatonic, rnd } from '@spielesammlung/audio';

export function createCardSound() {
  const a = createAudio({ compressor: true });

  // Karte gleitet über den Filz
  const slide = (at = 0, vol = 0.1) => a.hiss(rnd(2600, 3600), 0.9, 0.07, vol, { type: 'bandpass', at, to: rnd(1400, 1900) });
  // Karte landet: dumpfer Tupfer + kleines Klicken
  const tap = (at = 0, vol = 1) => {
    a.hiss(rnd(700, 900), 0.8, 0.05, 0.22 * vol, { type: 'lowpass', at });
    a.hiss(rnd(3500, 4500), 3, 0.012, 0.1 * vol, { at });
  };

  return {
    unlock: a.unlock,
    setMaster: a.setMaster,
    setPaused: a.setPaused,
    close: a.close,
    pick() { if (a.ok()) slide(0, 0.06); },
    place() { if (a.ok()) { slide(0, 0.06); tap(0.04); } },
    flip() { if (a.ok()) a.hiss(rnd(4200, 5200), 1.5, 0.03, 0.12, { type: 'highpass', at: 0.05 }); },
    draw(n = 1) { if (a.ok()) for (let k = 0; k < n; k++) { slide(k * 0.05, 0.08); tap(k * 0.05 + 0.03, 0.6); } },
    recycle() { if (a.ok()) for (let k = 0; k < 6; k++) slide(k * 0.03, 0.06); },
    deal(n = 10) { if (a.ok()) for (let k = 0; k < n; k++) { slide(k * 0.035, 0.07); tap(k * 0.035 + 0.03, 0.5); } },
    shuffle() {
      if (!a.ok()) return;
      for (let k = 0; k < 14; k++) a.hiss(rnd(2000, 4000), 1.2, 0.02, 0.07, { at: k * 0.028 + rnd(0, 0.01) });
    },
    // Zielstapel: Ton steigt mit dem Wert der Karte (Ass tief, König hoch)
    foundation(rank) { if (a.ok()) { tap(0, 0.8); a.kalimba(pentatonic(rank - 1, 330), 0.14, 0.02); } },
    // Spider: fertige Folge – schnelle Kalimba-Treppe
    complete() { if (a.ok()) for (let k = 0; k < 8; k++) a.kalimba(pentatonic(k + 3, 330), 0.1, k * 0.045); },
    undo() { if (a.ok()) a.hiss(2200, 0.9, 0.08, 0.07, { to: 3600 }); },
    invalid() { if (a.ok()) a.tone(190, 0.08, 0.14, { type: 'triangle', to: 140 }); },
    hint() { if (a.ok()) { a.kalimba(pentatonic(7, 330), 0.08); a.kalimba(pentatonic(9, 330), 0.07, 0.09); } },
    win(newBest) {
      if (!a.ok()) return;
      const steps = newBest ? [0, 2, 4, 5, 7, 9, 10, 12] : [0, 2, 4, 7, 9, 12];
      steps.forEach((k, j) => a.kalimba(pentatonic(5 + k, 330), 0.16, j * 0.11));
      a.hiss(1200, 0.5, 1, 0.05, { type: 'lowpass', attack: 0.3, at: 0.1 });
    },
  };
}
