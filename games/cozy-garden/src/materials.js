// Prozedurale Naturtexturen + Zeichnen der Formen (siehe Vault: 02 Design/Art-Stil und Materialien).
// Keine Bilddateien: alles wird beim Start in Offscreen-Canvases gemalt → winziges Bundle.
(function (root) {
  'use strict';

  const TEX = 512;        // Kantenlänge einer Textur-Kachel in px
  const TEX_CELLS = 4;    // eine Kachel deckt 4×4 Spielfeldzellen ab
  const TAU = Math.PI * 2;
  const textures = {};
  const patternCache = new WeakMap(); // ctx → { name: CanvasPattern }

  function mulberry(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Zeichnet fn an allen Kachel-Kopien in Randnähe → nahtlos kachelbare Texturen
  function wrapDraw(x, y, margin, fn) {
    for (const dx of [-TEX, 0, TEX]) {
      for (const dy of [-TEX, 0, TEX]) {
        const X = x + dx, Y = y + dy;
        if (X > -margin && X < TEX + margin && Y > -margin && Y < TEX + margin) fn(X, Y);
      }
    }
  }

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function blotches(g, R, n, rMin, rMax, colors) {
    for (let i = 0; i < n; i++) {
      const x = R() * TEX, y = R() * TEX, r = rMin + R() * (rMax - rMin);
      const col = colors[Math.floor(R() * colors.length)];
      wrapDraw(x, y, r, (X, Y) => {
        const gr = g.createRadialGradient(X, Y, 0, X, Y, r);
        gr.addColorStop(0, rgba(col, col[3]));
        gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr;
        g.fillRect(X - r, Y - r, 2 * r, 2 * r);
      });
    }
  }

  function specks(g, R, n, rMin, rMax, colors) {
    for (let i = 0; i < n; i++) {
      const x = R() * TEX, y = R() * TEX, r = rMin + R() * (rMax - rMin);
      g.fillStyle = colors[Math.floor(R() * colors.length)];
      wrapDraw(x, y, r, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, TAU); g.fill(); });
    }
  }

  const GEN = {
    wood(R, g) {
      g.fillStyle = '#a8743f'; g.fillRect(0, 0, TEX, TEX);
      for (let i = 0; i < 16; i++) {
        const y = R() * TEX, h = 8 + R() * 40;
        g.fillStyle = R() < 0.5 ? 'rgba(255,214,160,0.10)' : 'rgba(80,40,12,0.12)';
        for (const dy of [-TEX, 0, TEX]) g.fillRect(0, y + dy, TEX, h);
      }
      for (let i = 0; i < 80; i++) {
        const y0 = R() * TEX, amp = 1 + R() * 9, k = 1 + Math.floor(R() * 3), ph = R() * TAU;
        g.lineWidth = 0.6 + R() * 2.4;
        g.strokeStyle = R() < 0.75 ? `rgba(70,35,12,${0.12 + R() * 0.28})` : `rgba(255,220,170,${0.08 + R() * 0.15})`;
        for (const dy of [-TEX, 0, TEX]) {
          g.beginPath();
          for (let x = 0; x <= TEX; x += 8) {
            const y = y0 + dy + amp * Math.sin((x / TEX) * k * TAU + ph);
            if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.stroke();
        }
      }
      for (let i = 0; i < 3; i++) {   // Astlöcher
        const x = R() * TEX, y = R() * TEX, rx = 8 + R() * 10;
        wrapDraw(x, y, rx * 2, (X, Y) => {
          g.fillStyle = 'rgba(70,35,12,0.55)';
          g.beginPath(); g.ellipse(X, Y, rx * 0.35, rx * 0.2, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(70,35,12,0.3)'; g.lineWidth = 1.5;
          for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(X, Y, rx * k * 0.5, rx * k * 0.25, 0, 0, TAU); g.stroke(); }
        });
      }
    },

    stone(R, g) {
      g.fillStyle = '#8e959b'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 70, 30, 120, [[255, 255, 255, 0.10], [40, 45, 55, 0.12], [150, 130, 110, 0.10]]);
      specks(g, R, 2600, 0.5, 1.8, ['rgba(40,40,45,0.35)', 'rgba(255,255,255,0.35)', 'rgba(120,100,80,0.3)']);
      g.strokeStyle = 'rgba(235,235,230,0.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const x = R() * TEX, y = R() * TEX, a = R() * TAU;
        wrapDraw(x, y, 90, (X, Y) => {
          g.beginPath(); g.moveTo(X, Y);
          g.quadraticCurveTo(X + Math.cos(a) * 40 + 10, Y + Math.sin(a) * 40 - 10, X + Math.cos(a) * 80, Y + Math.sin(a) * 80);
          g.stroke();
        });
      }
    },

    moss(R, g) {
      g.fillStyle = '#5d8a34'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 60, 20, 80, [[160, 190, 70, 0.25], [30, 70, 20, 0.25]]);
      const greens = ['#7fae45', '#4a7428', '#9cc25a', '#3c6322', '#86b24e'];
      g.lineCap = 'round';
      for (let i = 0; i < 4200; i++) {
        const x = R() * TEX, y = R() * TEX, len = 3 + R() * 6, a = -Math.PI / 2 + (R() - 0.5) * 1.8;
        g.strokeStyle = greens[Math.floor(R() * greens.length)];
        g.globalAlpha = 0.55 + R() * 0.4;
        g.lineWidth = 1 + R() * 1.4;
        wrapDraw(x, y, 10, (X, Y) => { g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len); g.stroke(); });
      }
      g.globalAlpha = 1;
      specks(g, R, 300, 0.8, 1.6, ['rgba(220,230,130,0.8)']);
    },

    leaf(R, g) {
      g.fillStyle = '#4c9a4a'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 50, 30, 110, [[120, 190, 90, 0.20], [25, 80, 35, 0.20], [255, 255, 255, 0.06]]);
      g.lineCap = 'round';
      // Hauptadern diagonal (x − y = k), Seitenadern schräg davon – Abstände teilen 512 → nahtlos
      for (let k = -2 * TEX; k <= 2 * TEX; k += 128) {
        g.strokeStyle = 'rgba(215,250,190,0.40)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(k - TEX, -TEX); g.lineTo(k + 2 * TEX, 2 * TEX); g.stroke();
        g.strokeStyle = 'rgba(215,250,190,0.22)'; g.lineWidth = 1.3;
        for (let t = -TEX; t <= 2 * TEX; t += 32) {
          const x = k + t, y = t;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 * 0.996, y - 40 * 0.087); g.stroke();
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - 40 * 0.087, y + 40 * 0.996); g.stroke();
        }
      }
    },

    petal(R, g) {
      g.fillStyle = '#ee93b4'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 60, 30, 110, [[250, 200, 220, 0.35], [215, 95, 140, 0.25], [255, 255, 255, 0.12]]);
      g.lineCap = 'round';
      for (let i = 0; i < 260; i++) {
        const x = R() * TEX, y = R() * TEX, len = 20 + R() * 40, bend = (R() - 0.5) * 16;
        g.strokeStyle = R() < 0.6 ? 'rgba(255,255,255,0.20)' : 'rgba(200,70,120,0.16)';
        g.lineWidth = 0.8 + R();
        wrapDraw(x, y, len + 20, (X, Y) => {
          g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + bend, Y + len / 2, X, Y + len); g.stroke();
        });
      }
    },

    bark(R, g) {   // Birkenrinde
      g.fillStyle = '#ebe3d2'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 40, 30, 90, [[200, 190, 170, 0.25], [255, 255, 250, 0.3]]);
      for (let i = 0; i < 280; i++) {
        const x = R() * TEX, y = R() * TEX, rx = 4 + R() * 22, ry = 0.8 + R() * 1.8;
        g.fillStyle = `rgba(55,48,42,${0.5 + R() * 0.4})`;
        wrapDraw(x, y, rx + 2, (X, Y) => { g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, TAU); g.fill(); });
      }
      for (let i = 0; i < 9; i++) {
        const x = R() * TEX, y = R() * TEX;
        g.fillStyle = 'rgba(40,35,30,0.8)';
        wrapDraw(x, y, 60, (X, Y) => {
          for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(X + k * 9 - 14, Y + (k % 2) * 3, 14, 4 + k % 3, 0, 0, TAU); g.fill(); }
        });
      }
    },

    cap(R, g) {    // Pilzhut
      g.fillStyle = '#b8452f'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 60, 30, 100, [[120, 30, 20, 0.35], [235, 130, 95, 0.25]]);
      specks(g, R, 600, 0.6, 1.5, ['rgba(90,20,10,0.35)', 'rgba(255,200,170,0.3)']);
    },

    soil(R, g) {
      g.fillStyle = '#4a3324'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 70, 20, 90, [[30, 18, 10, 0.35], [110, 80, 55, 0.2]]);
      specks(g, R, 3200, 0.5, 1.8, ['rgba(20,12,6,0.5)', 'rgba(150,115,80,0.35)', 'rgba(90,70,50,0.5)']);
      for (let i = 0; i < 40; i++) {
        const x = R() * TEX, y = R() * TEX, r = 2 + R() * 4;
        wrapDraw(x, y, r + 2, (X, Y) => {
          g.fillStyle = 'rgba(120,105,90,0.9)'; g.beginPath(); g.ellipse(X, Y, r, r * 0.75, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(X - r * 0.3, Y - r * 0.3, r * 0.35, r * 0.25, 0, 0, TAU); g.fill();
        });
      }
    },
  };

  // Senkrechte Streifen über die volle Höhe sind von selbst nahtlos (Schilf, Bambus)
  function stripes(g, R, n, wMin, wMax, colors) {
    for (let i = 0; i < n; i++) {
      const x = R() * TEX, w = wMin + R() * (wMax - wMin);
      g.fillStyle = colors[Math.floor(R() * colors.length)];
      for (const dx of [-TEX, 0, TEX]) g.fillRect(x + dx, 0, w, TEX);
    }
  }

  // Biom-Materialien: Teich (Schilf, Seerosenblatt) und Tropen (Bananenblatt, Hibiskus, Bambus)
  Object.assign(GEN, {
    reed(R, g) {
      g.fillStyle = '#b5a467'; g.fillRect(0, 0, TEX, TEX);
      stripes(g, R, 90, 2, 9, ['rgba(120,130,50,0.35)', 'rgba(220,210,140,0.30)', 'rgba(90,85,40,0.25)']);
      stripes(g, R, 160, 0.6, 1.6, ['rgba(60,60,25,0.35)', 'rgba(250,240,190,0.35)']);
      for (let i = 0; i < 26; i++) {      // Knoten der Halme
        const x = R() * TEX, y = R() * TEX, w = 6 + R() * 10;
        wrapDraw(x, y, w, (X, Y) => {
          g.fillStyle = 'rgba(90,80,35,0.45)'; g.fillRect(X - w / 2, Y, w, 2);
          g.fillStyle = 'rgba(250,240,200,0.4)'; g.fillRect(X - w / 2, Y + 2, w, 1);
        });
      }
    },

    lily(R, g) {   // Seerosenblätter: runde Pads mit strahlenförmigen Adern
      g.fillStyle = '#4f9a58'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 50, 30, 100, [[120, 190, 110, 0.22], [25, 80, 45, 0.22], [180, 220, 240, 0.08]]);
      for (let i = 0; i < 16; i++) {
        const x = R() * TEX, y = R() * TEX, r = 45 + R() * 50, rays = 12 + Math.floor(R() * 6), a0 = R() * TAU;
        wrapDraw(x, y, r + 4, (X, Y) => {
          g.strokeStyle = 'rgba(200,240,180,0.22)'; g.lineWidth = 1.4;
          for (let k = 0; k < rays; k++) {
            const a = a0 + k / rays * TAU;
            g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); g.stroke();
          }
          g.strokeStyle = 'rgba(30,70,40,0.25)'; g.lineWidth = 2;
          g.beginPath(); g.arc(X, Y, r, 0, TAU); g.stroke();
        });
      }
      specks(g, R, 260, 1, 2.6, ['rgba(220,245,255,0.35)']);   // Wassertropfen
    },

    palm(R, g) {   // Bananenblatt: feine parallele Seitenadern, ab und zu ein Riss
      g.fillStyle = '#3e9a4a'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 50, 30, 110, [[110, 200, 90, 0.22], [20, 80, 35, 0.22]]);
      for (let y = 0; y < TEX; y += 8) {
        g.fillStyle = (y / 8) % 2 ? 'rgba(220,255,190,0.16)' : 'rgba(20,70,30,0.14)';
        g.fillRect(0, y, TEX, (y / 8) % 4 === 0 ? 2.4 : 1.2);
      }
      for (let i = 0; i < 7; i++) {
        const x = R() * TEX, y = Math.floor(R() * 64) * 8 + 4, w = 30 + R() * 70;
        wrapDraw(x, y, w, (X, Y) => { g.fillStyle = 'rgba(255,250,200,0.25)'; g.fillRect(X, Y - 1, w, 2); });
      }
    },

    hibiscus(R, g) {
      g.fillStyle = '#d93448'; g.fillRect(0, 0, TEX, TEX);
      blotches(g, R, 60, 30, 110, [[255, 120, 130, 0.30], [140, 20, 40, 0.30], [255, 230, 230, 0.10]]);
      g.lineCap = 'round';
      for (let i = 0; i < 240; i++) {
        const x = R() * TEX, y = R() * TEX, len = 25 + R() * 45, bend = (R() - 0.5) * 20;
        g.strokeStyle = R() < 0.55 ? 'rgba(120,10,30,0.22)' : 'rgba(255,200,200,0.18)';
        g.lineWidth = 0.8 + R();
        wrapDraw(x, y, len + 20, (X, Y) => {
          g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + bend, Y + len / 2, X, Y + len); g.stroke();
        });
      }
    },

    bamboo(R, g) {   // Halme mit Knoten im Abstand einer Zelle (128 px teilt 512 → nahtlos)
      g.fillStyle = '#a3be52'; g.fillRect(0, 0, TEX, TEX);
      stripes(g, R, 60, 4, 14, ['rgba(140,160,60,0.30)', 'rgba(250,240,160,0.25)']);
      stripes(g, R, 120, 0.6, 1.4, ['rgba(80,90,30,0.30)', 'rgba(255,250,210,0.30)']);
      for (let y = 0; y < TEX; y += 128) {
        g.fillStyle = 'rgba(95,95,35,0.55)'; g.fillRect(0, y + 60, TEX, 5);
        g.fillStyle = 'rgba(255,250,210,0.45)'; g.fillRect(0, y + 65, TEX, 2);
        g.fillStyle = 'rgba(70,70,25,0.18)'; g.fillRect(0, y + 52, TEX, 8);
      }
    },
  });

  function build() {
    Object.keys(GEN).forEach((name, i) => {
      const c = document.createElement('canvas');
      c.width = c.height = TEX;
      GEN[name](mulberry(1234 + i * 97), c.getContext('2d'));
      textures[name] = c;
    });
  }

  // Muster an (ox, oy) ausgerichtet: bewegte Formen „nehmen ihre Textur mit“
  function pattern(ctx, name, ox, oy, cs) {
    let cache = patternCache.get(ctx);
    if (!cache) patternCache.set(ctx, cache = {});
    const p = cache[name] || (cache[name] = ctx.createPattern(textures[name], 'repeat'));
    const k = (cs * TEX_CELLS) / TEX;
    p.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
    return p;
  }

  function rrect(p, x, y, w, h, r) { // r = [tl, tr, br, bl]
    const [tl, tr, br, bl] = r;
    p.moveTo(x + tl, y);
    p.lineTo(x + w - tr, y);
    if (tr) p.arcTo(x + w, y, x + w, y + tr, tr); else p.lineTo(x + w, y);
    p.lineTo(x + w, y + h - br);
    if (br) p.arcTo(x + w, y + h, x + w - br, y + h, br); else p.lineTo(x + w, y + h);
    p.lineTo(x + bl, y + h);
    if (bl) p.arcTo(x, y + h, x, y + h - bl, bl); else p.lineTo(x, y + h);
    p.lineTo(x, y + tl);
    if (tl) p.arcTo(x, y, x + tl, y, tl); else p.lineTo(x, y);
    p.closePath();
  }

  // Blatt-Silhouette, Basis bei (x, y), zeigt in Richtung angle
  function leaf(ctx, x, y, len, wid, angle, color, vein = true) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
    ctx.fillStyle = color; ctx.fill();
    if (vein) {
      ctx.strokeStyle = 'rgba(255,255,230,0.45)'; ctx.lineWidth = Math.max(0.6, wid * 0.12);
      ctx.beginPath(); ctx.moveTo(len * 0.08, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
    }
    ctx.restore();
  }

  const FILL_MAT = { cap: 'cap', stem: 'leaf' };
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  /**
   * Zeichnet Zellen als zusammenhängende Formen (Auto-Tiling über die Form-ID p).
   * cells: [{ r, c, m, p, a }] relativ zu (ox, oy); cs = Zellgröße in px.
   * opt: alpha, noShadow, dy(cell) → Versatz, tint(cell) → Farbüberlagerung oder null
   */
  function renderCells(ctx, cells, ox, oy, cs, opt = {}) {
    if (!cells.length) return;
    const map = new Map();
    for (const cl of cells) map.set(cl.r * 1000 + cl.c, cl);
    const same = (cl, dr, dc) => {
      const n = map.get((cl.r + dr) * 1000 + cl.c + dc);
      return !!n && n.p === cl.p;
    };
    const g = cs * 0.05, rad = cs * 0.22, o = 0.5; // o: Überlappung gegen Haarlinien
    const all = new Path2D(), byMat = {}, geo = [];

    for (const cl of cells) {
      const x = ox + cl.c * cs, y = oy + cl.r * cs + (opt.dy ? opt.dy(cl) : 0);
      const L = !same(cl, 0, -1), R = !same(cl, 0, 1), T = !same(cl, -1, 0), B = !same(cl, 1, 0);
      const m = FILL_MAT[cl.a] || cl.m;
      const path = byMat[m] || (byMat[m] = new Path2D());
      for (const p of [path, all]) {
        rrect(p, x + g, y + g, cs - 2 * g, cs - 2 * g, [T && L ? rad : 0, T && R ? rad : 0, B && R ? rad : 0, B && L ? rad : 0]);
        if (!R) p.rect(x + cs - g - o, y + g, 2 * g + 2 * o, cs - 2 * g);
        if (!B) p.rect(x + g, y + cs - g - o, cs - 2 * g, 2 * g + 2 * o);
        if (!R && !B && same(cl, 1, 1)) p.rect(x + cs - g - o, y + cs - g - o, 2 * g + 2 * o, 2 * g + 2 * o);
      }
      geo.push({ cl, x, y, L, R, T, B });
    }

    ctx.save();
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (!opt.noShadow) {
      ctx.save();
      ctx.translate(cs * 0.03, cs * 0.08);
      ctx.fillStyle = 'rgba(35,20,8,0.32)';
      ctx.fill(all);
      ctx.restore();
    }
    for (const m in byMat) {
      ctx.fillStyle = pattern(ctx, m, ox, oy, cs);
      ctx.fill(byMat[m]);
    }

    // Licht oben/links, Schatten unten/rechts an offenen Kanten → greifbare Blöcke
    ctx.save();
    ctx.clip(all);
    const e = cs * 0.09;
    for (const { cl, x, y, L, R, T, B } of geo) {
      if (T) { ctx.fillStyle = 'rgba(255,250,235,0.30)'; ctx.fillRect(x, y + g, cs, e); }
      if (L) { ctx.fillStyle = 'rgba(255,250,235,0.18)'; ctx.fillRect(x + g, y, e, cs); }
      if (B) { ctx.fillStyle = 'rgba(30,15,5,0.30)'; ctx.fillRect(x, y + cs - g - e, cs, e); }
      if (R) { ctx.fillStyle = 'rgba(30,15,5,0.20)'; ctx.fillRect(x + cs - g - e, y, e, cs); }
      const tint = opt.tint && opt.tint(cl);
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(x - 1, y - 1, cs + 2, cs + 2); }
    }
    ctx.restore();

    for (const it of geo) if (it.cl.a) drawAccent(ctx, it, cs, same);
    ctx.restore();
  }

  function circle(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function drawAccent(ctx, { cl, x, y }, cs, same) {
    const cx = x + cs / 2, cy = y + cs / 2;
    const toward = DIRS.find(([dr, dc]) => same(cl, dr, dc)) || [0, 1];
    switch (cl.a) {
      case 'stamen': // Blütenmitte
        circle(ctx, cx, cy, cs * 0.22, '#f4c542');
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * TAU;
          circle(ctx, cx + Math.cos(a) * cs * 0.11, cy + Math.sin(a) * cs * 0.11, cs * 0.03, '#c27f22');
        }
        circle(ctx, cx - cs * 0.06, cy - cs * 0.07, cs * 0.05, 'rgba(255,255,255,0.55)');
        break;
      case 'cap': { // weiße Punkte auf dem Pilzhut
        const flip = (cl.r + cl.c) % 2 ? -1 : 1;
        circle(ctx, cx - flip * cs * 0.18, cy - cs * 0.12, cs * 0.09, '#fbf3e6');
        circle(ctx, cx + flip * cs * 0.16, cy - cs * 0.18, cs * 0.06, '#fbf3e6');
        circle(ctx, cx + flip * cs * 0.06, cy + cs * 0.15, cs * 0.1, '#fbf3e6');
        break;
      }
      case 'stem': { // Tulpenstiel zur Blüte hin
        const [dr, dc] = toward;
        ctx.strokeStyle = '#2f6b2a'; ctx.lineWidth = cs * 0.1; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - dc * cs * 0.3, cy - dr * cs * 0.3);
        ctx.lineTo(cx + dc * cs * 0.5, cy + dr * cs * 0.5);
        ctx.stroke();
        leaf(ctx, cx, cy, cs * 0.38, cs * 0.14, Math.atan2(dr, dc) + 2.4, '#6fb553');
        break;
      }
      case 'leaflet': { // kleines Blatt am Zweigende, zeigt nach außen
        const [dr, dc] = toward;
        leaf(ctx, cx, cy, cs * 0.5, cs * 0.18, Math.atan2(-dr, -dc) - 0.5, '#6bb04f');
        break;
      }
      case 'rings': // Jahresringe am Stammende
        circle(ctx, cx, cy, cs * 0.34, 'rgba(236,196,140,0.85)');
        ctx.strokeStyle = 'rgba(110,60,25,0.6)'; ctx.lineWidth = cs * 0.025;
        for (const r of [0.28, 0.2, 0.12]) { ctx.beginPath(); ctx.arc(cx, cy, cs * r, 0, TAU); ctx.stroke(); }
        circle(ctx, cx, cy, cs * 0.04, 'rgba(110,60,25,0.8)');
        break;
      case 'sprout': // Keimling auf Moos
        ctx.strokeStyle = '#8cc95a'; ctx.lineWidth = cs * 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, cy + cs * 0.2); ctx.quadraticCurveTo(cx + cs * 0.05, cy, cx, cy - cs * 0.12); ctx.stroke();
        leaf(ctx, cx, cy - cs * 0.1, cs * 0.3, cs * 0.12, -2.5, '#a6db6e');
        leaf(ctx, cx, cy - cs * 0.1, cs * 0.3, cs * 0.12, -0.65, '#a6db6e');
        break;
      case 'lotus': { // Seerosenblüte auf dem Blatt
        for (let k = 0; k < 8; k++) leaf(ctx, cx, cy, cs * 0.36, cs * 0.12, k / 8 * TAU, '#f2a0bf', false);
        for (let k = 0; k < 6; k++) leaf(ctx, cx, cy, cs * 0.24, cs * 0.1, k / 6 * TAU + 0.3, '#fdeef3', false);
        circle(ctx, cx, cy, cs * 0.08, '#f2c230');
        break;
      }
      case 'cattail': { // brauner Kolben, Spitze zeigt vom Halm weg
        const [dr, dc] = toward;
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(Math.atan2(-dr, -dc));
        ctx.strokeStyle = '#6f7a46'; ctx.lineWidth = cs * 0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cs * 0.2, 0); ctx.lineTo(cs * 0.44, 0); ctx.stroke();
        const p = new Path2D(); rrect(p, -cs * 0.34, -cs * 0.13, cs * 0.56, cs * 0.26, [cs * 0.13, cs * 0.13, cs * 0.13, cs * 0.13]);
        ctx.fillStyle = '#7a4e2c'; ctx.fill(p);
        ctx.fillStyle = 'rgba(40,20,8,0.35)'; ctx.fillRect(-cs * 0.26, cs * 0.02, cs * 0.42, cs * 0.07);
        ctx.fillStyle = 'rgba(255,230,190,0.3)'; ctx.fillRect(-cs * 0.26, -cs * 0.09, cs * 0.42, cs * 0.04);
        ctx.restore();
        break;
      }
      case 'pistil': // Hibiskus: dunkle Mitte, langer Griffel mit Pollen
        circle(ctx, cx, cy, cs * 0.17, '#7a0f1e');
        ctx.strokeStyle = '#f7e9b0'; ctx.lineWidth = cs * 0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + cs * 0.3, cy - cs * 0.3); ctx.stroke();
        for (let k = 0; k < 5; k++) circle(ctx, cx + cs * (0.22 + k * 0.025), cy - cs * (0.32 - k * 0.035), cs * 0.04, '#f6c63a');
        break;
      case 'node': // Bambus: kleiner Blattzweig am Knoten
        ctx.strokeStyle = '#6f8a2a'; ctx.lineWidth = cs * 0.04; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - cs * 0.1, cy + cs * 0.1); ctx.lineTo(cx + cs * 0.12, cy - cs * 0.12); ctx.stroke();
        leaf(ctx, cx + cs * 0.1, cy - cs * 0.1, cs * 0.36, cs * 0.09, -0.4, '#5fae4a');
        leaf(ctx, cx + cs * 0.1, cy - cs * 0.1, cs * 0.32, cs * 0.08, -1.5, '#4f9a3e');
        leaf(ctx, cx - cs * 0.02, cy + cs * 0.02, cs * 0.3, cs * 0.08, 2.6, '#6bb54e');
        break;
      case 'lichen': // Flechten auf der Steinplatte
        for (const [dx, dy, r] of [[-0.15, -0.1, 0.12], [0.12, 0.05, 0.09], [-0.02, 0.18, 0.07], [0.2, -0.18, 0.06]]) {
          circle(ctx, cx + dx * cs, cy + dy * cs, r * cs, 'rgba(205,214,150,0.8)');
        }
        break;
    }
  }

  root.Mat = { build, pattern, renderCells, leaf, rrect, circle };
})(self);
