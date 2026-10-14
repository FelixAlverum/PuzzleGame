// Gemeinsames Ton-Grundgerüst der Spiele: Web Audio ohne Audiodateien.
// - Kontext erst nach einer Nutzergeste (Autoplay-Regeln der Browser): unlock() bei pointerdown/keydown aufrufen
// - Gesamtlautstärke der Plattform (setMaster) und Pause (setPaused): bei 0 oder in der Pause ist der Kontext angehalten
// - Bausteine: Ton (tone), gefiltertes Rauschen (hiss), Kalimba, Pentatonik
// Jedes Spiel baut seine Klänge daraus selbst. Je mount ein eigener Kontext, close() gibt ihn frei.

const PENTA = [0, 2, 4, 7, 9];

/** Frequenz der i-ten Stufe einer Dur-Pentatonik über base (i darf negativ sein). Klingt in jeder Folge harmonisch. */
export function pentatonic(i, base = 392) {
  const oct = Math.floor(i / 5), step = PENTA[((i % 5) + 5) % 5];
  return base * Math.pow(2, (12 * oct + step) / 12);
}

/** Halbtöne: semi(440, 12) = 880 */
export const semi = (f, k) => f * Math.pow(2, k / 12);

export const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * @param {{ compressor?: boolean, onStart?: (core: object) => void }} [opts]
 *   compressor: Kompressor am Ausgang, damit laute oder viele gleichzeitige Klänge nicht übersteuern
 *   onStart: einmal aufgerufen, sobald der Kontext steht (eigene Busse, Dauerklänge anlegen)
 */
export function createAudio({ compressor = false, onStart } = {}) {
  let ctx = null, out = null, noise = null;
  let master = 1, paused = false;

  function apply() {
    if (!ctx) return;
    const on = master > 0 && !paused;
    out.gain.value = on ? master * master : 0;   // quadratisch, weil das Ohr Lautstärke logarithmisch hört
    if (on) ctx.resume(); else ctx.suspend();
  }

  const core = {
    get ctx() { return ctx; },
    /** Ausgang: alle Klänge (oder die Busse des Spiels) hierhin verbinden */
    get out() { return out; },
    /** 2 s weißes Rauschen als Puffer */
    get noise() { return noise; },
    get now() { return ctx ? ctx.currentTime : 0; },

    // Muss aus einer Nutzergeste heraus aufgerufen werden
    unlock() {
      if (ctx) { apply(); return; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      if (compressor) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 6;
        comp.ratio.value = 10;
        comp.attack.value = 0.002;
        comp.release.value = 0.25;
        out.connect(comp);
        comp.connect(ctx.destination);
      } else {
        out.connect(ctx.destination);
      }
      const len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (onStart) onStart(core);
      apply();
    },

    /** Gesamtlautstärke der Plattform 0..1 */
    setMaster(v) { master = Math.max(0, Math.min(1, v)); apply(); },
    setPaused(p) { paused = !!p; apply(); },
    /** true, wenn gerade Ton ausgegeben werden darf – vor jedem Klang prüfen */
    ok() { return !!ctx && master > 0 && !paused; },

    /** Hüllkurve: leise → peak in attack → leise in decay (Sekunden ab t) */
    env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    /**
     * Oszillator-Ton. at: Verzögerung in s; to: Zielfrequenz, erreicht nach sweep s (Standard: ganze Dauer).
     * Ohne laufenden Kontext passiert nichts.
     */
    tone(freq, dur, vol, { type = 'sine', at = 0, attack = 0.004, to = 0, sweep = 0, dest = out } = {}) {
      if (!ctx) return;
      const t = ctx.currentTime + at;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + (sweep || attack + dur));
      core.env(g, t, vol, attack, dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + attack + dur + 0.05);
    },

    /** Gefiltertes Rauschen (Rascheln, Klicken, Knall). to/sweep: Filterfrequenz gleitet dorthin. */
    hiss(freq, q, dur, vol, { type = 'bandpass', at = 0, attack = 0.003, to = 0, sweep = 0, dest = out } = {}) {
      if (!ctx) return;
      const t = ctx.currentTime + at;
      const s = ctx.createBufferSource();
      s.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(freq, t);
      if (to) f.frequency.exponentialRampToValueAtTime(to, t + (sweep || attack + dur));
      const g = ctx.createGain();
      core.env(g, t, vol, attack, dur);
      s.connect(f); f.connect(g); g.connect(dest);
      s.start(t, Math.random() * Math.max(0, noise.duration - attack - dur - 0.1));
      s.stop(t + attack + dur + 0.05);
    },

    /** Gezupfter, warmer Ton (Grundton, Oktave, Obertöne, Anschlag) */
    kalimba(freq, vol = 0.22, at = 0, dest = out) {
      core.tone(freq, 1.3, vol, { at, attack: 0.003, dest });
      core.tone(freq * 2, 0.5, vol * 0.18, { at, attack: 0.003, dest });
      core.tone(freq * 5.4, 0.12, vol * 0.08, { at, attack: 0.002, dest });
      core.hiss(freq * 3, 3, 0.02, vol * 0.15, { at, dest });
    },

    close() {
      if (ctx) ctx.close().catch(() => {});
      ctx = null; out = null; noise = null;
    },
  };
  return core;
}
