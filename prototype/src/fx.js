// Partikel und schwebende Texte (siehe Vault: 02 Design/Animationen).
// Leitidee: nichts explodiert – Holz splittert, Stein bröselt, Blätter wehen, Blüten fallen.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  const COLORS = {
    wood: ['#c48b4f', '#8a5a2b', '#e0b07a'],
    stone: ['#9aa1a7', '#6d7378', '#c3c7ca'],
    moss: ['#a6d05a', '#6f9a3a', '#d6e48a'],
    leaf: ['#5fae52', '#3f8a3c', '#8acb6a'],
    petal: ['#f4a6c3', '#e77aa2', '#fbd3e2'],
    bark: ['#efe7d6', '#d9cfbb', '#ffffff'],
    cap: ['#c4523a', '#e07a5c', '#fbf3e6'],
  };

  const FX = {
    parts: [],
    texts: [],
    time: 0,

    reset() { this.parts.length = 0; this.texts.length = 0; },

    add(p) {
      this.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, drag: 0, rot: rnd(0, TAU), vr: 0, ph: rnd(0, TAU), sway: 0 }, p, { max: p.life }));
    },

    // Auflösen einer Zelle – Effekt je Material
    burst(mat, x, y, cs) {
      const col = COLORS[mat] || COLORS.wood;
      switch (mat) {
        case 'wood':
          for (let i = 0; i < 4; i++) this.add({ kind: 'splinter', x, y, size: cs * rnd(0.25, 0.4), color: pick(col), vx: rnd(-1, 1) * cs * 4, vy: -rnd(2, 5) * cs, g: cs * 18, vr: rnd(-12, 12), life: 0.7 });
          break;
        case 'stone':
          for (let i = 0; i < 7; i++) this.add({ kind: 'crumb', x: x + rnd(-0.3, 0.3) * cs, y: y + rnd(-0.3, 0.3) * cs, size: cs * rnd(0.05, 0.11), color: pick(col), vx: rnd(-1, 1) * cs * 1.2, vy: -rnd(0.5, 2.5) * cs, g: cs * 22, life: 0.8 });
          break;
        case 'moss':
          for (let i = 0; i < 9; i++) this.add({ kind: 'spore', x: x + rnd(-0.3, 0.3) * cs, y: y + rnd(-0.3, 0.3) * cs, size: cs * rnd(0.03, 0.06), color: pick(col), vx: rnd(-0.6, 0.6) * cs, vy: -rnd(0.5, 1.5) * cs, g: -cs * 0.4, drag: 1.2, life: rnd(0.8, 1.2) });
          break;
        case 'leaf':
          for (let i = 0; i < 2; i++) this.add({ kind: 'leaf', x, y, size: cs * rnd(0.35, 0.5), color: pick(col), vx: rnd(0.5, 2.5) * cs, vy: -rnd(0.5, 1.5) * cs, g: cs * 2, sway: cs * 2, vr: rnd(-3, 3), life: rnd(1.1, 1.5) });
          break;
        case 'petal':
          for (let i = 0; i < 5; i++) this.add({ kind: 'petal', x: x + rnd(-0.3, 0.3) * cs, y, size: cs * rnd(0.12, 0.2), color: pick(col), vx: rnd(-1, 1) * cs, vy: -rnd(0.5, 1.8) * cs, g: cs * 1.6, sway: cs * 2.5, vr: rnd(-5, 5), life: rnd(1.1, 1.5) });
          break;
        case 'bark':
          for (let i = 0; i < 3; i++) this.add({ kind: 'curl', x, y, size: cs * rnd(0.15, 0.25), color: pick(col), vx: rnd(-1, 1) * cs * 2.5, vy: -rnd(1.5, 3.5) * cs, g: cs * 12, vr: rnd(-14, 14), life: 0.8 });
          break;
        case 'cap':
          for (let i = 0; i < 6; i++) this.add({ kind: 'crumb', x, y, size: cs * rnd(0.05, 0.1), color: pick(col), vx: rnd(-1, 1) * cs * 2, vy: -rnd(1, 3) * cs, g: cs * 18, life: 0.7 });
          break;
      }
    },

    // Erdkrümel beim Ablegen
    dust(x, y, cs) {
      for (let i = 0; i < 2; i++) this.add({ kind: 'crumb', x: x + rnd(-0.4, 0.4) * cs, y, size: cs * rnd(0.03, 0.06), color: pick(['#6b4a33', '#8a6a4c', '#4a3324']), vx: rnd(-1, 1) * cs * 1.5, vy: -rnd(1, 2) * cs, g: cs * 20, life: 0.4 });
    },

    sparkle(x, y, cs, n, colors) {
      for (let i = 0; i < n; i++) this.add({ kind: 'spark', x: x + rnd(-0.5, 0.5) * cs, y: y + rnd(-0.5, 0.5) * cs, size: cs * rnd(0.06, 0.12), color: pick(colors), vx: rnd(-0.5, 0.5) * cs, vy: -rnd(0.3, 1.2) * cs, drag: 1, life: rnd(0.6, 1.0) });
    },

    // Windstoß bei Mehrfach-Auflösung: Blätter fegen von links übers Feld
    gust(rect, cs) {
      for (let i = 0; i < 14; i++) this.add({ kind: 'leaf', x: rect.x - rnd(0, 2) * cs, y: rect.y + rnd(0, 1) * rect.h, size: cs * rnd(0.3, 0.5), color: pick(COLORS.leaf.concat(['#c9a14a', '#d07a3a'])), vx: rnd(6, 10) * cs, vy: rnd(-1, 0.5) * cs, g: cs * 0.5, sway: cs * 3, vr: rnd(-6, 6), life: rnd(1.0, 1.6) });
    },

    petalRain(rect, cs, n, colors) {
      for (let i = 0; i < n; i++) this.add({ kind: 'petal', x: rect.x + rnd(0, 1) * rect.w, y: rect.y - rnd(0, 0.6) * rect.h, size: cs * rnd(0.12, 0.22), color: pick(colors || COLORS.petal), vx: rnd(-0.5, 0.5) * cs, vy: rnd(0.5, 2) * cs, g: cs * 1.2, sway: cs * 2.5, vr: rnd(-5, 5), life: rnd(1.6, 2.6) });
    },

    fireflies(rect, cs, n) {
      for (let i = 0; i < n; i++) this.add({ kind: 'firefly', x: rect.x + rnd(0, 1) * rect.w, y: rect.y + rnd(0.2, 1) * rect.h, size: cs * rnd(0.06, 0.1), color: '#fff3a0', vx: rnd(-0.6, 0.6) * cs, vy: -rnd(0.2, 0.9) * cs, sway: cs * 0.8, life: rnd(1.8, 2.8) });
    },

    text(str, x, y, size, color, opt = {}) {
      this.texts.push({ str, x, y, size, color, t: -(opt.delay || 0), dur: opt.dur || 1.1, rise: opt.rise != null ? opt.rise : size * 1.6 });
    },

    update(dt) {
      this.time += dt;
      const t = this.time;
      for (const p of this.parts) {
        if (p.sway) p.vx += Math.sin(t * 4 + p.ph) * p.sway * dt * 3;
        if (p.drag) { p.vx *= 1 - Math.min(1, p.drag * dt); p.vy *= 1 - Math.min(1, p.drag * dt); }
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
      }
      this.parts = this.parts.filter(p => p.life > 0);
      for (const tx of this.texts) tx.t += dt;
      this.texts = this.texts.filter(tx => tx.t < tx.dur);
    },

    draw(ctx) {
      for (const p of this.parts) {
        const a = clamp(p.life / (p.max * 0.4));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        switch (p.kind) {
          case 'splinter':
            ctx.fillRect(-p.size / 2, -p.size * 0.1, p.size, p.size * 0.2);
            break;
          case 'crumb':
            ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill();
            break;
          case 'spore':
          case 'firefly': {
            const glow = p.kind === 'firefly' ? 0.6 + 0.4 * Math.sin(this.time * 8 + p.ph) : 1;
            ctx.globalAlpha = a * glow * 0.35;
            ctx.beginPath(); ctx.arc(0, 0, p.size * 2.5, 0, TAU); ctx.fill();
            ctx.globalAlpha = a * glow;
            ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill();
            break;
          }
          case 'leaf':
            Mat.leaf(ctx, -p.size / 2, 0, p.size, p.size * 0.38, 0, p.color);
            break;
          case 'petal':
            ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU); ctx.fill();
            break;
          case 'curl':
            ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 1.4); ctx.stroke();
            break;
          case 'spark':
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const r = k % 2 ? p.size * 0.35 : p.size;
              ctx.lineTo(Math.cos(k / 8 * TAU) * r, Math.sin(k / 8 * TAU) * r);
            }
            ctx.closePath(); ctx.fill();
            break;
        }
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const tx of this.texts) {
        if (tx.t < 0) continue;
        const k = tx.t / tx.dur;
        const pop = tx.t < 0.15 ? 0.6 + 0.4 * Math.sin((tx.t / 0.15) * Math.PI / 2) * 1.1 : 1;
        ctx.save();
        ctx.globalAlpha = clamp((1 - k) / 0.3);
        ctx.translate(tx.x, tx.y - tx.rise * (1 - Math.pow(1 - k, 2)));
        ctx.scale(pop, pop);
        ctx.font = `800 ${tx.size}px ${FONT}`;
        ctx.strokeStyle = 'rgba(45,30,15,0.85)';
        ctx.lineWidth = tx.size * 0.18;
        ctx.strokeText(tx.str, 0, 0);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.str, 0, 0);
        ctx.restore();
      }
    },
  };

  root.FX = FX;
  root.FONT = FONT;
})(self);
