// Prozeduraler Sound mit der Web Audio API (siehe Vault: 02 Design/Sounds).
// Materialgeräusche aus gefiltertem Rauschen, Combo-Töne als Kalimba in Pentatonik,
// Atmosphäre und Hintergrundmusik je Biom. Keine Audiodateien.
// Drei getrennt regelbare Kanäle: Musik, Effekte (sfx), Atmosphäre (amb).
(function (root) {
  'use strict';

  const PENTA = [0, 2, 4, 7, 9];
  const BASE = 392; // G4
  const note = i => BASE * Math.pow(2, (12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5]) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const semi = (f, k) => f * Math.pow(2, k / 12);

  // Grundlautstärke je Kanal bei Regler = 100 %
  const BUS = { music: 0.32, sfx: 0.9, amb: 0.6 };

  // Musik je Biom: Akkordfolge (Halbtöne über root, ein Akkord pro Takt à 8 Achtel),
  // Melodie als Zufallsweg über die Pentatonik, Instrument und Dichte prägen die Stimmung.
  const SONGS = {
    meadow: {   // G-Dur, gemütlich: Kalimba über warmem Pad
      bpm: 84, root: 196, lead: 'kalimba', density: 0.45, bass: [0, 4], shaker: false,
      chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
    },
    pond: {     // D-Dur mit großen Septimen, langsam und schwebend: Glocken
      bpm: 62, root: 146.83, lead: 'bell', density: 0.22, bass: [0], shaker: false,
      chords: [[0, 4, 7, 11], [5, 9, 12, 16], [-3, 0, 4, 7], [5, 9, 12, 16]],
    },
    tropics: {  // F-Dur, beschwingt: Marimba, synkopierter Bass, Shaker
      bpm: 104, root: 174.61, lead: 'marimba', density: 0.5, bass: [0, 3, 6], shaker: true,
      chords: [[0, 4, 7], [2, 6, 9], [-1, 2, 6], [4, 7, 11]],
    },
  };

  const A = {
    ctx: null, out: null, sfx: null, amb: null, music: null, noise: null,
    enabled: true, paused: false, ambTimer: 7, ambTimer2: 12,
    vol: { music: 0.6, sfx: 1, amb: 1 },
    biome: 'meadow',
    mus: { next: 0, step: 0, lead: 7 },

    // Muss aus einer Nutzergeste heraus aufgerufen werden (Autoplay-Regeln der Browser)
    unlock() {
      if (this.ctx) { this.apply(); return; }
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.out = ctx.createGain(); this.out.connect(ctx.destination);
      for (const k of Object.keys(BUS)) { this[k] = ctx.createGain(); this[k].connect(this.out); }
      this.applyVolumes();
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

    // Regler 0..1 je Kanal; quadratisch, weil das Ohr Lautstärke logarithmisch hört
    setVolume(kind, v) {
      if (!(kind in BUS)) return;
      this.vol[kind] = Math.max(0, Math.min(1, v));
      this.applyVolumes();
    },
    applyVolumes() {
      if (!this.ctx) return;
      for (const k of Object.keys(BUS)) this[k].gain.setTargetAtTime(BUS[k] * this.vol[k] * this.vol[k], this.ctx.currentTime, 0.05);
    },

    // Musik und Atmosphäre folgen dem Biom; der Wechsel passiert weich am nächsten Ton
    setBiome(b) {
      if (!SONGS[b] || b === this.biome) return;
      this.biome = b;
      this.ambTimer = rnd(2, 6);
    },

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

    kalimba(freq, vol = 0.22, at = 0, dest = this.sfx) {
      this.tone(freq, 1.3, vol, { at, attack: 0.003, dest });
      this.tone(freq * 2, 0.5, vol * 0.18, { at, attack: 0.003, dest });
      this.tone(freq * 5.4, 0.12, vol * 0.08, { at, attack: 0.002, dest });
      this.hiss(freq * 3, 3, 0.02, vol * 0.15, { at, dest });
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
        case 'palm':
        case 'hibiscus':
          for (let i = 0; i < 4; i++) this.hiss(rnd(3000, 6500), 1.2, 0.05, 0.09, { at: i * rnd(0.025, 0.045) });
          this.tone(330 * p, 0.06, 0.06);
          break;
        case 'reed':   // trockenes Halmrascheln, etwas tiefer als Laub
          for (let i = 0; i < 5; i++) this.hiss(rnd(1800, 4200), 2, 0.04, 0.1, { at: i * rnd(0.02, 0.035) });
          this.tone(260 * p, 0.06, 0.08, { type: 'triangle' });
          break;
        case 'lily':   // weiches Platschen + Tropfen
          this.hiss(900 * p, 0.7, 0.14, 0.25, { type: 'lowpass', attack: 0.01 });
          this.tone(700 * p, 0.07, 0.12, { to: 1400 * p });
          break;
        case 'bark':
          for (let i = 0; i < 6; i++) this.hiss(rnd(1500, 3800), 6, 0.012, 0.2, { at: i * rnd(0.012, 0.03) });
          this.tone(180 * p, 0.08, 0.2, { to: 130 * p });
          break;
        case 'bamboo': // hohles Klopfen
          this.tone(430 * p, 0.12, 0.35, { type: 'triangle', to: 380 * p });
          this.tone(860 * p, 0.05, 0.1);
          this.hiss(1800 * p, 4, 0.03, 0.2);
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
          case 'petal':
          case 'reed':
          case 'palm':
          case 'hibiscus': this.hiss(4500, 0.7, 0.45, 0.06, { type: 'highpass', attack: 0.08 }); break;
          case 'lily': for (let i = 0; i < 3; i++) this.tone(rnd(600, 900), 0.08, 0.06, { at: i * 0.07, to: rnd(1300, 1800) }); break;
          case 'bark': for (let i = 0; i < 4; i++) this.hiss(rnd(1200, 2600), 5, 0.015, 0.15, { at: i * 0.05 }); break;
          case 'bamboo': for (let i = 0; i < 4; i++) this.tone(rnd(380, 520), 0.08, 0.12, { type: 'triangle', at: i * 0.05 }); break;
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
    // Kurzer Ton zum Ausprobieren der Lautstärke in den Einstellungen
    preview(kind) {
      if (!this.ok()) return;
      if (kind === 'sfx') this.kalimba(note(7), 0.2);
      else if (kind === 'amb') this.ambience(true);
    },

    // --- Atmosphäre ------------------------------------------------------------

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

    chirp() {   // Wiese: kurze Vogelrufe
      const f = rnd(2600, 3400), n = 2 + Math.floor(rnd(0, 3));
      for (let j = 0; j < n; j++) {
        this.tone(f * rnd(0.95, 1.05), 0.06, 0.035, { at: j * rnd(0.1, 0.16), to: f * 1.35, dest: this.amb });
      }
    },

    drip() {    // Teich: Tropfen ins Wasser
      const f = rnd(900, 1400);
      this.tone(f, 0.05, 0.05, { to: f * 2.2, dest: this.amb });
      this.tone(f * 0.6, 0.12, 0.015, { at: 0.03, dest: this.amb });
    },

    croak() {   // Teich: Frosch, zwei- bis dreimal
      const n = 2 + Math.floor(rnd(0, 2)), f = rnd(110, 150);
      for (let j = 0; j < n; j++) {
        this.tone(f, 0.12, 0.05, { type: 'sawtooth', at: j * 0.22, attack: 0.02, to: f * 0.8, dest: this.amb });
        this.hiss(f * 4, 3, 0.12, 0.03, { at: j * 0.22, dest: this.amb });
      }
    },

    whoop() {   // Tropen: gleitender Vogelruf
      const f = rnd(700, 1000), n = 1 + Math.floor(rnd(0, 3));
      for (let j = 0; j < n; j++) {
        this.tone(f, 0.22, 0.03, { at: j * 0.32, attack: 0.03, to: f * 1.7, dest: this.amb });
        this.tone(f * 1.7, 0.18, 0.025, { at: j * 0.32 + 0.24, to: f * 1.2, dest: this.amb });
      }
    },

    cicada() {  // Tropen: kurzes Zirpen im Hintergrund
      for (let j = 0; j < 14; j++) this.hiss(rnd(5200, 6200), 8, 0.03, 0.012, { at: j * 0.06, dest: this.amb });
    },

    ambience(main) {
      switch (this.biome) {
        case 'pond': if (main) this.croak(); else this.drip(); break;
        case 'tropics': if (main) this.whoop(); else this.cicada(); break;
        default: if (main) this.chirp(); break;
      }
    },

    // --- Musik -----------------------------------------------------------------

    pad(freqs, at, dur) {
      const c = this.ctx, t = c.currentTime + at;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = this.biome === 'pond' ? 700 : 1000;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.15);
      f.connect(g); g.connect(this.music);
      for (const fr of freqs) {
        for (const det of [-5, 5]) {
          const o = c.createOscillator(); o.type = 'triangle';
          o.frequency.value = fr; o.detune.value = det;
          o.connect(f); o.start(t); o.stop(t + dur * 1.2);
        }
      }
    },

    lead(kind, freq, at) {
      const dest = this.music;
      switch (kind) {
        case 'bell':
          this.tone(freq, 2.4, 0.16, { at, attack: 0.005, dest });
          this.tone(freq * 2.76, 0.9, 0.04, { at, attack: 0.003, dest });
          break;
        case 'marimba':
          this.tone(freq, 0.35, 0.22, { at, attack: 0.003, dest });
          this.tone(freq * 4, 0.08, 0.05, { at, attack: 0.002, dest });
          break;
        default:
          this.kalimba(freq, 0.16, at, dest);
      }
    },

    musicStep(song, step, at, stepDur) {
      const pos = step % 8, chord = song.chords[Math.floor(step / 8) % song.chords.length];
      if (pos === 0) this.pad(chord.map(k => semi(song.root, k)), at, stepDur * 8);
      if (song.bass.includes(pos)) {
        this.tone(semi(song.root / 2, chord[0]), stepDur * 2.2, 0.28, { at, attack: 0.01, dest: this.music });
      }
      if (song.shaker && pos % 2 === 1) this.hiss(7000, 1, 0.04, 0.05, { type: 'highpass', at, dest: this.music });
      // Melodie: Zufallsweg über die Pentatonik, betonte Zählzeiten häufiger
      const p = song.density * (pos % 2 === 0 ? 1.3 : 0.6);
      if (Math.random() < p) {
        const m = this.mus;
        m.lead = Math.max(4, Math.min(13, m.lead + Math.round(rnd(-2.4, 2.4))));
        const k = 12 * Math.floor(m.lead / 5) + PENTA[m.lead % 5];
        this.lead(song.lead, semi(song.root, k - 12), at);
      }
    },

    // Plant die Musik ein Stück im Voraus, damit sie auch bei ruckelnden Frames im Takt bleibt
    updateMusic() {
      const c = this.ctx, m = this.mus;
      if (this.vol.music <= 0) { m.next = 0; return; }
      const song = SONGS[this.biome], stepDur = 60 / song.bpm / 2;
      if (m.next < c.currentTime - 0.2) m.next = c.currentTime + 0.1;   // nach Pause oder Hänger neu einsetzen
      while (m.next < c.currentTime + 0.3) {
        this.musicStep(song, m.step, Math.max(0, m.next - c.currentTime), stepDur);
        m.next += stepDur;
        m.step += 1;
      }
    },

    // Vom Spiel-Loop aufgerufen – läuft also nicht, wenn das Spiel pausiert ist
    update(dt) {
      if (!this.ok()) return;
      this.updateMusic();
      if (this.vol.amb <= 0) return;
      this.ambTimer -= dt;
      if (this.ambTimer <= 0) { this.ambTimer = rnd(9, 22); this.ambience(true); }
      this.ambTimer2 -= dt;
      if (this.ambTimer2 <= 0) { this.ambTimer2 = this.biome === 'pond' ? rnd(2, 6) : rnd(12, 25); this.ambience(false); }
    },
  };

  root.Sound = A;
})(self);
