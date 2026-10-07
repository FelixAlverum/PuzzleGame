// Garten-Anzeige: Meta-Fortschritt über alle Runden (Nischen-Feature, siehe Vault: Konkurrenzanalyse).
// Jede aufgelöste Linie lässt eine Pflanze wachsen; sind alle 5 erblüht, folgt der nächste Garten.
// Jedes Biom (Wiese, Teich, Tropen) hat einen eigenen Garten mit eigenen Pflanzen, Farben und Hintergrund.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  // leaves: 'pair' = Blattpaare am Stiel, 'blade' = Schwertblätter aus dem Grund, 'pad' = Schwimmblätter
  // frame: Material des Spielfeld-Rahmens
  const THEMES = [
    {
      id: 'meadow', ground: 'soil', frame: 'wood',
      stem: '#4c8a36', leaf: '#5fa548', leafScale: 1, mound: '#7a5538',
      panel: 'rgba(255,255,255,0.32)', label: 'rgba(55,80,40,0.85)',
      sky: ['#f4ecd8', '#e6e4c6', '#c5d5a0'], deco: 'leaves',
      species: [
        { kind: 'cup',   petal: '#e2483a', dark: '#a82a20', center: '#2b1d14', tall: 1.0 },   // Mohn
        { kind: 'daisy', petal: '#f3c531', dark: '#d99a1c', center: '#6b4220', tall: 1.15 },  // Sonnenblume
        { kind: 'spike', petal: '#9b7fd8', dark: '#6f55b0', tall: 0.95 },                     // Lavendel
        { kind: 'bell',  petal: '#6688e3', dark: '#4561b8', tall: 0.9 },                      // Glockenblume
        { kind: 'daisy', petal: '#fbfaf2', dark: '#d8d3c0', center: '#f2c230', tall: 0.95 },  // Margerite
      ],
    },
    {
      id: 'pond', ground: 'water', frame: 'stone',
      stem: '#3f7f4a', leaf: '#4f9a5a', leafScale: 1, mound: '#5d6b4a',
      panel: 'rgba(230,248,255,0.34)', label: 'rgba(30,70,85,0.9)',
      sky: ['#e8f2ee', '#d2e6e2', '#a3cdc8'], deco: 'pads',
      species: [
        { kind: 'lily',    petal: '#fdf0f4', dark: '#eba6c2', center: '#f2c230', tall: 1.0 },                 // Seerose
        { kind: 'lotus',   petal: '#f5a3c0', dark: '#d9688f', center: '#e9d36a', tall: 0.95, leaves: 'pad' }, // Lotus
        { kind: 'iris',    petal: '#f4d23e', dark: '#c99a1a', tall: 1.0, leaves: 'blade' },                   // Sumpf-Schwertlilie
        { kind: 'cattail', petal: '#7a4e2c', dark: '#553219', tall: 1.1, leaves: 'blade' },                   // Rohrkolben
        { kind: 'spike',   petal: '#7d8be0', dark: '#5563b8', tall: 0.95 },                                   // Hechtkraut
      ],
    },
    {
      id: 'tropics', ground: 'jungle', frame: 'bamboo',
      stem: '#2f7a3a', leaf: '#2f9a4e', leafScale: 1.45, mound: '#5a3a22',
      panel: 'rgba(255,248,225,0.34)', label: 'rgba(40,75,35,0.9)',
      sky: ['#fbe9cb', '#f1dcb0', '#9fd0a0'], deco: 'palms',
      species: [
        { kind: 'hibiscus',   petal: '#e8344a', dark: '#a81c30', center: '#7a0f1e', tall: 1.0 },   // Hibiskus
        { kind: 'bird',       petal: '#f39a1e', dark: '#d0661a', center: '#3d5bc4', tall: 0.95 },  // Strelitzie
        { kind: 'orchid',     petal: '#e08ad8', dark: '#a54aa0', center: '#f7e15a', tall: 0.95 },  // Orchidee
        { kind: 'frangipani', petal: '#fdf8ec', dark: '#e8d8b4', center: '#f6c63a', tall: 1.0 },   // Frangipani
        { kind: 'spike',      petal: '#e64a3a', dark: '#b52a1e', tall: 1.05 },                     // Fackelingwer
      ],
    },
  ];

  const theme = biome => THEMES.find(th => th.id === biome) || THEMES[0];
  // Jeder erblühte Garten bringt die nächste Pflanzenart des Bioms, danach geht es von vorn los
  function species(biome, level) {
    const th = theme(biome);
    return th.species[level % th.species.length];
  }

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill();
  }

  const petal = (ctx, len, wid, angle, color) => Mat.leaf(ctx, 0, 0, Math.max(0.1, len), Math.max(0.1, wid), angle, color, false);

  // Seerose/Lotus von der Seite: Fächer aus spitzen Blättern, hinten dunkler
  function fan(ctx, r, sp, open) {
    const spread = 2.4 * (0.35 + 0.65 * open);
    for (let k = 0; k < 7; k++) petal(ctx, r * (0.75 + 0.25 * open), r * 0.3, -Math.PI / 2 + (k / 6 - 0.5) * spread, sp.dark);
    for (let k = 0; k < 5; k++) petal(ctx, r * 0.75, r * 0.3, -Math.PI / 2 + (k / 4 - 0.5) * spread * 0.6, sp.petal);
    ellipse(ctx, 0, -r * 0.12, r * 0.18 * open, r * 0.1 * open, sp.center);
  }

  function flower(ctx, x, y, r, sp, open, t) {
    ctx.save();
    ctx.translate(x, y);
    switch (sp.kind) {
      case 'daisy': {
        const n = 12;
        ctx.strokeStyle = sp.dark; ctx.lineWidth = Math.max(0.5, r * 0.04);
        for (let k = 0; k < n; k++) {
          ctx.save();
          ctx.rotate(k / n * TAU + t * 0.1);
          ctx.beginPath(); ctx.ellipse(r * 0.55 * open, 0, r * 0.45 * open + 0.1, r * 0.14, 0, 0, TAU);
          ctx.fillStyle = sp.petal; ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ellipse(ctx, 0, 0, r * 0.3, r * 0.3, sp.center);
        break;
      }
      case 'cup':
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU - Math.PI / 2;
          ellipse(ctx, Math.cos(a) * r * 0.35 * open, Math.sin(a) * r * 0.35 * open, r * 0.5 * (0.6 + 0.4 * open), r * 0.5 * (0.6 + 0.4 * open), k % 2 ? sp.petal : sp.dark);
        }
        ellipse(ctx, 0, 0, r * 0.45 * open, r * 0.45 * open, sp.petal);
        ellipse(ctx, 0, 0, r * 0.2, r * 0.2, sp.center);
        break;
      case 'bell':
        ctx.strokeStyle = '#4c8a36'; ctx.lineWidth = Math.max(1, r * 0.08);
        for (let k = -1; k <= 1; k++) {
          const bx = k * r * 0.7, by = r * (0.35 + Math.abs(k) * 0.15), w = r * 0.55 * (0.5 + 0.5 * open), h = r * 0.6;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(bx * 0.6, -r * 0.2, bx, by - h * 0.2); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bx - w / 2, by + h * 0.6);
          ctx.quadraticCurveTo(bx - w / 2, by - h * 0.3, bx, by - h * 0.3);
          ctx.quadraticCurveTo(bx + w / 2, by - h * 0.3, bx + w / 2, by + h * 0.6);
          ctx.quadraticCurveTo(bx, by + h * 0.4, bx - w / 2, by + h * 0.6);
          ctx.fillStyle = sp.petal; ctx.fill();
        }
        break;
      case 'lily':
      case 'lotus':
        fan(ctx, r * (sp.kind === 'lotus' ? 1.15 : 1), sp, open);
        break;
      case 'iris':   // drei hängende und drei aufrechte Blütenblätter
        petal(ctx, r * 0.9 * (0.5 + 0.5 * open), r * 0.32, 0.55, sp.petal);
        petal(ctx, r * 0.9 * (0.5 + 0.5 * open), r * 0.32, Math.PI - 0.55, sp.petal);
        petal(ctx, r * 0.6 * open, r * 0.12, 0.6, sp.dark);
        petal(ctx, r * 0.6 * open, r * 0.12, Math.PI - 0.6, sp.dark);
        for (const a of [-0.35, 0, 0.35]) petal(ctx, r * (0.6 + 0.3 * open), r * 0.2, -Math.PI / 2 + a * (0.4 + 0.6 * open), sp.petal);
        break;
      case 'cattail': {  // brauner Kolben mit dünner Spitze
        const h = r * (1.0 + 0.6 * open), w = r * (0.3 + 0.15 * open);
        ctx.strokeStyle = '#6f7a46'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -h * 0.5); ctx.lineTo(0, -h * 0.5 - r * 0.6); ctx.stroke();
        const p = new Path2D(); Mat.rrect(p, -w / 2, -h * 0.5, w, h, [w / 2, w / 2, w / 2, w / 2]);
        ctx.fillStyle = sp.petal; ctx.fill(p);
        ctx.fillStyle = sp.dark; ctx.fillRect(w * 0.1, -h * 0.4, w * 0.25, h * 0.8);
        if (open > 0.6) for (let k = 0; k < 3; k++) ellipse(ctx, Math.sin(t * 0.8 + k * 2) * w, -h * 0.2 * k - Math.cos(t + k) * r * 0.2, r * 0.07, r * 0.07, 'rgba(255,248,230,0.75)');
        break;
      }
      case 'hibiscus':   // fünf breite Blätter, langer Griffel mit Pollen
        for (let k = 0; k < 5; k++) {
          ctx.save();
          ctx.rotate(k / 5 * TAU + 0.3);
          ellipse(ctx, r * 0.42 * open, 0, r * 0.48 * (0.55 + 0.45 * open), r * 0.38 * (0.55 + 0.45 * open), k % 2 ? sp.petal : sp.dark);
          ctx.restore();
        }
        ellipse(ctx, 0, 0, r * 0.4 * open, r * 0.4 * open, sp.petal);
        ellipse(ctx, 0, 0, r * 0.18, r * 0.18, sp.center);
        ctx.strokeStyle = '#f7e9b0'; ctx.lineWidth = Math.max(1, r * 0.06); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.55 * open, -r * 0.55 * open); ctx.stroke();
        for (let k = 0; k < 4; k++) ellipse(ctx, r * (0.45 + k * 0.04) * open, -r * (0.55 - k * 0.05) * open, r * 0.06, r * 0.06, '#f6c63a');
        break;
      case 'bird':   // Strelitzie: grüne „Schnabel“-Scheide, orange Kamm, blaue Zunge
        petal(ctx, r * 1.5, r * 0.22, -0.12, '#4d7a43');
        for (const [a, l] of [[-1.15, 1.0], [-1.45, 1.15], [-1.75, 0.95]]) {
          ctx.save(); ctx.translate(r * 0.25, -r * 0.08);
          petal(ctx, r * l * open, r * 0.16, a + (1 - open) * 1.0, a === -1.45 ? sp.dark : sp.petal);
          ctx.restore();
        }
        ctx.save(); ctx.translate(r * 0.3, -r * 0.08);
        petal(ctx, r * 0.75 * open, r * 0.14, -0.6, sp.center);
        ctx.restore();
        break;
      case 'orchid':
        petal(ctx, r * 0.85 * (0.5 + 0.5 * open), r * 0.18, -Math.PI / 2, sp.petal);         // Kelchblätter
        petal(ctx, r * 0.8 * (0.5 + 0.5 * open), r * 0.18, Math.PI / 2 + 0.7, sp.petal);
        petal(ctx, r * 0.8 * (0.5 + 0.5 * open), r * 0.18, Math.PI / 2 - 0.7, sp.petal);
        ellipse(ctx, -r * 0.42 * open, -r * 0.1, r * 0.38 * open, r * 0.3, sp.petal);       // Seitenblätter
        ellipse(ctx, r * 0.42 * open, -r * 0.1, r * 0.38 * open, r * 0.3, sp.petal);
        ellipse(ctx, 0, r * 0.28 * open, r * 0.26, r * 0.24 * (0.5 + 0.5 * open), sp.dark); // Lippe
        ellipse(ctx, 0, r * 0.1, r * 0.1, r * 0.08, sp.center);
        break;
      case 'frangipani':  // fünf gedrehte Blätter, gelbe Mitte
        for (let k = 0; k < 5; k++) {
          ctx.save();
          ctx.rotate(k / 5 * TAU + t * 0.05);
          ellipse(ctx, r * 0.45 * open, r * 0.13, r * 0.5 * (0.5 + 0.5 * open), r * 0.27, sp.petal);
          ctx.strokeStyle = sp.dark; ctx.lineWidth = Math.max(0.5, r * 0.03);
          ctx.beginPath(); ctx.ellipse(r * 0.45 * open, r * 0.13, Math.max(0.1, r * 0.5 * (0.5 + 0.5 * open)), r * 0.27, 0, 0, TAU); ctx.stroke();
          ctx.restore();
        }
        ellipse(ctx, 0, 0, r * 0.26, r * 0.26, sp.center);
        ellipse(ctx, 0, 0, r * 0.12, r * 0.12, '#fbe58a');
        break;
    }
    ctx.restore();
  }

  // Seerose: wächst flach auf dem Wasser – erst Schwimmblätter, dann Knospe und Blüte
  function lilyPlant(ctx, x, y, g, sp, th, t, i, fr) {
    const bob = Math.sin(t * 1.2 + i * 1.7) * fr * 0.04;
    const pad = clamp(g / 3);
    const pads = [[0, 0, 1], [-0.7, 0.12, 0.6], [0.75, 0.1, 0.5]];
    pads.forEach(([dx, dy, s], k) => {
      const grow = clamp(pad * 3 - k);
      if (grow <= 0) return;
      const rx = fr * (0.3 + 0.7 * grow) * s * 1.1, px = x + dx * fr, py = y - fr * 0.05 + dy * fr + bob;
      ellipse(ctx, px, py + rx * 0.08, rx, rx * 0.3, 'rgba(20,60,70,0.25)');
      ellipse(ctx, px, py, rx, rx * 0.3, k ? '#5aa864' : th.leaf);
      ctx.strokeStyle = 'rgba(30,70,40,0.55)'; ctx.lineWidth = Math.max(0.6, rx * 0.06);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + rx * 0.85, py + rx * 0.12); ctx.stroke();
    });
    const bud = clamp(g - 3), bloom = clamp(g - 4);
    if (bud > 0 && bloom < 1) ellipse(ctx, x, y - fr * 0.2 * bud + bob, fr * 0.16 * bud, fr * 0.25 * bud, bloom > 0 ? sp.dark : '#7fb35a');
    if (bloom > 0) flower(ctx, x, y - fr * 0.08 + bob, fr * (0.65 + 0.65 * bloom), sp, bloom, t + i);
  }

  function plant(ctx, x, y, H, g, sp, th, t, i, fr) {
    const water = th.ground === 'water';
    if (water) {                                                          // Wasserring statt Erdhügel
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, fr * 0.05);
      const k = 0.85 + 0.15 * Math.sin(t * 1.5 + i);
      ctx.beginPath(); ctx.ellipse(x, y, fr * 0.9 * k, fr * 0.22 * k, 0, 0, TAU); ctx.stroke();
    } else {
      ellipse(ctx, x, y, fr * 0.9, fr * 0.28, th.mound);
    }
    if (sp.kind === 'lily') { lilyPlant(ctx, x, y, g, sp, th, t, i, fr); return; }
    if (g < 0.25) { ellipse(ctx, x, y - fr * 0.15, fr * 0.18, fr * 0.12, water ? '#8fbf6a' : '#d8b878'); return; } // Saatkorn

    const grow = clamp((g - 0.25) / 3.75);
    const h = H * (0.12 + 0.88 * grow);
    const sway = Math.sin(t * 1.3 + i * 1.9) * H * 0.04 * (0.3 + grow);
    const P0 = { x, y }, C = { x: x - sway * 0.3, y: y - h * 0.55 }, P2 = { x: x + sway, y: y - h };
    const at = u => ({
      x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * C.x + u * u * P2.x,
      y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * C.y + u * u * P2.y,
    });

    const leaves = sp.leaves || 'pair';
    if (leaves === 'blade') {                         // Schwertblätter hinter dem Stiel
      for (const [dx, a, l] of [[-0.2, -0.25, 0.75], [0.15, 0.2, 0.9], [0.3, 0.45, 0.6], [-0.35, -0.5, 0.55]]) {
        const len = H * l * (0.25 + 0.75 * grow);
        Mat.leaf(ctx, x + dx * fr, y, len, len * 0.09, -Math.PI / 2 + a + sway / H, th.leaf);
      }
    } else if (leaves === 'pad') {                   // runde Lotusblätter auf dem Wasser
      for (const s of [-1, 1]) {
        const rx = fr * (0.35 + 0.5 * grow);
        ellipse(ctx, x + s * fr * 0.85, y - fr * 0.05, rx, rx * 0.3, th.leaf);
        ellipse(ctx, x + s * fr * 0.85, y - fr * 0.08, rx * 0.25, rx * 0.08, 'rgba(255,255,255,0.25)');
      }
    }

    ctx.strokeStyle = th.stem; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, H * 0.03);
    ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.quadraticCurveTo(C.x, C.y, P2.x, P2.y); ctx.stroke();

    if (leaves === 'pair') {
      const pairs = Math.max(1, Math.round(1 + grow * 2.5));
      for (let k = 0; k < pairs; k++) {
        const u = 0.18 + k * 0.22;
        if (u > 0.8) break;
        const p = at(u);
        const len = H * 0.2 * th.leafScale * clamp(grow * 2 - k * 0.3, 0.25, 1);
        Mat.leaf(ctx, p.x, p.y, len, len * (th.leafScale > 1 ? 0.45 : 0.38), k % 2 ? -0.5 : Math.PI + 0.5, th.leaf);
      }
    }

    const bud = clamp(g - 3), bloom = clamp(g - 4);
    if (sp.kind === 'spike') {                       // Ährenblüte entlang der Spitze
      const n = Math.round(10 * bud);
      for (let k = 0; k < n; k++) {
        const p = at(1 - k * 0.035);
        const col = bloom > k / 10 ? (k % 2 ? sp.petal : sp.dark) : '#8fb36a';
        ellipse(ctx, p.x + (k % 2 ? 1 : -1) * fr * 0.12, p.y, fr * 0.12, fr * 0.08, col);
      }
      return;
    }
    if (sp.kind === 'cattail') {                     // Kolben wächst schon als Knospe sichtbar
      if (bud > 0) flower(ctx, P2.x, P2.y + fr * 0.4, fr * 0.6 * (0.5 + 0.5 * bud), sp, bloom, t + i);
      return;
    }
    if (bud > 0 && bloom < 1) ellipse(ctx, P2.x, P2.y - fr * 0.15 * bud, fr * 0.2 * bud, fr * 0.3 * bud, bloom > 0 ? sp.petal : '#7fb35a');
    if (bloom > 0) flower(ctx, P2.x, P2.y, fr * (0.4 + 0.6 * bloom), sp, bloom, t + i);
  }

  function ground(ctx, R, soilY, th, t) {
    if (th.ground === 'water') {
      const wg = ctx.createLinearGradient(0, soilY, 0, R.y + R.h);
      wg.addColorStop(0, '#7fc0cc'); wg.addColorStop(1, '#3a7d93');
      ctx.fillStyle = wg;
      ctx.fillRect(R.x, soilY - R.h * 0.02, R.w, R.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, R.h * 0.012); ctx.lineCap = 'round';
      const step = Math.max(14, R.h * 0.22);
      for (let k = 0; k < 3; k++) {                              // wandernde Wellenstriche
        const yy = soilY + R.h * (0.03 + 0.055 * k);
        for (let gx = R.x - step + ((t * 6 * (k + 1)) % step); gx < R.x + R.w; gx += step) {
          const xx = gx + (k % 2) * step * 0.5;
          ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + step * 0.15, yy - R.h * 0.012, xx + step * 0.3, yy); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(R.x, soilY - R.h * 0.02, R.w, Math.max(1, R.h * 0.012));
      ctx.strokeStyle = '#5f8a4a'; ctx.lineWidth = Math.max(1, R.h * 0.014);   // Schilf an den Rändern
      for (const [bx, s] of [[R.x + R.h * 0.06, 1], [R.x + R.w - R.h * 0.06, -1]]) {
        for (let k = 0; k < 4; k++) {
          const x0 = bx + s * k * R.h * 0.035, hh = R.h * (0.28 + 0.08 * (k % 2));
          ctx.beginPath(); ctx.moveTo(x0, soilY + 2); ctx.quadraticCurveTo(x0, soilY - hh * 0.6, x0 + s * hh * 0.15 + Math.sin(t + k) * 2, soilY - hh); ctx.stroke();
        }
      }
      return;
    }
    if (th.ground === 'jungle') {                                // große Blätter im Hintergrund
      ctx.save(); ctx.globalAlpha = 0.55;
      Mat.leaf(ctx, R.x - R.h * 0.05, soilY, R.h * 0.6, R.h * 0.24, -0.9 + Math.sin(t * 0.7) * 0.03, '#3f8f4c');
      Mat.leaf(ctx, R.x + R.w + R.h * 0.05, soilY, R.h * 0.55, R.h * 0.22, Math.PI + 0.85 + Math.sin(t * 0.6) * 0.03, '#3a8446');
      ctx.restore();
    }
    ctx.fillStyle = Mat.pattern(ctx, 'soil', R.x, soilY, R.h * 0.12);
    ctx.fillRect(R.x, soilY, R.w, R.h);
    ctx.fillStyle = 'rgba(40,25,10,0.35)';
    ctx.fillRect(R.x, soilY, R.w, Math.max(1, R.h * 0.02));
    if (th.ground === 'jungle') {                                // kleine Farnwedel statt Gras
      const step = Math.max(7, R.h * 0.09);
      for (let gx = R.x + 3, k = 0; gx < R.x + R.w; gx += step, k++) {
        const len = R.h * (0.07 + 0.03 * (k % 3));
        Mat.leaf(ctx, gx, soilY + 1, len, len * 0.3, -Math.PI / 2 + (k % 2 ? 0.5 : -0.5) + Math.sin(t + gx) * 0.08, k % 2 ? '#3f9a4e' : '#2f7a3a', false);
      }
      return;
    }
    ctx.strokeStyle = '#6fa64e'; ctx.lineWidth = Math.max(1, R.h * 0.012); ctx.lineCap = 'round';
    for (let gx = R.x + 4; gx < R.x + R.w; gx += Math.max(5, R.h * 0.07)) {   // Grashalme
      const hh = R.h * (0.04 + 0.04 * ((gx * 7) % 3) / 3);
      ctx.beginPath(); ctx.moveTo(gx, soilY + 1); ctx.lineTo(gx + Math.sin(t + gx) * 2, soilY - hh); ctx.stroke();
    }
  }

  // R: Rechteck, view: { biome, level, plots: Wachstum je Beet 0..5 (float) }
  function draw(ctx, R, view, t, label) {
    const sp = species(view.biome, view.level), th = theme(view.biome);
    const n = view.plots.length;
    ctx.save();
    const panel = new Path2D();
    Mat.rrect(panel, R.x, R.y, R.w, R.h, [R.h * 0.12, R.h * 0.12, R.h * 0.12, R.h * 0.12]);
    ctx.fillStyle = th.panel;
    ctx.fill(panel);
    ctx.clip(panel);

    const soilY = R.y + R.h * 0.8;
    ground(ctx, R, soilY, th, t);

    const H = Math.min(R.h * 0.62, (R.w / n) * 1.8) * sp.tall;
    const fr = Math.min((R.w / n) * 0.32, H * 0.2);
    for (let i = 0; i < n; i++) plant(ctx, R.x + R.w * (i + 0.5) / n, soilY + R.h * 0.03, H, view.plots[i], sp, th, t, i, fr);

    ctx.font = `700 ${Math.max(10, Math.min(R.h * 0.11, R.w * 0.055))}px ${root.FONT}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = th.label;
    ctx.fillText(label, R.x + R.h * 0.08, R.y + R.h * 0.07, R.w - R.h * 0.45);   // Platz für den Reset-Knopf
    ctx.restore();
  }

  // Bildschirm-Hintergrund passend zum Thema (wird von main.js in ein Offscreen-Canvas gemalt)
  function backdrop(g, W, H, biome) {
    const th = theme(biome);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.6, th.sky[1]); sky.addColorStop(1, th.sky[2]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    const big = Math.max(W, H) * 0.35;
    g.save();
    g.globalAlpha = 0.16;
    if (th.deco === 'pads') {            // Seerosenblätter und Wellenringe
      const pad = (x, y, r, a, col) => {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, a + 0.25, a + TAU - 0.25); g.closePath(); g.fill();
      };
      pad(-big * 0.05, H * 0.88, big * 0.5, -0.6, '#3f8a5a');
      pad(W + big * 0.05, H * 0.12, big * 0.42, 2.6, '#3f8a5a');
      pad(W * 0.88, H + big * 0.1, big * 0.35, -1.8, '#4f9a6a');
      g.strokeStyle = '#2f6f86'; g.lineWidth = Math.max(1.5, big * 0.012);
      for (const [x, y, r] of [[W * 0.15, H * 0.2, big * 0.12], [W * 0.82, H * 0.6, big * 0.1]]) {
        for (let k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(x, y, r * k * 0.6, r * k * 0.25, 0, 0, TAU); g.stroke(); }
      }
    } else if (th.deco === 'palms') {    // Palmwedel aus den Ecken
      const frond = (x, y, a, len) => {
        for (let k = -3; k <= 3; k++) Mat.leaf(g, x, y, len * (1 - Math.abs(k) * 0.08), len * 0.09, a + k * 0.22, k % 2 ? '#2f8a4a' : '#3f9a52', false);
      };
      frond(-big * 0.05, -big * 0.05, 0.8, big * 1.1);
      frond(W + big * 0.05, H * 0.55, Math.PI - 0.2, big * 0.9);
      Mat.leaf(g, -big * 0.1, H * 0.95, big, big * 0.4, -0.9, '#2f8a4a', false);
    } else {                             // große, weiche Blattsilhouetten am Rand
      Mat.leaf(g, -big * 0.1, H * 0.9, big, big * 0.35, -0.9, '#6f9a4a', false);
      Mat.leaf(g, W + big * 0.1, H * 0.15, big * 0.8, big * 0.3, Math.PI + 0.7, '#6f9a4a', false);
      Mat.leaf(g, W * 0.9, H + big * 0.05, big * 0.7, big * 0.26, -2.0, '#7fa85a', false);
    }
    g.restore();
  }

  root.Garden = { draw, backdrop, species, theme, THEMES };
})(self);
