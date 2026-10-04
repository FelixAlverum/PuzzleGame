// Prozeduraler Sound mit der Web Audio API (siehe Vault: 02 Design/Sounds).
// Materialgeräusche aus gefiltertem Rauschen, Combo-Töne als Kalimba in Pentatonik,
// leiser Wind + gelegentliche Vögel als Atmosphäre. Keine Audiodateien.
(function (root) {
  'use strict';

  const PENTA = [0, 2, 4, 7, 9];
  const BASE = 392; // G4
  const note = i => BASE * Math.pow(2, (12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5]) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);

  const A = {
    ctx: null, out: null, sfx: null, amb: null, noise: null,
    enabled: true, paused: false, birdTimer: 7,

    // Muss aus einer Nutzergeste heraus aufgerufen werden (Autoplay-Regeln der Browser)
    unlock() {
      if (this.ctx) { this.apply(); return; }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.out = ctx.createGain(); this.out.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.out);
      this.amb = ctx.createGain(); this.amb.gain.value = 0.6; this.amb.connect(this.out);
      const len = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startWind();
      this.apply();
    },

    // YouTube-Stummschaltung und Pause: dann darf kein Ton ausgegeben werden
    setEnabled(on) { this.enabled = on; this.apply(); },
    setPaused(p) { this.paused = p; this.apply(); },
    apply() {
      if (!this.ctx) return;
      const on = this.enabled && !this.paused;
      this.out.gain.value = on ? 1 : 0;
      if (on) this.ctx.resume(); else this.ctx.suspend();
    },
    ok() { return !!this.ctx && this.enabled && !this.paused; },

    env(g, t, vol, attack, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    },

    tone(freq, dur, vol, { type = 'sine', at = 0, attack = 0.004, to = 0, dest = this.sfx } = {}) {
      const c = this.ctx, t = c.currentTime + at;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + dur);
      this.env(g, t, vol, attack, dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + attack + dur + 0.05);
    },

    hiss(freq, q, dur, vol, { type = 'bandpass', at = 0, attack = 0.003, dest = this.sfx } = {}) {
      const c = this.ctx, t = c.currentTime + at;
      const s = c.createBufferSource(); s.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      this.env(g, t, vol, attack, dur);
      s.connect(f); f.connect(g); g.connect(dest);
      s.start(t, Math.random() * 1.5); s.stop(t + attack + dur + 0.05);
    },

    kalimba(freq, vol = 0.22, at = 0) {
      this.tone(freq, 1.3, vol, { at, attack: 0.003 });
      this.tone(freq * 2, 0.5, vol * 0.18, { at, attack: 0.003 });
      this.tone(freq * 5.4, 0.12, vol * 0.08, { at, attack: 0.002 });
      this.hiss(freq * 3, 3, 0.02, vol * 0.15, { at });
    },

    pickup() {
      if (!this.ok()) return;
      this.hiss(rnd(2500, 3500), 0.8, 0.06, 0.05, { type: 'highpass' });
    },

    place(mat) {
      if (!this.ok()) return;
      const p = rnd(0.95, 1.05); // leichte Variation, damit es nicht monoton klingt
      switch (mat) {
        case 'wood':
          this.tone(200 * p, 0.12, 0.45, { to: 120 * p });
          this.hiss(1100 * p, 2.5, 0.05, 0.3);
          this.tone(640 * p, 0.05, 0.08, { type: 'triangle' });
          break;
        case 'stone':
          this.hiss(2800 * p, 5, 0.035, 0.35);
          this.tone(1500 * p, 0.05, 0.14);
          this.tone(2300 * p, 0.03, 0.07);
          break;
        case 'moss':
          this.hiss(500 * p, 0.6, 0.16, 0.3, { type: 'lowpass', attack: 0.015 });
          this.tone(140 * p, 0.1, 0.12);
          break;
        case 'leaf':
        case 'petal':
          for (let i = 0; i < 4; i++) this.hiss(rnd(3000, 6500), 1.2, 0.05, 0.09, { at: i * rnd(0.025, 0.045) });
          this.tone(330 * p, 0.06, 0.06);
          break;
        case 'bark':
          for (let i = 0; i < 6; i++) this.hiss(rnd(1500, 3800), 6, 0.012, 0.2, { at: i * rnd(0.012, 0.03) });
          this.tone(180 * p, 0.08, 0.2, { to: 130 * p });
          break;
      }
    },

    clear(mats, combo, lines) {
      if (!this.ok()) return;
      for (const m of mats) {
        switch (m) {
          case 'wood': for (let i = 0; i < 5; i++) this.hiss(rnd(900, 1800), 3, 0.03, 0.18, { at: i * 0.04 }); break;
          case 'stone': for (let i = 0; i < 6; i++) this.hiss(rnd(2000, 4000), 4, 0.02, 0.12, { at: rnd(0, 0.25) }); break;
          case 'moss': this.hiss(700, 0.5, 0.35, 0.12, { type: 'lowpass', attack: 0.05 }); break;
          case 'leaf':
          case 'petal': this.hiss(4500, 0.7, 0.45, 0.06, { type: 'highpass', attack: 0.08 }); break;
          case 'bark': for (let i = 0; i < 4; i++) this.hiss(rnd(1200, 2600), 5, 0.015, 0.15, { at: i * 0.05 }); break;
        }
      }
      // Jede Combo-Stufe einen Ton höher – Pentatonik klingt immer harmonisch
      const i = Math.min(combo - 1, 9) + 3;
      this.kalimba(note(i));
      if (lines >= 2) this.kalimba(note(i + 2), 0.16, 0.06);
      if (lines >= 3) this.kalimba(note(i + 4), 0.14, 0.12);
    },

    invalid() { if (this.ok()) this.tone(200, 0.08, 0.15, { type: 'triangle', to: 150 }); },
    grow(stage) { if (this.ok()) this.kalimba(note(10 + stage), 0.07, 0.15); },
    gardenComplete() { if (this.ok()) [0, 2, 4, 5, 7, 10].forEach((k, j) => this.kalimba(note(5 + k), 0.16, 0.2 + j * 0.09)); },
    newBest() { if (this.ok()) [0, 2, 4, 7].forEach((k, j) => this.kalimba(note(5 + k), 0.15, j * 0.12)); },
    gameOver() { if (this.ok()) [4, 2, 0].forEach((k, j) => this.kalimba(note(k), 0.18, j * 0.22)); },
    boardCleared() {
      if (!this.ok()) return;
      for (let j = 0; j < 8; j++) this.kalimba(note(8 + j), 0.12, j * 0.05);
      this.hiss(1200, 0.5, 0.8, 0.08, { type: 'lowpass', attack: 0.2 });
    },

    startWind() {
      const c = this.ctx;
      const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
      const g = c.createGain(); g.gain.value = 0.035;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
      const depth = c.createGain(); depth.gain.value = 0.025;
      lfo.connect(depth); depth.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(this.amb);
      src.start(); lfo.start();
    },

    chirp() {
      const f = rnd(2600, 3400), n = 2 + Math.floor(rnd(0, 3));
      for (let j = 0; j < n; j++) {
        this.tone(f * rnd(0.95, 1.05), 0.06, 0.035, { at: j * rnd(0.1, 0.16), to: f * 1.35, dest: this.amb });
      }
    },

    // Vom Spiel-Loop aufgerufen – läuft also nicht, wenn das Spiel pausiert ist
    update(dt) {
      if (!this.ok()) return;
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) { this.birdTimer = rnd(9, 22); this.chirp(); }
    },
  };

  root.Sound = A;
})(self);
