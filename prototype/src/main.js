// Einstieg: Layout, Eingabe, Spiel-Loop, Rendering, YouTube-Playables-Lebenszyklus.
(function () {
  'use strict';

  const { N } = Logic;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const randSeed = () => (Math.random() * 4294967296) >>> 0;

  const STR = {
    de: { hold: 'Reserve', best: 'Rekord', combo: 'Combo', hint: 'Ziehe eine Form aufs Beet', over: 'Der Garten ruht', again: 'Neu pflanzen', newBest: 'Neuer Rekord!', bloom: 'Der Garten blüht!', fresh: 'Frischer Boden!', garden: 'Garten',
      undo: 'Zug zurück', resetTitle: 'Garten zurücksetzen?', resetText: 'Alle Pflanzen und Gärten beginnen von vorn.', resetYes: 'Zurücksetzen', resetNo: 'Abbrechen' },
    en: { hold: 'Hold', best: 'Best', combo: 'Combo', hint: 'Drag a piece onto the bed', over: 'The garden rests', again: 'Plant again', newBest: 'New best!', bloom: 'Your garden is in bloom!', fresh: 'Fresh soil!', garden: 'Garden',
      undo: 'Undo move', resetTitle: 'Reset garden?', resetText: 'All plants and gardens start over.', resetYes: 'Reset', resetNo: 'Cancel' },
    fr: { hold: 'Réserve', best: 'Record', combo: 'Combo', hint: 'Glisse une pièce sur le parterre', over: 'Le jardin se repose', again: 'Replanter', newBest: 'Nouveau record\u202f!', bloom: 'Ton jardin est en fleurs\u202f!', fresh: 'Terre fraîche\u202f!', garden: 'Jardin',
      undo: 'Annuler le coup', resetTitle: 'Réinitialiser le jardin\u202f?', resetText: 'Toutes les plantes et tous les jardins repartent de zéro.', resetYes: 'Réinitialiser', resetNo: 'Annuler' },
    es: { hold: 'Reserva', best: 'Récord', combo: 'Combo', hint: 'Arrastra una pieza al bancal', over: 'El jardín descansa', again: 'Plantar de nuevo', newBest: '¡Nuevo récord!', bloom: '¡Tu jardín está en flor!', fresh: '¡Tierra fresca!', garden: 'Jardín',
      undo: 'Deshacer jugada', resetTitle: '¿Reiniciar el jardín?', resetText: 'Todas las plantas y jardines empiezan de cero.', resetYes: 'Reiniciar', resetNo: 'Cancelar' },
    ru: { hold: 'Запас', best: 'Рекорд', combo: 'Комбо', hint: 'Перетащи фигуру на грядку', over: 'Сад отдыхает', again: 'Посадить снова', newBest: 'Новый рекорд!', bloom: 'Твой сад расцвёл!', fresh: 'Свежая земля!', garden: 'Сад',
      undo: 'Отменить ход', resetTitle: 'Сбросить сад?', resetText: 'Все растения и сады начнутся заново.', resetYes: 'Сбросить', resetNo: 'Отмена' },
  };
  // Sprache: ?lang=xx (Entwickler-Hilfe) > YouTube/Browser; unbekannte Sprachen fallen auf Englisch zurück
  const pickLang = l => { const k = String(l).toLowerCase().slice(0, 2); return STR[k] ? k : 'en'; };
  const LANG_PARAM = (/[?&]lang=([a-z]{2})/i.exec(location.search) || [])[1];
  let S = STR.en, lang = 'en';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, L = null, bg = null;
  let bgTheme = null, bgOld = null, bgFade = 0;   // Hintergrund folgt dem Garten-Thema, Wechsel wird überblendet

  // Spielzustand
  let game = null, garden = Logic.newGarden(), best = 0, hintDone = false;
  let bestAtStart = 0, newBestShown = false, shownScore = 0;
  const history = [];                    // Stände vor den letzten Zügen (höchstens Logic.UNDO_LIMIT), nicht gespeichert
  // Darstellung
  let drag = null, returning = null, kb = null, lastPlaced = null, over = null, confirm = null;
  const drops = new Map();               // pid → Startzeit der Fall-Animation
  let dying = [];                        // Zellen, die sich gerade auflösen
  let trayPop = [0, 0, 0, 0];            // Einblendzeitpunkt je Ablage-Slot (Index 3 = Reservefeld)
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
      o.tray = [0, 1, 2].map(i => ({ x: x0 + i * B * 0.25, y: y0 + B * 1.42, w: B * 0.25, h: B * 0.38 }));
      o.hold = { x: x0 + B * 0.78, y: y0 + B * 1.46, w: B * 0.22, h: B * 0.3 };
    } else {
      const B = landscapeB, x0 = (w - B * 1.95) / 2, y0 = (h - B) / 2;
      o.B = B;
      o.header = { x: x0, y: y0, w: B * 0.55, h: B * 0.2 };
      o.garden = { x: x0, y: y0 + B * 0.45, w: B * 0.55, h: B * 0.55 };
      o.board = { x: x0 + B * 0.59, y: y0, size: B };
      o.tray = [0, 1, 2].map(i => ({ x: x0 + B * 1.62, y: y0 + i * B * 0.25, w: B * 0.33, h: B * 0.25 }));
      o.hold = { x: x0 + B * 1.64, y: y0 + B * 0.78, w: B * 0.29, h: B * 0.22 };
    }
    const f = o.B * 0.035;
    o.frame = f;
    o.inner = { x: o.board.x + f, y: o.board.y + f, w: o.B - 2 * f, h: o.B - 2 * f };
    o.cs = o.inner.w / N;
    // Index = Slot-Nummer der Logik (Logic.HOLD = 3); im Reservefeld bleibt unten Platz für die Beschriftung
    o.slots = [...o.tray, { x: o.hold.x, y: o.hold.y, w: o.hold.w, h: o.hold.h * 0.8 }];
    return o;
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    L = layout(W, H);
    bgOld = null;
    if (ready) buildBackground();
  }

  // Statischer Hintergrund (Wiese, Holzrahmen, Erdbeet) – einmal pro Größenänderung gemalt
  function buildBackground() {
    bg = document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(DPR, 0, 0, DPR, 0, 0);

    Garden.backdrop(g, W, H, gardenView.level);   // Himmel und Deko je nach Thema
    bgTheme = Garden.theme(gardenView.level).id;

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

  const inside = (R, x, y) => !!R && x >= R.x && x <= R.x + R.w && y >= R.y && y <= R.y + R.h;
  const hitCircle = (b, x, y) => Math.hypot(x - b.x, y - b.y) <= b.r * 1.4;   // großzügig für Touch

  // Runde Knöpfe: Zug zurück links im Kopfbereich, Garten-Reset oben rechts im Garten
  const undoButton = () => { const R = L.header, r = L.B * 0.042; return { x: R.x + r * 1.1, y: R.y + R.h * 0.38, r }; };
  const resetButton = () => { const R = L.garden, r = Math.max(11, R.h * 0.1); return { x: R.x + R.w - r * 1.5, y: R.y + r * 1.5, r }; };
  const canResetGarden = () => garden.level >= 1;   // erst, wenn der erste Garten erblüht ist

  // Zellgröße einer Form in ihrem Slot: kleine Formen etwas größer, lange passen trotzdem hinein
  function traySize(slot, piece) {
    const s = L.slots[slot];
    return Math.min(L.cs * 0.55, s.w * 0.88 / Math.max(piece.w, 4), s.h * 0.88 / Math.max(piece.h, 4));
  }

  function trayOrigin(slot, piece, size) {
    const s = L.slots[slot];
    return { x: s.x + s.w / 2 - piece.w * size / 2, y: s.y + s.h / 2 - piece.h * size / 2 };
  }

  // Ziehen: Form schwebt bei Touch über dem Finger, damit sie nicht verdeckt wird
  function dragGeom(d, cs) {
    const k = easeOut(clamp((clock - d.t0) / 0.12));
    const size = cs != null ? cs : lerp(traySize(d.slot, d.piece), L.cs, k);
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

  // Stand vor einem Zug merken – inklusive Rekord, damit Zurücknehmen ihn nicht aufbläht
  const remember = () => Logic.pushHistory(history, { game, garden, best, newBestShown });
  // Rekord, der sich nicht mehr zurücknehmen lässt (nur der geht an YouTube)
  const committedBest = () => { const h = Logic.peekHistory(history, 0); return h ? h.best : best; };
  const SLOTS = [0, 1, 2, Logic.HOLD];

  function tryPlace(slot, r, c) {
    const item = Logic.itemAt(game, slot);
    if (game.over || !item || !Logic.canPlace(game.board, Logic.pieceOf(item), r, c)) { Sound.invalid(); return false; }
    remember();
    handle(Logic.place(game, slot, r, c));
    return true;
  }

  // Form ins Reservefeld legen (oder mit der dortigen tauschen)
  function tryHold(slot) {
    if (game.over || slot === Logic.HOLD || !game.tray[slot]) { Sound.invalid(); return false; }
    remember();
    handle(Logic.hold(game, slot));
    return true;
  }

  // Letzten Zug zurücknehmen: Runde, Garten und Rekord springen auf den Stand davor (auch nach Game Over)
  function undo() {
    const prev = Logic.popHistory(history);
    if (!prev) { Sound.invalid(); return false; }
    const slotsBefore = SLOTS.map(i => JSON.stringify(Logic.itemAt(game, i)));
    game = prev.game;
    garden = prev.garden;
    best = prev.best;
    newBestShown = prev.newBestShown;
    over = null; drag = null; returning = null; kb = null; lastPlaced = null;
    dying = []; drops.clear(); FX.reset();
    gardenView.hold = 0;
    SLOTS.forEach(i => { if (JSON.stringify(Logic.itemAt(game, i)) !== slotsBefore[i]) trayPop[i] = clock; });
    Sound.pickup();
    saveDirty = true;
    return true;
  }

  // Garten komplett zurücksetzen (Stufe, Pflanzen, Thema). Züge auf dem Feld bleiben zurücknehmbar,
  // ihre gespeicherten Stände bekommen aber ebenfalls den neuen Garten.
  function resetGarden() {
    confirm = null;
    garden = Logic.newGarden();
    gardenView = { level: 0, plots: garden.plots.slice(), hold: 0, holdLevel: 0 };
    Logic.mapHistory(history, h => ({ ...h, garden: Logic.newGarden() }));
    FX.sparkle(L.garden.x + L.garden.w / 2, L.garden.y + L.garden.h * 0.6, L.cs, 12, ['#fff6b0', '#ffffff', '#c8f08a']);
    Sound.pickup();
    saveNow();
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

        case 'held':
          trayPop[Logic.HOLD] = clock;
          if (ev.swapped) trayPop[ev.slot] = clock;
          Sound.pickup();
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
          p.x = clamp(p.x, L.inner.x + L.cs * 1.8, L.inner.x + L.inner.w - L.cs * 1.8); // Text nicht am Rand abschneiden
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
          trayPop = [clock, clock + 0.07, clock + 0.14, trayPop[Logic.HOLD]];
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
        FX.text(S.newBest, L.inner.x + L.inner.w / 2, L.inner.y + L.cs * 1.2, L.cs * 0.55, '#ffe27a', { dur: 1.8 });
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
    YT.sendScore(committedBest());   // Punkte der letzten, noch zurücknehmbaren Züge erst bei „Neu pflanzen“
    Sound.gameOver();
    saveNow();
  }

  function restart() {
    YT.sendScore(best);       // Runde ist abgeschlossen → angezeigter Rekord ist endgültig
    game = Logic.newGame(randSeed());
    over = null; dying = []; drops.clear(); FX.reset();
    history.length = 0;
    bestAtStart = best; newBestShown = false; shownScore = 0;
    trayPop = [clock, clock + 0.07, clock + 0.14, clock];
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
    if (!ready || paused || drag) return;   // zweiter Finger während des Ziehens wird ignoriert
    const { x, y } = pointer(e);
    if (confirm) {
      if (inside(confirm.yes, x, y)) resetGarden();
      else if (confirm.yes) confirm = null;      // „Abbrechen“ oder daneben getippt
      return;
    }
    if (over) {
      if (inside(over.button, x, y)) restart();
      else if (inside(over.undoButton, x, y)) undo();
      return;
    }
    if (hitCircle(undoButton(), x, y)) { undo(); return; }
    if (canResetGarden() && hitCircle(resetButton(), x, y)) { confirm = { t: clock, yes: null, no: null }; kb = null; return; }
    const slot = [...L.tray, L.hold].findIndex(s => inside(s, x, y));
    if (slot < 0 || !Logic.itemAt(game, slot) || (returning && returning.slot === slot)) return;
    drag = { slot, piece: Logic.pieceOf(Logic.itemAt(game, slot)), x, y, t0: clock, touch: e.pointerType !== 'mouse', id: e.pointerId, snap: null };
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
    if (confirm || over) return;
    if (d.slot !== Logic.HOLD && inside(L.hold, d.x, d.y) && tryHold(d.slot)) return;
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
    if (confirm) {
      if (k === 'Escape') confirm = null;
      else if (k === 'Enter') { resetGarden(); e.preventDefault(); }
      return;
    }
    if (k === 'z' || k === 'Z' || k === 'Backspace') { undo(); e.preventDefault(); return; }
    if (over) {
      if ((k === 'Enter' || k === ' ') && clock - over.t > 1.2) { restart(); e.preventDefault(); }
      return;
    }
    if (k === 'Escape') { kb = null; return; }   // Esc nie per preventDefault blockieren
    const select = slot => {
      const p = Logic.pieceOf(Logic.itemAt(game, slot));
      kb = { slot, r: Math.floor((N - p.h) / 2), c: Math.floor((N - p.w) / 2) };
      Sound.pickup();
    };
    if (k >= '1' && k <= '4') {   // 4 = Reservefeld
      const s = Number(k) - 1;
      if (Logic.itemAt(game, s)) select(s);
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
    if (k === 'h' || k === 'H') { if (tryHold(kb.slot)) kb = null; e.preventDefault(); return; }
    const p = Logic.pieceOf(Logic.itemAt(game, kb.slot));
    if (k === 'ArrowLeft') kb.c = Math.max(0, kb.c - 1);
    else if (k === 'ArrowRight') kb.c = Math.min(N - p.w, kb.c + 1);
    else if (k === 'ArrowUp') kb.r = Math.max(0, kb.r - 1);
    else if (k === 'ArrowDown') kb.r = Math.min(N - p.h, kb.r + 1);
    else if (k === 'Enter' || k === ' ') { if (tryPlace(kb.slot, kb.r, kb.c)) kb = null; }
    else return;
    e.preventDefault();
  });

  window.addEventListener('resize', resize);
  // Nur lokal: Auf YouTube übernimmt onPause das Speichern (Page-Visibility-API ist dort verboten)
  if (!YT.inEnv) window.addEventListener('pagehide', () => { if (ready) saveNow(); });

  // Entwickler-Hilfe: index.html?autoplay lässt einen gierigen Bot spielen (Tests, Screenshots)
  const AUTOPLAY = /[?&]autoplay\b/.test(location.search);
  let botTimer = 1;
  function botMove() {
    let bestMove = null;
    SLOTS.forEach(slot => {
      const item = Logic.itemAt(game, slot);
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
    else tryHold(game.tray.findIndex(Boolean));   // letzte Form parken → Ablage füllt sich neu
  }

  // Entwickler-Hilfe: index.html?debug macht den Zustand für automatisierte Browser-Tests zugänglich
  if (/[?&]debug\b/.test(location.search)) {
    window.__dbg = {
      layout: () => L, game: () => game, garden: () => garden, place: tryPlace, ready: () => ready,
      undo, resetGarden, hold: tryHold, history: () => history.length, best: () => best,
      setGarden: g => { garden = g; gardenView = { level: g.level, plots: g.plots.slice(), hold: 0, holdLevel: 0 }; },
    };
  }

  // --- Update ----------------------------------------------------------------------------

  function update(dt) {
    if (AUTOPLAY) {
      botTimer -= dt;
      if (botTimer <= 0) { botTimer = 0.45; if (confirm) confirm = null; else if (over) { if (clock - over.t > 2.5) restart(); } else botMove(); }
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

    drawUndoIcon(undoButton(), history.length > 0 && !over);

    if (game.combo >= 2) {
      ctx.font = `800 ${B * 0.034}px ${FONT}`;
      ctx.fillStyle = '#5d9a3e';
      ctx.textAlign = 'right';
      ctx.fillText(`${S.combo} ×${game.combo}`, R.x + R.w, sy);
    }
  }

  function roundButton(b, enabled) {
    ctx.save();
    ctx.globalAlpha *= enabled ? 1 : 0.4;
    ctx.fillStyle = 'rgba(40,25,10,0.18)';
    ctx.beginPath(); ctx.arc(b.x, b.y + b.r * 0.1, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,0.92)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,85,45,0.45)'; ctx.lineWidth = Math.max(1, b.r * 0.08); ctx.stroke();
    ctx.strokeStyle = ctx.fillStyle = '#4a3424';
    ctx.lineWidth = Math.max(1.5, b.r * 0.16); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }

  // Pfeil nach links, der unten zurückbiegt (↶)
  function drawUndoIcon(b, enabled) {
    roundButton(b, enabled);
    const { x, y, r } = b;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y - r * 0.18);
    ctx.lineTo(x + r * 0.08, y - r * 0.18);
    ctx.arc(x + r * 0.08, y + r * 0.1, r * 0.28, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x - r * 0.22, y + r * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.18);
    ctx.lineTo(x - r * 0.25, y - r * 0.44);
    ctx.lineTo(x - r * 0.25, y + r * 0.08);
    ctx.closePath(); ctx.fill();
    if (enabled) {   // wie viele Züge sich zurücknehmen lassen
      const bx = x + r * 0.75, by = y + r * 0.7, br = r * 0.42;
      ctx.fillStyle = '#5d9a3e';
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${br * 1.25}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(history.length), bx, by + br * 0.05);
    }
    ctx.restore();
  }

  // Kreispfeil (↻) für den Garten-Reset
  function drawResetIcon() {
    if (!canResetGarden() || over) return;
    const b = resetButton();
    roundButton(b, true);
    const { x, y, r } = b, rr = r * 0.42, a0 = -Math.PI / 2 + 0.6, a1 = -Math.PI / 2 + Math.PI * 2 - 0.2;
    ctx.beginPath(); ctx.arc(x, y, rr, a0, a1); ctx.stroke();
    const ex = x + Math.cos(a1) * rr, ey = y + Math.sin(a1) * rr;
    const tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1), s = r * 0.24;
    ctx.beginPath();
    ctx.moveTo(ex + tx * s, ey + ty * s);
    ctx.lineTo(ex + nx * s - tx * s * 0.3, ey + ny * s - ty * s * 0.3);
    ctx.lineTo(ex - nx * s - tx * s * 0.3, ey - ny * s - ty * s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function pillButton(R, label, fill, textColor, outline) {
    const p = new Path2D(); Mat.rrect(p, R.x, R.y, R.w, R.h, [R.h / 2, R.h / 2, R.h / 2, R.h / 2]);
    ctx.fillStyle = fill; ctx.fill(p);
    if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = Math.max(1, R.h * 0.06); ctx.stroke(p); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(R.x + R.h / 2, R.y + R.h * 0.1, R.w - R.h, R.h * 0.25); }
    ctx.fillStyle = textColor;
    ctx.font = `800 ${R.h * 0.42}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, R.x + R.w / 2, R.y + R.h / 2, R.w - R.h * 0.6);
  }

  function card(cx, cy, w, h) {
    const x = cx - w / 2, y = cy - h / 2;
    const p = new Path2D(); Mat.rrect(p, x, y, w, h, [w * 0.06, w * 0.06, w * 0.06, w * 0.06]);
    ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.save(); ctx.translate(0, w * 0.015); ctx.fill(p); ctx.restore();
    ctx.fillStyle = '#fbf5e6'; ctx.fill(p);
    ctx.strokeStyle = '#a8743f'; ctx.lineWidth = w * 0.012; ctx.stroke(p);
    return { x, y };
  }

  function drawConfirm() {
    if (!confirm) return;
    const a = easeOut(clamp((clock - confirm.t) / 0.25));
    ctx.fillStyle = `rgba(40,30,20,${0.45 * a})`;
    ctx.fillRect(0, 0, W, H);
    const w = Math.min(W * 0.86, L.B * 0.9), h = w * 0.62;
    const cx = L.board.x + L.B / 2, cy = L.board.y + L.B / 2 + (1 - a) * 30;
    ctx.save();
    ctx.globalAlpha = a;
    const { y } = card(cx, cy, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a3424';
    ctx.font = `800 ${w * 0.075}px ${FONT}`;
    ctx.fillText(S.resetTitle, cx, y + h * 0.2, w * 0.9);
    ctx.fillStyle = 'rgba(80,60,35,0.85)';
    ctx.font = `700 ${w * 0.042}px ${FONT}`;
    ctx.fillText(S.resetText, cx, y + h * 0.4, w * 0.9);
    const bw = w * 0.4, bh = h * 0.2, by = y + h * 0.62;
    confirm.no = { x: cx - bw - w * 0.03, y: by, w: bw, h: bh };
    confirm.yes = { x: cx + w * 0.03, y: by, w: bw, h: bh };
    pillButton(confirm.no, S.resetNo, '#fbf5e6', '#4a3424', '#a8743f');
    pillButton(confirm.yes, S.resetYes, '#b8452f', '#ffffff');
    ctx.restore();
    if (a < 0.5) confirm.yes = confirm.no = null;   // erst klickbar, wenn sichtbar
  }

  function currentPreview() {
    if (drag && drag.snap && drag.snap.valid) return { piece: drag.piece, r: drag.snap.r, c: drag.snap.c, valid: true };
    if (kb && Logic.itemAt(game, kb.slot)) {
      const piece = Logic.pieceOf(Logic.itemAt(game, kb.slot));
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

  // Reservefeld: gestrichelter Rahmen mit Beschriftung, leuchtet beim Darüberziehen
  function drawHoldSlot() {
    const R = L.hold, rr = Math.min(R.w, R.h) * 0.14;
    const p = new Path2D(); Mat.rrect(p, R.x + R.w * 0.05, R.y + R.h * 0.05, R.w * 0.9, R.h * 0.9, [rr, rr, rr, rr]);
    const target = drag && drag.slot !== Logic.HOLD && inside(R, drag.x, drag.y);
    ctx.save();
    ctx.fillStyle = target ? 'rgba(255,248,200,0.55)' : 'rgba(255,255,255,0.14)';
    ctx.fill(p);
    ctx.setLineDash([L.B * 0.015, L.B * 0.012]);
    ctx.strokeStyle = target ? 'rgba(194,127,34,0.9)' : 'rgba(110,80,45,0.45)';
    ctx.lineWidth = Math.max(1, L.B * 0.005);
    ctx.stroke(p);
    ctx.setLineDash([]);
    ctx.font = `700 ${L.B * 0.026}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(80,60,35,0.7)';
    ctx.fillText(S.hold, R.x + R.w / 2, R.y + R.h * 0.93, R.w * 0.85);
    ctx.restore();
  }

  function drawTray() {
    drawHoldSlot();
    for (const i of SLOTS) {
      const item = Logic.itemAt(game, i);
      if (!item || (drag && drag.slot === i) || (returning && returning.slot === i)) continue;
      const piece = Logic.pieceOf(item);
      const s = L.slots[i], size = traySize(i, piece);
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
      const ts = traySize(returning.slot, returning.piece);
      const to = trayOrigin(returning.slot, returning.piece, ts);
      const size = lerp(returning.size, ts, k);
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
    const tw = Math.min(ctx.measureText(S.hint).width + L.B * 0.06, I.w * 0.95), th = L.B * 0.07;
    const tx = I.x + I.w / 2, ty = I.y + I.h * 0.3;
    const pill = new Path2D(); Mat.rrect(pill, tx - tw / 2, ty - th / 2, tw, th, [th / 2, th / 2, th / 2, th / 2]);
    ctx.fillStyle = 'rgba(255,250,235,0.9)'; ctx.fill(pill);
    ctx.fillStyle = '#4a3424';
    ctx.fillText(S.hint, tx, ty, tw - L.B * 0.04);
  }

  function drawGameOver() {
    if (!over) return;
    const t = clock - over.t;
    if (t < 0.9) return;
    const a = easeOut(clamp((t - 0.9) / 0.35));
    ctx.fillStyle = `rgba(40,30,20,${0.45 * a})`;
    ctx.fillRect(0, 0, W, H);

    const canUndo = history.length > 0;
    const w = Math.min(W * 0.86, L.B * 0.9), h = w * 0.66, ch = canUndo ? h * 1.22 : h;
    const cx = L.board.x + L.B / 2, cy = L.board.y + L.B / 2 + (1 - a) * 30;
    ctx.save();
    ctx.globalAlpha = a;
    const { y } = card(cx, cy, w, ch);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a3424';
    ctx.font = `800 ${w * 0.075}px ${FONT}`;
    ctx.fillText(S.over, cx, y + h * 0.17, w * 0.9);
    ctx.fillStyle = '#2f5d2a';
    ctx.font = `800 ${w * 0.15}px ${FONT}`;
    ctx.fillText(String(game.score), cx, y + h * 0.4);
    ctx.fillStyle = over.newBest ? '#c27f22' : 'rgba(80,60,35,0.85)';
    ctx.font = `700 ${w * 0.045}px ${FONT}`;
    ctx.fillText(over.newBest ? S.newBest : `${S.best} ${best}`, cx, y + h * 0.58, w * 0.9);

    const bw = w * 0.62, bh = h * 0.2;
    const main = { x: cx - bw / 2, y: y + h * 0.7, w: bw, h: bh };
    const back = canUndo ? { x: cx - bw / 2, y: y + h * 0.96, w: bw, h: bh * 0.8 } : null;
    pillButton(main, S.again, '#5d9a3e', '#ffffff');
    if (back) pillButton(back, S.undo, '#fbf5e6', '#4a3424', '#a8743f');
    ctx.restore();
    over.button = a > 0.5 ? main : null;
    over.undoButton = a > 0.5 ? back : null;
  }

  function draw() {
    if (Garden.theme(gardenView.level).id !== bgTheme) { bgOld = bg; bgFade = clock; buildBackground(); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    if (bgOld) {
      const k = clamp((clock - bgFade) / 1.2);
      if (k >= 1) bgOld = null;
      else { ctx.globalAlpha = 1 - k; ctx.drawImage(bgOld, 0, 0); ctx.globalAlpha = 1; }
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    drawHeader();
    const lvl = gardenView.level;
    Garden.draw(ctx, L.garden, gardenView, clock, `${S.garden} ${lvl + 1} · ${Garden.theme(lvl).name[lang]}`);
    drawResetIcon();
    drawBoard(over ? null : currentPreview());
    drawTray();
    FX.draw(ctx);
    drawFloatingPiece();
    drawHint();
    drawGameOver();
    drawConfirm();
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
    const [data, language] = await Promise.all([YT.load(), YT.language()]);
    lang = pickLang(LANG_PARAM || language);
    S = STR[lang];
    document.documentElement.lang = lang;

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
      YT.sendScore(committedBest());
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
    if (Logic.stuck(game)) { game.over = true; endGame(); }
    raf = requestAnimationFrame(frame);
  }

  init().catch(e => YT.logError(e));
})();
