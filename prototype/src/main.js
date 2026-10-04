// Einstieg: Layout, Eingabe, Spiel-Loop, Rendering, YouTube-Playables-Lebenszyklus.
(function () {
  'use strict';

  const { N } = Logic;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const randSeed = () => (Math.random() * 4294967296) >>> 0;

  const STR = {
    de: { best: 'Rekord', combo: 'Combo', hint: 'Ziehe eine Form aufs Beet', over: 'Der Garten ruht', again: 'Neu pflanzen', newBest: 'Neuer Rekord!', bloom: 'Der Garten blüht!', fresh: 'Frischer Boden!', garden: 'Garten' },
    en: { best: 'Best', combo: 'Combo', hint: 'Drag a piece onto the bed', over: 'The garden rests', again: 'Plant again', newBest: 'New best!', bloom: 'Your garden is in bloom!', fresh: 'Fresh soil!', garden: 'Garden' },
  };
  let S = STR.en;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, L = null, bg = null;

  // Spielzustand
  let game = null, garden = Logic.newGarden(), best = 0, hintDone = false;
  let bestAtStart = 0, newBestShown = false, shownScore = 0;
  // Darstellung
  let drag = null, returning = null, kb = null, lastPlaced = null, over = null;
  const drops = new Map();               // pid → Startzeit der Fall-Animation
  let dying = [];                        // Zellen, die sich gerade auflösen
  let trayPop = [0, 0, 0];               // Einblendzeitpunkt je Ablage-Slot
  let gardenView = { level: 0, plots: [0, 0, 0, 0, 0], hold: 0, holdLevel: 0 };
  // Ablauf
  let clock = 0, last = 0, raf = 0, paused = false, ready = false, readySignalled = false;
  let saveDirty = false, lastSave = 0;

  // --- Layout: muss in jedem Seitenverhältnis (9:32 … 32:9) spielbar sein -----------------

  function layout(w, h) {
    const pad = Math.max(8, Math.min(w, h) * 0.03);
    const portraitB = Math.min(w - 2 * pad, (h - 2 * pad) / 1.8);
    const landscapeB = Math.min(h - 2 * pad, (w - 2 * pad) / 1.95);
    const o = {};
    if (portraitB >= landscapeB) {
      const B = portraitB, x0 = (w - B) / 2, y0 = (h - B * 1.8) / 2;
      o.B = B;
      o.header = { x: x0, y: y0, w: B, h: B * 0.12 };
      o.garden = { x: x0, y: y0 + B * 0.13, w: B, h: B * 0.25 };
      o.board = { x: x0, y: y0 + B * 0.4, size: B };
      o.tray = [0, 1, 2].map(i => ({ x: x0 + i * B / 3, y: y0 + B * 1.42, w: B / 3, h: B * 0.38 }));
    } else {
      const B = landscapeB, x0 = (w - B * 1.95) / 2, y0 = (h - B) / 2;
      o.B = B;
      o.header = { x: x0, y: y0, w: B * 0.55, h: B * 0.2 };
      o.garden = { x: x0, y: y0 + B * 0.45, w: B * 0.55, h: B * 0.55 };
      o.board = { x: x0 + B * 0.59, y: y0, size: B };
      o.tray = [0, 1, 2].map(i => ({ x: x0 + B * 1.62, y: y0 + i * B / 3, w: B * 0.33, h: B / 3 }));
    }
    const f = o.B * 0.035;
    o.frame = f;
    o.inner = { x: o.board.x + f, y: o.board.y + f, w: o.B - 2 * f, h: o.B - 2 * f };
    o.cs = o.inner.w / N;
    o.trayCs = Math.min(o.cs * 0.55, o.tray[0].w * 0.88 / 5, o.tray[0].h * 0.88 / 5);
    return o;
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    L = layout(W, H);
    if (ready) buildBackground();
  }

  // Statischer Hintergrund (Wiese, Holzrahmen, Erdbeet) – einmal pro Größenänderung gemalt
  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);

    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f4ecd8'); sky.addColorStop(0.6, '#e6e4c6'); sky.addColorStop(1, '#c5d5a0');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    g.globalAlpha = 0.16;   // große, weiche Blattsilhouetten am Rand
    const big = Math.max(W, H) * 0.35;
    Mat.leaf(g, -big * 0.1, H * 0.9, big, big * 0.35, -0.9, '#6f9a4a', false);
    Mat.leaf(g, W + big * 0.1, H * 0.15, big * 0.8, big * 0.3, Math.PI + 0.7, '#6f9a4a', false);
    Mat.leaf(g, W * 0.9, H + big * 0.05, big * 0.7, big * 0.26, -2.0, '#7fa85a', false);
    g.globalAlpha = 1;

    const b = L.board, B = L.B, f = L.frame, r = B * 0.04;
    const frame = new Path2D();
    Mat.rrect(frame, b.x, b.y, B, B, [r, r, r, r]);
    g.save(); g.translate(B * 0.01, B * 0.02); g.fillStyle = 'rgba(60,35,15,0.28)'; g.fill(frame); g.restore();
    g.fillStyle = Mat.pattern(g, 'wood', b.x, b.y, L.cs * 0.8); g.fill(frame);
    g.fillStyle = 'rgba(70,35,12,0.25)'; g.fill(frame);
    g.strokeStyle = 'rgba(255,230,190,0.35)'; g.lineWidth = Math.max(1, f * 0.12); g.stroke(frame);

    const I = L.inner, cs = L.cs;
    g.fillStyle = Mat.pattern(g, 'soil', I.x, I.y, cs);
    g.fillRect(I.x, I.y, I.w, I.h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(I.x, I.y, I.w, Math.max(1, f * 0.25));      // Schatten der Rahmenkante
    g.fillRect(I.x, I.y, Math.max(1, f * 0.2), I.h);
    g.strokeStyle = 'rgba(20,10,4,0.45)'; g.lineWidth = Math.max(1, cs * 0.03);
    g.beginPath();
    for (let i = 1; i < N; i++) {
      g.moveTo(I.x + i * cs, I.y); g.lineTo(I.x + i * cs, I.y + I.h);
      g.moveTo(I.x, I.y + i * cs); g.lineTo(I.x + I.w, I.y + i * cs);
    }
    g.stroke();
    g.strokeStyle = 'rgba(255,220,180,0.06)';
    g.beginPath();
    for (let i = 1; i < N; i++) {
      g.moveTo(I.x + i * cs + 1.5, I.y); g.lineTo(I.x + i * cs + 1.5, I.y + I.h);
      g.moveTo(I.x, I.y + i * cs + 1.5); g.lineTo(I.x + I.w, I.y + i * cs + 1.5);
    }
    g.stroke();

    for (const s of L.tray) {   // Ablagefläche als weiches Moosbett
      const p = new Path2D(); const rr = s.w * 0.12;
      Mat.rrect(p, s.x + s.w * 0.05, s.y + s.h * 0.05, s.w * 0.9, s.h * 0.9, [rr, rr, rr, rr]);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill(p);
    }
  }

  // --- Hilfen ----------------------------------------------------------------------------

  const cellsOf = (piece, pid = -1) =>
    piece.cells.map(p => ({ r: p.r, c: p.c, m: piece.mat, p: pid, a: p.a ? piece.accent : 0 }));

  function boardCells() {
    const out = [];
    game.board.forEach((cl, i) => { if (cl) out.push({ r: Math.floor(i / N), c: i % N, ...cl }); });
    return out;
  }

  const cellCenter = (r, c) => ({ x: L.inner.x + (c + 0.5) * L.cs, y: L.inner.y + (r + 0.5) * L.cs });

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  const inside = (R, x, y) => x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;

  function trayOrigin(slot, piece, size) {
    const s = L.tray[slot];
    return { x: s.x + s.w / 2 - piece.w * size / 2, y: s.y + s.h / 2 - piece.h * size / 2 };
  }

  // Ziehen: Form schwebt bei Touch über dem Finger, damit sie nicht verdeckt wird
  function dragGeom(d, cs) {
    const k = easeOut(clamp((clock - d.t0) / 0.12));
    const size = cs != null ? cs : lerp(L.trayCs, L.cs, k);
    const lift = d.touch ? L.cs * 0.7 : 0;
    const p = d.piece;
    return {
      size,
      x: d.x - p.w * size / 2,
      y: d.y - p.h * size * (d.touch ? 1 : 0.5) - lift * (cs != null ? 1 : k),
    };
  }

  function updateSnap() {
    const gm = dragGeom(drag, L.cs);
    const c = Math.round((gm.x - L.inner.x) / L.cs);
    const r = Math.round((gm.y - L.inner.y) / L.cs);
    const p = drag.piece;
    if (r < -1 || c < -1 || r > N - p.h + 1 || c > N - p.w + 1) { drag.snap = null; return; }
    drag.snap = { r, c, valid: Logic.canPlace(game.board, p, r, c) };
  }

  // --- Spielaktionen ---------------------------------------------------------------------

  function tryPlace(slot, r, c) {
    const events = Logic.place(game, slot, r, c);
    if (!events) { Sound.invalid(); return false; }
    handle(events);
    return true;
  }

  function handle(events) {
    for (const ev of events) {
      switch (ev.type) {
        case 'placed':
          drops.set(ev.pid, clock);
          lastPlaced = ev.cells;
          Sound.place(ev.mat);
          for (const c of ev.cells) {
            const p = cellCenter(c.r, c.c);
            FX.dust(p.x, p.y + L.cs * 0.4, L.cs);
          }
          hintDone = true;
          break;

        case 'cleared': {
          const cr = lastPlaced.reduce((s, c) => s + c.r, 0) / lastPlaced.length;
          const cc = lastPlaced.reduce((s, c) => s + c.c, 0) / lastPlaced.length;
          for (const c of ev.cells) {   // Auflösen als Welle, ausgehend von der gelegten Form
            dying.push({ ...c, start: clock + Math.hypot(c.r - cr, c.c - cc) * 0.035, burst: false });
          }
          Sound.clear([...new Set(ev.cells.map(c => c.m))], ev.combo, ev.lines);
          const p = cellCenter(cr, cc);
          FX.text('+' + ev.points, p.x, p.y, L.cs * 0.6, '#fffbe8');
          if (ev.combo >= 2) FX.text(`${S.combo} ×${ev.combo}`, p.x, p.y - L.cs * 0.8, L.cs * 0.5, '#d9f7a8', { delay: 0.1 });
          if (ev.lines >= 2) FX.gust(L.inner, L.cs);
          for (const gev of Logic.growGarden(garden, ev.lines)) gardenEvent(gev);
          break;
        }

        case 'boardCleared': {
          const p = cellCenter(3.5, 3.5);
          FX.text(`${S.fresh} +${ev.points}`, p.x, p.y, L.cs * 0.6, '#ffe9a8', { dur: 1.6, delay: 0.3 });
          FX.petalRain(L.inner, L.cs, 40);
          FX.fireflies(L.inner, L.cs, 12);
          Sound.boardCleared();
          break;
        }

        case 'trayRefilled':
          trayPop = [clock, clock + 0.07, clock + 0.14];
          break;

        case 'gameOver':
          endGame();
          break;
      }
    }
    if (game.score > best) {
      best = game.score;
      if (!newBestShown && bestAtStart > 0) {
        newBestShown = true;
        FX.text(S.newBest, L.header.x + L.header.w / 2, L.header.y + L.header.h * 1.2, L.cs * 0.5, '#ffe27a', { dur: 1.6 });
        Sound.newBest();
      }
    }
    saveDirty = true;
  }

  function plotPos(i) {
    const R = L.garden;
    return { x: R.x + R.w * (i + 0.5) / Logic.PLOTS, y: R.y + R.h * 0.45 };
  }

  function gardenEvent(ev) {
    if (ev.type === 'grow') {
      const p = plotPos(ev.plot);
      FX.sparkle(p.x, p.y, L.cs, 5, ['#fff6b0', '#ffffff', '#c8f08a']);
      Sound.grow(ev.stage);
    } else if (ev.type === 'gardenComplete') {
      gardenView.hold = 2.4;
      gardenView.holdLevel = ev.level;
      const R = L.garden, sp = Garden.species(ev.level);
      FX.petalRain(R, L.cs, 30, [sp.petal, sp.dark]);
      FX.text(S.bloom, R.x + R.w / 2, R.y + R.h * 0.4, L.cs * 0.45, '#fff6c8', { dur: 2.2 });
      Sound.gardenComplete();
    }
  }

  function endGame() {
    over = { t: clock, button: null, newBest: game.score > bestAtStart && bestAtStart > 0 };
    drag = null; kb = null;
    YT.sendScore(best);       // muss dem im Spiel angezeigten Rekord entsprechen
    Sound.gameOver();
    saveNow();
  }

  function restart() {
    game = Logic.newGame(randSeed());
    over = null; dying = []; drops.clear(); FX.reset();
    bestAtStart = best; newBestShown = false; shownScore = 0;
    trayPop = [clock, clock + 0.07, clock + 0.14];
    saveNow();
  }

  // --- Speichern -------------------------------------------------------------------------

  const snapshot = () => ({ v: 1, best, garden, hintDone, run: game && !game.over ? game : null });

  function saveNow() {
    YT.save(snapshot());
    saveDirty = false;
    lastSave = clock;
  }

  // --- Eingabe ---------------------------------------------------------------------------

  canvas.addEventListener('pointerdown', e => {
    Sound.unlock();
    if (!ready || paused) return;
    const { x, y } = pointer(e);
    if (over) {
      if (over.button && inside(over.button, x, y)) restart();
      return;
    }
    const slot = L.tray.findIndex(s => inside(s, x, y));
    if (slot < 0 || !game.tray[slot] || (returning && returning.slot === slot)) return;
    drag = { slot, piece: Logic.pieceOf(game.tray[slot]), x, y, t0: clock, touch: e.pointerType !== 'mouse', id: e.pointerId, snap: null };
    kb = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* egal */ }
    Sound.pickup();
    updateSnap();
  });

  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { x, y } = pointer(e);
    drag.x = x; drag.y = y;
    updateSnap();
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.snap && d.snap.valid && tryPlace(d.slot, d.snap.r, d.snap.c)) return;
    if (d.snap) Sound.invalid();
    const gm = dragGeom(d);
    returning = { slot: d.slot, piece: d.piece, x: gm.x, y: gm.y, size: gm.size, t0: clock };
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Tastatur (empfohlen): 1–3 wählen, Pfeiltasten bewegen, Enter/Leertaste legen, Esc abbrechen
  window.addEventListener('keydown', e => {
    Sound.unlock();
    if (!ready || paused) return;
    const k = e.key;
    if (over) {
      if ((k === 'Enter' || k === ' ') && clock - over.t > 1.2) { restart(); e.preventDefault(); }
      return;
    }
    if (k === 'Escape') { kb = null; return; }   // Esc nie per preventDefault blockieren
    const select = slot => {
      const p = Logic.pieceOf(game.tray[slot]);
      kb = { slot, r: Math.floor((N - p.h) / 2), c: Math.floor((N - p.w) / 2) };
      Sound.pickup();
    };
    if (k >= '1' && k <= '3') {
      const s = Number(k) - 1;
      if (game.tray[s]) select(s);
      e.preventDefault();
      return;
    }
    if (!kb && k.startsWith('Arrow')) {
      const s = game.tray.findIndex(Boolean);
      if (s >= 0) select(s);
      e.preventDefault();
      return;
    }
    if (!kb) return;
    const p = Logic.pieceOf(game.tray[kb.slot]);
    if (k === 'ArrowLeft') kb.c = Math.max(0, kb.c - 1);
    else if (k === 'ArrowRight') kb.c = Math.min(N - p.w, kb.c + 1);
    else if (k === 'ArrowUp') kb.r = Math.max(0, kb.r - 1);
    else if (k === 'ArrowDown') kb.r = Math.min(N - p.h, kb.r + 1);
    else if (k === 'Enter' || k === ' ') { if (tryPlace(kb.slot, kb.r, kb.c)) kb = null; }
    else return;
    e.preventDefault();
  });

  window.addEventListener('resize', resize);

  // Entwickler-Hilfe: index.html?autoplay lässt einen gierigen Bot spielen (Tests, Screenshots)
  const AUTOPLAY = /[?&]autoplay/.test(location.search);
  let botTimer = 1;
  function botMove() {
    let bestMove = null;
    game.tray.forEach((item, slot) => {
      if (!item) return;
      const piece = Logic.pieceOf(item);
      for (let r = 0; r <= N - piece.h; r++) {
        for (let c = 0; c <= N - piece.w; c++) {
          if (!Logic.canPlace(game.board, piece, r, c)) continue;
          const l = Logic.previewLines(game.board, piece, r, c);
          const v = (l.rows.length + l.cols.length) * 10 + Math.random();
          if (!bestMove || v > bestMove.v) bestMove = { slot, r, c, v };
        }
      }
    });
    if (bestMove) tryPlace(bestMove.slot, bestMove.r, bestMove.c);
  }

  // Entwickler-Hilfe: index.html?debug macht den Zustand für automatisierte Browser-Tests zugänglich
  if (/[?&]debug\b/.test(location.search)) {
    window.__dbg = { layout: () => L, game: () => game, garden: () => garden, place: tryPlace, ready: () => ready };
  }

  // --- Update ----------------------------------------------------------------------------

  function update(dt) {
    if (AUTOPLAY) {
      botTimer -= dt;
      if (botTimer <= 0) { botTimer = 0.45; if (over) { if (clock - over.t > 2.5) restart(); } else botMove(); }
    }
    FX.update(dt);
    Sound.update(dt);

    for (const d of dying) {
      if (!d.burst && clock >= d.start) {
        d.burst = true;
        const p = cellCenter(d.r, d.c);
        FX.burst(d.a === 'cap' ? 'cap' : d.m, p.x, p.y, L.cs);
      }
    }
    dying = dying.filter(d => clock < d.start + 0.3);
    for (const [pid, t] of drops) if (clock - t > 0.3) drops.delete(pid);
    if (returning && clock - returning.t0 > 0.2) returning = null;

    // Garten-Anzeige folgt dem echten Zustand weich; nach dem Erblühen kurz innehalten
    let targets, level;
    if (gardenView.hold > 0) {
      gardenView.hold -= dt;
      targets = gardenView.plots.map(() => Logic.STAGES);
      level = gardenView.holdLevel;
      if (gardenView.hold <= 0) gardenView.plots = gardenView.plots.map(() => 0);
    } else {
      targets = garden.plots;
      level = garden.level;
    }
    gardenView.level = level;
    gardenView.plots = gardenView.plots.map((v, i) => v + (targets[i] - v) * Math.min(1, dt * 3));

    shownScore += (game.score - shownScore) * Math.min(1, dt * 10);
    if (Math.abs(game.score - shownScore) < 0.5) shownScore = game.score;

    if (saveDirty && clock - lastSave > 4) saveNow();
  }

  // --- Zeichnen --------------------------------------------------------------------------

  function drawHeader() {
    const R = L.header, B = L.B;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${B * 0.07}px ${FONT}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = B * 0.012;
    ctx.strokeStyle = 'rgba(255,250,235,0.9)';
    const sy = R.y + R.h * 0.38;
    ctx.strokeText(String(Math.round(shownScore)), R.x + R.w / 2, sy);
    ctx.fillStyle = '#3d5a2a';
    ctx.fillText(String(Math.round(shownScore)), R.x + R.w / 2, sy);

    ctx.font = `700 ${B * 0.032}px ${FONT}`;
    ctx.fillStyle = 'rgba(80,60,35,0.85)';
    ctx.fillText(`${S.best} ${best}`, R.x + R.w / 2, R.y + R.h * 0.85);

    if (game.combo >= 2) {
      ctx.font = `800 ${B * 0.034}px ${FONT}`;
      ctx.fillStyle = '#5d9a3e';
      ctx.textAlign = 'right';
      ctx.fillText(`${S.combo} ×${game.combo}`, R.x + R.w, sy);
    }
  }

  function currentPreview() {
    if (drag && drag.snap && drag.snap.valid) return { piece: drag.piece, r: drag.snap.r, c: drag.snap.c, valid: true };
    if (kb && game.tray[kb.slot]) {
      const piece = Logic.pieceOf(game.tray[kb.slot]);
      return { piece, r: kb.r, c: kb.c, valid: Logic.canPlace(game.board, piece, kb.r, kb.c) };
    }
    return null;
  }

  function drawBoard(preview) {
    const I = L.inner, cs = L.cs;
    let glow = null;
    if (preview && preview.valid) {
      const lines = Logic.previewLines(game.board, preview.piece, preview.r, preview.c);
      if (lines.rows.length || lines.cols.length) {
        const a = 0.25 + 0.12 * Math.sin(clock * 10);
        const col = `rgba(255,248,200,${a})`;
        glow = cl => (lines.rows.includes(cl.r) || lines.cols.includes(cl.c)) ? col : null;
      }
    }

    let tint = glow;
    if (over) {   // Verwelken von oben nach unten
      tint = cl => {
        const a = clamp((clock - over.t - cl.r * 0.06) / 0.5);
        return a > 0 ? `rgba(125,110,88,${0.6 * a})` : null;
      };
    }

    const dy = cl => {
      const t = drops.get(cl.p);
      if (t == null) return 0;
      const k = clamp((clock - t) / 0.13);
      return -cs * 0.28 * (1 - k) * (1 - k);
    };
    Mat.renderCells(ctx, boardCells(), I.x, I.y, cs, { dy, tint });

    if (preview) {
      const offBoard = { r: preview.r, c: preview.c };
      Mat.renderCells(ctx, cellsOf(preview.piece), I.x + offBoard.c * cs, I.y + offBoard.r * cs, cs, {
        alpha: preview.valid ? 0.45 : 0.35,
        noShadow: true,
        tint: preview.valid ? (glow ? () => 'rgba(255,248,200,0.3)' : null) : () => 'rgba(190,50,35,0.5)',
      });
    }

    // Zellen, deren Welle noch nicht angekommen ist, liegen noch zusammenhängend da
    const pending = dying.filter(d => clock < d.start);
    Mat.renderCells(ctx, pending, I.x, I.y, cs);
    for (const d of dying) {
      if (clock < d.start) continue;
      const k = clamp((clock - d.start) / 0.3);
      const p = cellCenter(d.r, d.c), s = 1 - k * k;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(k * ((d.r + d.c) % 2 ? 0.7 : -0.7));
      ctx.scale(s, s);
      Mat.renderCells(ctx, [{ r: 0, c: 0, m: d.m, p: d.p, a: d.a }], -cs / 2, -cs / 2, cs, { alpha: 1 - k * 0.5, noShadow: true });
      ctx.restore();
    }
  }

  function drawTray() {
    for (let i = 0; i < 3; i++) {
      const item = game.tray[i];
      if (!item || (drag && drag.slot === i) || (returning && returning.slot === i)) continue;
      const piece = Logic.pieceOf(item);
      const s = L.tray[i], size = L.trayCs;
      const k = clamp((clock - trayPop[i]) / 0.3);
      const pop = k < 1 ? easeOut(k) * (1 + 0.15 * Math.sin(k * Math.PI)) : 1;
      if (pop <= 0) continue;
      const fits = over || Logic.fits(game.board, piece);
      const selected = kb && kb.slot === i;
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.scale(pop, pop);
      if (selected) {
        ctx.fillStyle = 'rgba(255,248,200,0.45)';
        ctx.beginPath(); ctx.arc(0, 0, Math.min(s.w, s.h) * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      Mat.renderCells(ctx, cellsOf(piece), -piece.w * size / 2, -piece.h * size / 2, size, { alpha: fits ? 1 : 0.35 });
      ctx.restore();
    }
  }

  function drawFloatingPiece() {
    if (drag) {
      const gm = dragGeom(drag);
      Mat.renderCells(ctx, cellsOf(drag.piece), gm.x, gm.y, gm.size);
    }
    if (returning) {
      const k = easeOut(clamp((clock - returning.t0) / 0.2));
      const to = trayOrigin(returning.slot, returning.piece, L.trayCs);
      const size = lerp(returning.size, L.trayCs, k);
      Mat.renderCells(ctx, cellsOf(returning.piece), lerp(returning.x, to.x, k), lerp(returning.y, to.y, k), size);
    }
  }

  function drawHint() {
    if (hintDone || over || drag) return;
    const slot = game.tray.findIndex(Boolean);
    if (slot < 0) return;
    const s = L.tray[slot], I = L.inner;
    const k = (clock % 2) / 2;
    const m = easeOut(clamp(k / 0.7));
    const x = lerp(s.x + s.w / 2, I.x + I.w / 2, m), y = lerp(s.y + s.h / 2, I.y + I.h / 2, m);
    ctx.save();
    ctx.globalAlpha = clamp(1 - Math.max(0, k - 0.8) / 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, L.cs * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.font = `700 ${L.B * 0.038}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(S.hint).width + L.B * 0.06, th = L.B * 0.07;
    const tx = I.x + I.w / 2, ty = I.y + I.h * 0.3;
    const pill = new Path2D(); Mat.rrect(pill, tx - tw / 2, ty - th / 2, tw, th, [th / 2, th / 2, th / 2, th / 2]);
    ctx.fillStyle = 'rgba(255,250,235,0.9)'; ctx.fill(pill);
    ctx.fillStyle = '#4a3424';
    ctx.fillText(S.hint, tx, ty);
  }

  function drawGameOver() {
    if (!over) return;
    const t = clock - over.t;
    if (t < 0.9) return;
    const a = easeOut(clamp((t - 0.9) / 0.35));
    ctx.fillStyle = `rgba(40,30,20,${0.45 * a})`;
    ctx.fillRect(0, 0, W, H);

    const w = Math.min(W * 0.86, L.B * 0.9), h = w * 0.66;
    const cx = L.board.x + L.B / 2, cy = L.board.y + L.B / 2 + (1 - a) * 30;
    const x = cx - w / 2, y = cy - h / 2;
    ctx.save();
    ctx.globalAlpha = a;
    const card = new Path2D(); Mat.rrect(card, x, y, w, h, [w * 0.06, w * 0.06, w * 0.06, w * 0.06]);
    ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.save(); ctx.translate(0, w * 0.015); ctx.fill(card); ctx.restore();
    ctx.fillStyle = '#fbf5e6'; ctx.fill(card);
    ctx.strokeStyle = '#a8743f'; ctx.lineWidth = w * 0.012; ctx.stroke(card);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a3424';
    ctx.font = `800 ${w * 0.075}px ${FONT}`;
    ctx.fillText(S.over, cx, y + h * 0.17);
    ctx.fillStyle = '#2f5d2a';
    ctx.font = `800 ${w * 0.15}px ${FONT}`;
    ctx.fillText(String(game.score), cx, y + h * 0.4);
    ctx.fillStyle = over.newBest ? '#c27f22' : 'rgba(80,60,35,0.85)';
    ctx.font = `700 ${w * 0.045}px ${FONT}`;
    ctx.fillText(over.newBest ? S.newBest : `${S.best} ${best}`, cx, y + h * 0.58);

    const bw = w * 0.62, bh = h * 0.2, bx = cx - bw / 2, by = y + h * 0.7;
    const btn = new Path2D(); Mat.rrect(btn, bx, by, bw, bh, [bh / 2, bh / 2, bh / 2, bh / 2]);
    ctx.fillStyle = '#5d9a3e'; ctx.fill(btn);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx + bh / 2, by + bh * 0.1, bw - bh, bh * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${bh * 0.42}px ${FONT}`;
    ctx.fillText(S.again, cx, by + bh / 2);
    ctx.restore();
    over.button = a > 0.5 ? { x: bx, y: by, w: bw, h: bh } : null;
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    drawHeader();
    Garden.draw(ctx, L.garden, gardenView, clock, S.garden);
    drawBoard(over ? null : currentPreview());
    drawTray();
    FX.draw(ctx);
    drawFloatingPiece();
    drawHint();
    drawGameOver();
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const t = ts / 1000;
    const dt = last ? Math.min(0.05, t - last) : 0;
    last = t;
    clock += dt;
    update(dt);
    draw();
    if (!readySignalled) { readySignalled = true; YT.gameReady(); }
  }

  // --- Start -----------------------------------------------------------------------------

  async function init() {
    resize();
    ctx.fillStyle = '#efe6cf';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    YT.firstFrameReady();

    Mat.build();
    const [data, lang] = await Promise.all([YT.load(), YT.language()]);
    S = String(lang).toLowerCase().startsWith('de') ? STR.de : STR.en;
    document.documentElement.lang = S === STR.de ? 'de' : 'en';

    if (data && data.v === 1) {
      best = Number.isFinite(data.best) ? Math.max(0, Math.floor(data.best)) : 0;
      garden = Logic.restoreGarden(data.garden) || Logic.newGarden();
      hintDone = !!data.hintDone;
      game = Logic.restore(data.run);
    }
    if (!game) game = Logic.newGame(randSeed());
    bestAtStart = best;
    shownScore = game.score;
    gardenView = { level: garden.level, plots: garden.plots.slice(), hold: 0, holdLevel: 0 };

    Sound.setEnabled(YT.audioEnabled());
    YT.onAudioChange(on => Sound.setEnabled(on));
    YT.onPause(() => {
      paused = true;
      drag = null; returning = null;
      cancelAnimationFrame(raf);
      Sound.setPaused(true);
      YT.sendScore(best);
      saveNow();
    });
    YT.onResume(() => {
      if (!paused) return;
      paused = false;
      last = 0;
      Sound.setPaused(false);
      raf = requestAnimationFrame(frame);
    });

    ready = true;
    buildBackground();
    if (!Logic.anyMove(game)) { game.over = true; endGame(); }
    raf = requestAnimationFrame(frame);
  }

  init().catch(e => YT.logError(e));
})();
