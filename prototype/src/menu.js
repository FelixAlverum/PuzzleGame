// Menü, Statistik und Einstellungen als HTML-Overlay über dem Canvas (siehe Vault: 02 Design/UI und UX).
// HTML statt Canvas: Regler, Fokus und Tastaturbedienung gibt es so gratis.
// Kennt keinen Spielzustand – alles kommt über die Callbacks aus main.js (api).
(function (root) {
  'use strict';

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const fmt = v => (v == null ? '–' : Number(v).toLocaleString());

  // Beispielformen für die Vorschaubilder: je Biom ein Extra + eine Grundform
  const THUMB = {
    meadow: [['bluete', 0, 0.3, 0.6], ['tulpe', 0, 3.9, 0.6]],
    pond: [['seerose', 0, 0.3, 0.6], ['rohrkolben', 0, 3.9, 0.6]],
    tropics: [['hibiskus', 0, 0.3, 0.6], ['bambus', 0, 3.9, 0.6]],
  };

  let api = null, S = null, ui = null, current = null;
  let armed = null;   // Zwei-Tipp-Bestätigung: { btn, label, timer }
  let keyboard = false; // zuletzt per Tastatur bedient → Fokus beim Seitenwechsel setzen

  function init(opts) {
    api = opts;
    S = opts.S;
    ui = $('ui');
    ui.querySelectorAll('[data-t]').forEach(n => { n.textContent = S[n.dataset.t]; });
    ui.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
    $('reset-stats').addEventListener('click', e => confirmTap(e.currentTarget, () => { api.resetStats(); show('stats'); }));
    buildSettings();
    root.addEventListener('keydown', () => { keyboard = true; }, true);
    root.addEventListener('pointerdown', () => { keyboard = false; }, true);
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
    if (name === 'menu') renderMenu();
    else if (name === 'stats') renderStats();
    else if (name === 'settings') renderSettings();
    ui.scrollTop = 0;
    const first = ui.querySelector('.screen.active button');
    if (first && keyboard) first.focus({ preventScroll: true });
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

  function drawThumb(canvas, biome) {
    const dpr = Math.min(root.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 240, h = canvas.clientHeight || 135;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    Garden.backdrop(g, w, h, biome);
    const cs = h / 4.2, ox = w / 2 - cs * 3.6, oy = h / 2 - cs * 2.1;
    THUMB[biome].forEach(([id, v, c, r], k) => {
      const piece = Logic.pieceOf({ shape: id, v });
      const cells = piece.cells.map(p => ({ r: p.r, c: p.c, m: piece.mat, p: k + 1, a: p.a ? piece.accent : 0 }));
      Mat.renderCells(g, cells, ox + c * cs, oy + r * cs, cs);
    });
  }

  function renderMenu() {
    const size = api.settings().size;
    $('size-chip').textContent = `${S.field} ${size}×${size}`;
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
      drawThumb(thumb, b);
    }
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
    const data = api.statsData();
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
    $('muted-note').hidden = api.audioEnabled();
  }

  root.Menu = { init, show, hide, back, get screen() { return current; } };
})(self);
