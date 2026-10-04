// Garten-Anzeige: Meta-Fortschritt über alle Runden (Nischen-Feature, siehe Vault: Konkurrenzanalyse).
// Jede aufgelöste Linie lässt eine Pflanze wachsen; sind alle 5 erblüht, folgt die nächste Blumenart.
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  const SPECIES = [
    { kind: 'cup',   petal: '#e2483a', dark: '#a82a20', center: '#2b1d14', tall: 1.0 },   // Mohn
    { kind: 'daisy', petal: '#f3c531', dark: '#d99a1c', center: '#6b4220', tall: 1.15 },  // Sonnenblume
    { kind: 'spike', petal: '#9b7fd8', dark: '#6f55b0', tall: 0.95 },                     // Lavendel
    { kind: 'bell',  petal: '#6688e3', dark: '#4561b8', tall: 0.9 },                      // Glockenblume
    { kind: 'daisy', petal: '#fbfaf2', dark: '#d8d3c0', center: '#f2c230', tall: 0.95 },  // Margerite
  ];
  const species = level => SPECIES[level % SPECIES.length];

  function ellipse(ctx, x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill();
  }

  function flower(ctx, x, y, r, sp, open, t) {
    ctx.save();
    ctx.translate(x, y);
    if (sp.kind === 'daisy') {
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
    } else if (sp.kind === 'cup') {
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * TAU - Math.PI / 2;
        ellipse(ctx, Math.cos(a) * r * 0.35 * open, Math.sin(a) * r * 0.35 * open, r * 0.5 * (0.6 + 0.4 * open), r * 0.5 * (0.6 + 0.4 * open), k % 2 ? sp.petal : sp.dark);
      }
      ellipse(ctx, 0, 0, r * 0.45 * open, r * 0.45 * open, sp.petal);
      ellipse(ctx, 0, 0, r * 0.2, r * 0.2, sp.center);
    } else if (sp.kind === 'bell') {
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
    }
    ctx.restore();
  }

  function plant(ctx, x, y, H, g, sp, t, i, fr) {
    ellipse(ctx, x, y, fr * 0.9, fr * 0.28, '#7a5538');                 // Erdhügel
    if (g < 0.25) { ellipse(ctx, x, y - fr * 0.15, fr * 0.18, fr * 0.12, '#d8b878'); return; } // Saatkorn

    const grow = clamp((g - 0.25) / 3.75);
    const h = H * (0.12 + 0.88 * grow);
    const sway = Math.sin(t * 1.3 + i * 1.9) * H * 0.04 * (0.3 + grow);
    const P0 = { x, y }, C = { x: x - sway * 0.3, y: y - h * 0.55 }, P2 = { x: x + sway, y: y - h };
    const at = u => ({
      x: (1 - u) * (1 - u) * P0.x + 2 * (1 - u) * u * C.x + u * u * P2.x,
      y: (1 - u) * (1 - u) * P0.y + 2 * (1 - u) * u * C.y + u * u * P2.y,
    });

    ctx.strokeStyle = '#4c8a36'; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, H * 0.03);
    ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.quadraticCurveTo(C.x, C.y, P2.x, P2.y); ctx.stroke();

    const pairs = Math.max(1, Math.round(1 + grow * 2.5));
    for (let k = 0; k < pairs; k++) {
      const u = 0.18 + k * 0.22;
      if (u > 0.8) break;
      const p = at(u);
      const len = H * 0.2 * clamp(grow * 2 - k * 0.3, 0.25, 1);
      Mat.leaf(ctx, p.x, p.y, len, len * 0.38, k % 2 ? -0.5 : Math.PI + 0.5, '#5fa548');
    }

    const bud = clamp(g - 3), bloom = clamp(g - 4);
    if (sp.kind === 'spike') {                       // Lavendel: Blüten entlang der Spitze
      const n = Math.round(10 * bud);
      for (let k = 0; k < n; k++) {
        const p = at(1 - k * 0.035);
        const col = bloom > k / 10 ? (k % 2 ? sp.petal : sp.dark) : '#8fb36a';
        ellipse(ctx, p.x + (k % 2 ? 1 : -1) * fr * 0.12, p.y, fr * 0.12, fr * 0.08, col);
      }
      return;
    }
    if (bud > 0 && bloom < 1) ellipse(ctx, P2.x, P2.y - fr * 0.15 * bud, fr * 0.2 * bud, fr * 0.3 * bud, bloom > 0 ? sp.petal : '#7fb35a');
    if (bloom > 0) flower(ctx, P2.x, P2.y, fr * (0.4 + 0.6 * bloom), sp, bloom, t + i);
  }

  // R: Rechteck, view: { level, plots: Wachstum je Beet 0..5 (float) }
  function draw(ctx, R, view, t, label) {
    const sp = species(view.level);
    const n = view.plots.length;
    ctx.save();
    const panel = new Path2D();
    Mat.rrect(panel, R.x, R.y, R.w, R.h, [R.h * 0.12, R.h * 0.12, R.h * 0.12, R.h * 0.12]);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fill(panel);
    ctx.clip(panel);

    const soilY = R.y + R.h * 0.8;
    ctx.fillStyle = Mat.pattern(ctx, 'soil', R.x, soilY, R.h * 0.12);
    ctx.fillRect(R.x, soilY, R.w, R.h);
    ctx.fillStyle = 'rgba(40,25,10,0.35)';
    ctx.fillRect(R.x, soilY, R.w, Math.max(1, R.h * 0.02));
    ctx.strokeStyle = '#6fa64e'; ctx.lineWidth = Math.max(1, R.h * 0.012); ctx.lineCap = 'round';
    for (let gx = R.x + 4; gx < R.x + R.w; gx += Math.max(5, R.h * 0.07)) {   // Grashalme
      const hh = R.h * (0.04 + 0.04 * ((gx * 7) % 3) / 3);
      ctx.beginPath(); ctx.moveTo(gx, soilY + 1); ctx.lineTo(gx + Math.sin(t + gx) * 2, soilY - hh); ctx.stroke();
    }

    const H = Math.min(R.h * 0.62, (R.w / n) * 1.8) * sp.tall;
    const fr = Math.min((R.w / n) * 0.32, H * 0.2);
    for (let i = 0; i < n; i++) plant(ctx, R.x + R.w * (i + 0.5) / n, soilY + R.h * 0.03, H, view.plots[i], sp, t, i, fr);

    ctx.font = `700 ${Math.max(10, R.h * 0.11)}px ${root.FONT}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(55,80,40,0.85)';
    ctx.fillText(`${label} ${view.level + 1}`, R.x + R.h * 0.08, R.y + R.h * 0.07);
    ctx.restore();
  }

  root.Garden = { draw, species, SPECIES };
})(self);
