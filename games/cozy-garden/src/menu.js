// Menü, Anleitung, Statistik und Einstellungen des Spiels als HTML-Overlay über dem Canvas.
// HTML statt Canvas: Regler, Fokus und Tastaturbedienung gibt es so gratis.
// Kennt keinen Spielzustand – alles kommt über die Callbacks aus main.js (api).
// Sprache und Gesamtlautstärke stellt die Plattform-Hülle ein, nicht dieses Menü.
import * as Shapes from './shapes.js';
import * as Logic from './logic.js';
import * as Mat from './materials.js';
import * as Garden from './garden.js';
import LOCK from '../assets/lock.svg?raw';   // gesperrte Auswahl

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const fmt = v => (v == null ? '–' : Number(v).toLocaleString());

// Vorschaubilder im Menü: je Biom zwei seiner Extra-Formen
const THUMB = { meadow: ['bluete', 'tulpe'], pond: ['seerose', 'rohrkolben'], tropics: ['hibiskus', 'bambus'] };
// Anleitung: alle Extra-Formen des Bioms
const extrasOf = biome => Shapes.pool(biome).filter(sh => sh.biome).map(sh => sh.id);

// ui: das Overlay-Element (enthält die .screen-Abschnitte aus menu.html), api: Callbacks aus main.js,
// signal: beendet beim Abbauen des Spiels alle Listener an window.
export function createMenu(ui, api, signal) {
  const $ = id => ui.querySelector('#' + id);
  let S = api.S, current = null;
  let statsDiff = null;  // Filter der Statistik: null = alle Schwierigkeiten
  let armed = null;   // Zwei-Tipp-Bestätigung: { btn, label, timer }
  let keyboard = false; // zuletzt per Tastatur bedient → Fokus beim Seitenwechsel setzen

  const applyStatic = () => ui.querySelectorAll('[data-t]').forEach(n => { n.textContent = S[n.dataset.t]; });

  // Sprachwechsel: feste Texte tauschen und die offene Seite neu aufbauen (Scrollposition bleibt)
  function setStrings(strings) {
    S = strings;
    disarm();
    applyStatic();
    if (current) {
      const y = ui.scrollTop;
      render(current);
      ui.scrollTop = y;
    }
  }

  // Gefährliche Knöpfe brauchen einen zweiten Tipp innerhalb von 3 s
  function confirmTap(btn, action) {
    if (armed && armed.btn === btn) {
      clearTimeout(armed.timer);
      armed = null;
      action();
      return;
    }
    disarm();
    armed = { btn, label: btn.textContent, timer: setTimeout(disarm, 3000) };
    btn.textContent = S.sure;
    btn.classList.add('armed');
  }

  function disarm() {
    if (!armed) return;
    clearTimeout(armed.timer);
    armed.btn.textContent = armed.label;
    armed.btn.classList.remove('armed');
    armed = null;
  }

  function show(name) {
    disarm();
    current = name;
    ui.hidden = false;
    ui.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    render(name);
    ui.scrollTop = 0;
    const first = ui.querySelector('.screen.active button');
    if (first && keyboard) first.focus({ preventScroll: true });
  }

  function render(name) {
    if (name === 'menu') renderMenu();
    else if (name === 'guide') renderGuide();
    else if (name === 'stats') renderStats();
    else if (name === 'settings') renderSettings();
  }

  function hide() {
    disarm();
    current = null;
    ui.hidden = true;
  }

  // Esc: aus Unterseiten zurück ins Menü
  function back() {
    if (current && current !== 'menu') { show('menu'); return true; }
    return false;
  }

  // --- Hauptmenü ------------------------------------------------------------

  // Formen nebeneinander auf dem Biom-Hintergrund, mittig und so groß wie möglich
  function drawThumb(canvas, biome, ids) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 240, h = canvas.clientHeight || 135;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    Garden.backdrop(g, w, h, biome);
    const pieces = ids.map(id => Logic.pieceOf({ shape: id, v: 0 }));
    const gap = 0.6, span = pieces.reduce((a, p) => a + p.w, 0) + gap * (pieces.length - 1);
    const cs = Math.min(h / 4.2, w / (span + 1.4));
    let x = w / 2 - span * cs / 2;
    pieces.forEach((piece, k) => {
      const cells = piece.cells.map(p => ({ r: p.r, c: p.c, m: piece.mat, p: k + 1, a: p.a ? piece.accent : 0 }));
      Mat.renderCells(g, cells, x, h / 2 - piece.h * cs / 2, cs);
      x += (piece.w + gap) * cs;
    });
  }

  // Segment-Knöpfe als Auswahl (role=radio); gesperrte sind deaktiviert und tragen ein Schloss
  function segButtons(box, items, onPick) {
    box.textContent = '';
    for (const it of items) {
      const b = el('button', 'seg' + (it.on ? ' on' : '') + (it.locked ? ' locked' : ''));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(!!it.on));
      if (it.locked) { b.disabled = true; b.innerHTML = LOCK; }
      b.append(it.name);
      b.addEventListener('click', () => onPick(it.id));
      box.append(b);
    }
  }

  function renderDiffs() {
    const info = api.diffInfo();
    const seg = $('diff-seg');
    seg.setAttribute('aria-label', S.diff);
    segButtons(seg, info.list.map(d => ({ ...d, on: d.id === info.current })), id => { api.setSetting('diff', id); renderMenu(); });
    const n = info.need;
    $('diff-note').textContent = n
      ? `${S.lockNote.replace('{n}', fmt(n.n)).replace('{d}', n.d).replace('{next}', n.next)} ${S.lockBest.replace('{s}', fmt(n.best))}`
      : S.allUnlocked;
  }

  function renderMenu() {
    const size = api.settings().size;
    $('size-chip').textContent = `${S.field} ${size}×${size}`;
    renderDiffs();
    const list = $('biomes');
    list.textContent = '';
    for (const b of Logic.BIOMES) {
      const info = api.biomeInfo(b);
      const card = el('article', 'card biome');
      card.dataset.biome = b;
      const thumb = el('canvas', 'thumb');
      thumb.setAttribute('aria-hidden', 'true');
      card.append(thumb);
      card.append(el('h2', null, info.name));
      card.append(el('p', 'desc', S['desc_' + b]));
      const meta = el('p', 'meta');
      meta.append(el('span', null, `${S.garden} ${info.level + 1}`), el('span', null, `${S.best} ${fmt(info.best)}`));
      card.append(meta);

      const actions = el('div', 'actions');
      const play = el('button', 'pill primary', info.run != null ? `${S.cont} · ${fmt(info.run)}` : S.play);
      play.addEventListener('click', () => api.play(b, false));
      actions.append(play);
      if (info.run != null) {
        const fresh = el('button', 'pill ghost small', S.newGame);
        fresh.addEventListener('click', e => confirmTap(e.currentTarget, () => api.play(b, true)));
        actions.append(fresh);
      }
      card.append(actions);
      list.append(card);
      drawThumb(thumb, b, THUMB[b]);
    }
  }

  // --- Anleitung ------------------------------------------------------------

  function section(title) {
    const card = el('section', 'card');
    card.append(el('h2', null, title));
    return card;
  }

  function renderGuide() {
    const body = $('guide-body');
    body.textContent = '';

    const about = section(S.g_aboutH);
    const list = el('ul', 'guide-list');
    for (const t of S.g_about) list.append(el('li', null, t));
    about.append(list);
    body.append(about);

    const score = section(S.g_scoreH);
    const table = el('table', 'points');
    for (const [label, pts] of S.g_score) {
      const tr = el('tr');
      tr.append(el('th', null, label), el('td', null, pts));
      table.append(tr);
    }
    score.append(table, el('p', null, S.g_combo), el('p', 'example', S.g_example));
    body.append(score);

    const controls = section(S.g_controlsH);
    const cl = el('ul', 'guide-list');
    for (const t of S.g_controls) cl.append(el('li', null, t));
    controls.append(cl);
    body.append(controls);

    const biomes = section(S.g_biomesH);
    biomes.classList.add('full');
    biomes.append(el('p', null, S.g_biomes));
    const grid = el('div', 'guide-biomes');
    for (const b of Logic.BIOMES) {
      const item = el('div', 'guide-biome');
      const thumb = el('canvas', 'thumb wide');
      thumb.setAttribute('aria-hidden', 'true');
      item.append(thumb, el('h3', null, S['name_' + b]), el('p', 'desc', S['desc_' + b]), el('p', null, S['g_bio_' + b]));
      grid.append(item);
      requestAnimationFrame(() => drawThumb(thumb, b, extrasOf(b)));   // erst nach dem Layout ist die Größe bekannt
    }
    biomes.append(grid);
    body.append(biomes);
  }

  // --- Statistik ------------------------------------------------------------

  function statTiles(st) {
    const grid = el('div', 'tiles');
    for (const [k, v] of [['games', st.games], ['tiles', st.tiles], ['bestScore', st.games ? st.best : null], ['worstScore', st.worst]]) {
      const t = el('div', 'tile');
      t.append(el('span', 'num', fmt(v)), el('span', 'lbl', S[k]));
      grid.append(t);
    }
    return grid;
  }

  function renderStats() {
    const seg = $('stats-diff-seg');
    seg.setAttribute('aria-label', S.diff);
    const opts = [{ id: null, name: S.allDiffs }, ...Logic.DIFFS.map(d => ({ id: d, name: S['diff_' + d] }))];
    segButtons(seg, opts.map(o => ({ ...o, on: o.id === statsDiff })), id => { statsDiff = id; renderStats(); });
    const data = api.statsData(statsDiff);
    const body = $('stats-body');
    body.textContent = '';

    const total = el('section', 'card');
    total.append(el('h2', null, S.total), statTiles(data.total));
    body.append(total);

    for (const b of data.biomes) {
      const card = el('section', 'card');
      card.append(el('h2', null, b.name));
      const table = el('table', 'stats');
      const head = el('tr');
      for (const k of ['field', 'games', 'tiles', 'bestScore', 'worstScore']) head.append(el('th', null, S[k + 'Short'] || S[k]));
      const thead = el('thead');
      thead.append(head);
      table.append(thead);
      const tb = el('tbody');
      const row = (label, st, cls) => {
        const tr = el('tr', cls);
        tr.append(el('th', null, label));
        for (const v of [st.games, st.tiles, st.games ? st.best : null, st.worst]) tr.append(el('td', null, fmt(v)));
        tb.append(tr);
      };
      for (const r of b.rows) row(`${r.size}×${r.size}`, r.stat);
      row(S.sum, b.total, 'sum');
      table.append(tb);
      card.append(table);
      body.append(card);
    }
  }

  // --- Einstellungen --------------------------------------------------------

  const SLIDERS = ['music', 'sfx', 'amb'];

  function buildSettings() {
    for (const k of SLIDERS) {
      const input = $('vol-' + k);
      const out = $('val-' + k);
      input.addEventListener('input', () => {
        out.textContent = input.value + ' %';
        api.setSetting(k, input.value / 100);
      });
      input.addEventListener('change', () => api.preview(k));
    }
    const seg = $('size-seg');
    for (const n of Logic.SIZES) {
      const b = el('button', 'seg', `${n}×${n}`);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.size = n;
      b.addEventListener('click', () => { api.setSetting('size', n); renderSettings(); });
      seg.append(b);
    }
  }

  function renderSettings() {
    const st = api.settings();
    for (const k of SLIDERS) {
      const v = Math.round(st[k] * 100);
      $('vol-' + k).value = v;
      $('val-' + k).textContent = v + ' %';
    }
    $('size-seg').querySelectorAll('.seg').forEach(b => {
      const on = Number(b.dataset.size) === st.size;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('muted-note').hidden = api.volume() > 0;
  }

  // Aufbau erst hier, wenn alle Konstanten oben angelegt sind
  applyStatic();
  ui.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  $('reset-stats').addEventListener('click', e => confirmTap(e.currentTarget, () => { api.resetStats(); show('stats'); }));
  const toLibrary = $('to-library');
  toLibrary.hidden = !api.exit;
  toLibrary.addEventListener('click', () => api.exit());
  buildSettings();
  window.addEventListener('keydown', () => { keyboard = true; }, { capture: true, signal });
  window.addEventListener('pointerdown', () => { keyboard = false; }, { capture: true, signal });

  return { show, hide, back, setStrings, destroy: disarm, get screen() { return current; } };
}
