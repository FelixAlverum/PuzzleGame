// Ton für Minesweeper mit der Web Audio API, ohne Audiodateien. Bisher nur der Knall der Minen.
// Ein Kompressor am Ausgang macht den Knall laut, ohne dass mehrere schnelle Explosionen übersteuern.
// Je mount ein eigener AudioContext, beim Abbauen wird er geschlossen.

export function createAudio() {
  let ctx = null, out = null, noise = null;
  let master = 1, paused = false;
  let played = 0;                        // Anzahl Knalle, für automatisierte Tests

  function apply() {
    if (!ctx) return;
    const on = master > 0 && !paused;
    out.gain.value = on ? master * master : 0;   // quadratisch wie die Regler in Cozy Garden
    if (on) ctx.resume(); else ctx.suspend();
  }

  // Muss aus einer Nutzergeste heraus aufgerufen werden (Autoplay-Regeln der Browser)
  function unlock() {
    if (ctx) { apply(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 6;
    comp.ratio.value = 10;
    comp.attack.value = 0.002;
    comp.release.value = 0.25;
    out = ctx.createGain();
    out.connect(comp);
    comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    apply();
  }

  const ok = () => !!ctx && master > 0 && !paused;

  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noiseBurst(t, { type, from, to, sweep, peak, decay, q = 0.7 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + sweep);
    const g = ctx.createGain();
    env(g, t, peak, 0.004, decay);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.8);
    src.stop(t + decay + 0.1);
  }

  // Explosion: Knacken + Druckwelle (Rauschen, dessen Filter nach unten fällt) + tiefer Schlag.
  // power 0..1: die getroffene Mine knallt mit 1, die Kettenreaktion leiser und kürzer.
  function bang(power = 1) {
    if (!ok()) return;
    played++;
    const p = Math.max(0.2, Math.min(1, power)), t = ctx.currentTime + 0.005;
    const v = 0.92 + Math.random() * 0.16;     // jede Mine klingt etwas anders
    noiseBurst(t, { type: 'highpass', from: 2400 * v, peak: 0.9 * p, decay: 0.07 });
    noiseBurst(t, { type: 'lowpass', from: (900 + 3600 * p) * v, to: 110, sweep: 0.5 + 0.6 * p, peak: 1.8 * p, decay: 0.45 + 0.9 * p });
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120 * v, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    env(og, t, 1.6 * p, 0.004, 0.35 + 0.4 * p);
    o.connect(og); og.connect(out);
    o.start(t);
    o.stop(t + 1);
    if (p >= 0.9) {                          // großer Knall: nachgrollen
      noiseBurst(t + 0.12, { type: 'lowpass', from: 300, to: 60, sweep: 1.2, peak: 0.7, decay: 1.4 });
    }
  }

  return {
    unlock,
    bang,
    setMaster(v) { master = Math.max(0, Math.min(1, v)); apply(); },
    setPaused(v) { paused = v; apply(); },
    get played() { return played; },
    close() {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
    },
  };
}
