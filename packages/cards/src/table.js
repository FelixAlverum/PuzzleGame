// Kartentisch im DOM: eine Element je Karte, Positionen per transform (Züge gleiten per CSS-Übergang),
// Stapel als Plätze mit Fächer nach unten, nach rechts oder ohne Fächer.
// Bedienung: Karten ziehen und ablegen, antippen (das Spiel entscheidet, wohin), Tastatur-Cursor.
// Die Regeln kennt der Tisch nicht – er fragt das Spiel: canDrag(stapel, index), drop(stapel, index, ziel), tap(…).
import { cardHTML } from './face.js';

const DRAG_START = 6;     // px Bewegung, ab der aus einem Tippen ein Ziehen wird
const LIFT_MS = 280;      // so lange fliegen bewegte Karten über allen anderen

/**
 * @param {HTMLElement} host
 * @param {{
 *   cards: { id: number, suit: number, rank: number }[],
 *   label: (card: object, up: boolean) => string,
 *   canDrag: (pile: string, index: number) => boolean,
 *   drop: (pile: string, index: number, target: string) => boolean,
 *   tap: (pile: string, index: number) => void,
 *   onPress?: () => void,
 * }} opts
 */
export function createTable(host, opts) {
  const root = document.createElement('div');
  root.className = 'ptable';
  host.append(root);

  const cardById = new Map(opts.cards.map(c => [c.id, c]));
  const els = new Map();
  for (const c of opts.cards) {
    const el = document.createElement('div');
    el.className = 'pcard' + (c.suit === 1 || c.suit === 2 ? ' red' : '');
    el.dataset.id = c.id;
    el.innerHTML = cardHTML(c);
    root.append(el);
    els.set(c.id, el);
  }

  let layout = { cardW: 60, cardH: 84, slots: [] };
  let piles = {};
  let pos = new Map();                   // id → { pile, index, x, y, z, up }
  const slotEls = new Map();
  let press = null;                      // laufende Berührung / Ziehen
  let cursor = null;                     // Tastatur: { pile, index }
  let picked = null;                     // Tastatur: aufgenommene Karten { pile, index }
  let liftTimer = 0;
  let celebrating = false;

  // --- Lage -------------------------------------------------------------------------------

  /** Plätze setzen: { cardW, cardH, slots: [{ id, x, y, fan: 'down'|'right'|'none', maxH?, show?, group?, groupStep?, label?, drop? }] } */
  function setLayout(l) {
    layout = l;
    root.style.setProperty('--cw', l.cardW + 'px');
    root.style.setProperty('--ch', l.cardH + 'px');
    for (const [id, el] of slotEls) if (!l.slots.some(s => s.id === id)) { el.remove(); slotEls.delete(id); }
    for (const s of l.slots) {
      let el = slotEls.get(s.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'slot';
        el.dataset.pile = s.id;
        root.prepend(el);
        slotEls.set(s.id, el);
      }
      el.innerHTML = s.label || '';
      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
  }

  function slotOf(id) { return layout.slots.find(s => s.id === id); }

  // Position jeder Karte aus Platz und Fächer; Spalten werden gestaucht, damit sie in maxH passen
  function positions() {
    const out = new Map(), { cardW, cardH } = layout;
    layout.slots.forEach((s, order) => {
      const list = piles[s.id] || [];
      const z0 = (order + 1) * 200;
      if (s.fan === 'down') {
        const dStep = cardH * (s.downStep ?? 0.11), uStep = cardH * (s.upStep ?? 0.28);
        let need = 0;
        for (let i = 0; i < list.length - 1; i++) need += list[i].up ? uStep : dStep;
        const room = (s.maxH ?? Infinity) - cardH;
        const f = need > room && need > 0 ? Math.max(0, room / need) : 1;
        let y = s.y;
        list.forEach((c, i) => {
          out.set(c.id, { pile: s.id, index: i, x: s.x, y, z: z0 + i, up: c.up });
          y += (c.up ? uStep : dStep) * f;
        });
      } else if (s.fan === 'right') {
        const first = Math.max(0, list.length - (s.show || 3));
        list.forEach((c, i) => {
          out.set(c.id, { pile: s.id, index: i, x: s.x + Math.max(0, i - first) * cardW * 0.3, y: s.y, z: z0 + i, up: c.up });
        });
      } else {
        list.forEach((c, i) => {
          const dx = s.group ? Math.floor(i / s.group) * (s.groupStep || 0) : 0;
          // Verdeckte Karten im Stoß werfen keinen Schatten, sonst addieren sich die Schatten zu einem dunklen Rand
          const flat = i < list.length - 2 && (!s.group || (i + 1) % s.group !== 0);
          out.set(c.id, { pile: s.id, index: i, x: s.x + dx, y: s.y, z: z0 + i, up: c.up, flat });
        });
      }
    });
    return out;
  }

  const place = (el, p) => { el.style.transform = `translate(${p.x}px, ${p.y}px)`; };

  /**
   * Karten an ihre Plätze. piles: { <stapel>: [{ id, up }] }.
   * instant: ohne Übergang (Größenänderung); stagger: ms Verzögerung je bewegter Karte (Austeilen).
   */
  function render(next, { instant = false, stagger = 0 } = {}) {
    piles = next;
    if (celebrating) stopCelebration();
    const np = positions();
    if (instant) root.classList.add('instant');
    let k = 0, lifted = false;
    for (const [id, el] of els) {
      const p = np.get(id), prev = pos.get(id);
      if (!p) { el.hidden = true; continue; }
      el.hidden = false;
      const moved = !prev || prev.pile !== p.pile;
      if (stagger && moved && !instant) el.style.transitionDelay = `${k++ * stagger}ms`;
      else if (el.style.transitionDelay) el.style.transitionDelay = '';
      place(el, p);
      if (moved && !instant && prev) { el.style.zIndex = 1000 + p.index; lifted = true; }
      else el.style.zIndex = p.z;
      if (el.classList.contains('up') !== p.up) {
        el.classList.toggle('up', p.up);
        if (p.up && prev && !instant && el.animate) el.animate([{ scale: '0.08 1' }, { scale: '1 1' }], { duration: 170, easing: 'ease-out', delay: stagger ? (k - 1) * stagger : 0 });
      }
      el.classList.toggle('flat', !!p.flat);
      el.setAttribute('aria-label', opts.label(cardById.get(id), p.up));
      el.classList.remove('drag', 'hint', 'picked');
    }
    pos = np;
    if (instant) { void root.offsetWidth; root.classList.remove('instant'); }
    if (lifted || stagger) {
      clearTimeout(liftTimer);
      liftTimer = setTimeout(() => {
        for (const [id, el] of els) {
          const p = pos.get(id);
          if (p && !el.classList.contains('drag')) { el.style.zIndex = p.z; el.style.transitionDelay = ''; }
        }
      }, LIFT_MS + k * stagger);
    }
    if (cursor) clampCursor();
    if (picked && !(piles[picked.pile] || [])[picked.index]) picked = null;
    paintCursor();
  }

  // --- Ziehen und Tippen -------------------------------------------------------------------

  function hitTest(e) {
    const cardEl = e.target.closest && e.target.closest('.pcard');
    if (cardEl) {
      const p = pos.get(Number(cardEl.dataset.id));
      if (p) return { pile: p.pile, index: p.index };
    }
    const slotEl = e.target.closest && e.target.closest('.slot');
    if (slotEl) return { pile: slotEl.dataset.pile, index: -1 };
    return null;
  }

  // Ziel beim Loslassen: Platz mit der größten Überlappung zur obersten gezogenen Karte
  function findTarget(from, rect) {
    const { cardW, cardH } = layout;
    let best = null, bestArea = 0;
    for (const s of layout.slots) {
      if (!s.drop || s.id === from) continue;
      const list = piles[s.id] || [];
      let bottom = s.y + cardH;
      if (s.fan === 'down' && list.length) bottom = pos.get(list[list.length - 1].id).y + cardH;
      const w = Math.min(rect.x + cardW, s.x + cardW) - Math.max(rect.x, s.x);
      const h = Math.min(rect.y + cardH, bottom) - Math.max(rect.y, s.y);
      if (w > 0 && h > 0 && w * h > bestArea) { best = s.id; bestArea = w * h; }
    }
    return best;
  }

  function snapBack(ids) {
    for (const id of ids) {
      const el = els.get(id), p = pos.get(id);
      el.classList.remove('drag');
      place(el, p);
      el.style.zIndex = 1000 + p.index;
    }
    clearTimeout(liftTimer);
    liftTimer = setTimeout(() => { for (const id of ids) els.get(id).style.zIndex = pos.get(id).z; }, LIFT_MS);
  }

  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || press || celebrating) return;
    const hit = hitTest(e);
    if (!hit) return;
    if (opts.onPress) opts.onPress();
    press = { ...hit, x: e.clientX, y: e.clientY, pid: e.pointerId, dragging: false, ids: [] };
    try { root.setPointerCapture(e.pointerId); } catch { /* egal */ }
    e.preventDefault();
  });

  root.addEventListener('pointermove', e => {
    if (!press || e.pointerId !== press.pid) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.dragging) {
      if (Math.hypot(dx, dy) < DRAG_START || press.index < 0 || !opts.canDrag(press.pile, press.index)) return;
      press.dragging = true;
      press.ids = piles[press.pile].slice(press.index).map(c => c.id);
      press.ids.forEach((id, k) => {
        const el = els.get(id);
        el.classList.add('drag');
        el.style.zIndex = 3000 + k;
        el.style.transitionDelay = '';
      });
      cursor = null; picked = null;
      paintCursor();
    }
    for (const id of press.ids) {
      const p = pos.get(id);
      place(els.get(id), { x: p.x + dx, y: p.y + dy });
    }
  });

  function endPress(e, cancelled) {
    if (!press || e.pointerId !== press.pid) return;
    const pr = press;
    press = null;
    if (pr.dragging) {
      const p = pos.get(pr.ids[0]);
      const target = cancelled ? null : findTarget(pr.pile, { x: p.x + e.clientX - pr.x, y: p.y + e.clientY - pr.y });
      for (const id of pr.ids) els.get(id).classList.remove('drag');
      if (!target || !opts.drop(pr.pile, pr.index, target)) snapBack(pr.ids);
    } else if (!cancelled) {
      opts.tap(pr.pile, pr.index);
    }
  }
  root.addEventListener('pointerup', e => endPress(e, false));
  root.addEventListener('pointercancel', e => endPress(e, true));
  root.addEventListener('contextmenu', e => e.preventDefault());

  // --- Hervorheben ----------------------------------------------------------------------

  function targets(pile, index) {
    const list = piles[pile] || [];
    if (index < 0 || !list.length) return [slotEls.get(pile)].filter(Boolean);
    return list.slice(index).map(c => els.get(c.id));
  }

  /** Karten ab index (oder den leeren Platz) kurz markieren, z. B. für einen Tipp */
  function mark(pile, index, cls = 'hint', ms = 1300) {
    const list = targets(pile, index);
    for (const el of list) el.classList.add(cls);
    setTimeout(() => { for (const el of list) el.classList.remove(cls); }, ms);
  }

  /** Kopfschütteln: Zug geht nicht */
  function shake(pile, index) {
    for (const el of targets(pile, index)) {
      if (el.animate) el.animate([{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 260 });
    }
  }

  // --- Tastatur -----------------------------------------------------------------------------

  const navOrder = () => layout.slots.filter(s => s.nav !== false).map(s => s.id);
  function topIndex(pile) { return (piles[pile] || []).length - 1; }
  function clampCursor() {
    const n = (piles[cursor.pile] || []).length;
    if (cursor.index >= n) cursor.index = n - 1;
  }
  function paintCursor() {
    for (const el of root.querySelectorAll('.cursor')) el.classList.remove('cursor');
    for (const el of root.querySelectorAll('.picked')) el.classList.remove('picked');
    if (picked) for (const el of targets(picked.pile, picked.index)) el.classList.add('picked');
    if (!cursor) return;
    const list = piles[cursor.pile] || [];
    const el = cursor.index >= 0 && list[cursor.index] ? els.get(list[cursor.index].id) : slotEls.get(cursor.pile);
    if (el) el.classList.add('cursor');
  }

  /** Taste verarbeiten; true, wenn der Tisch sie genutzt hat */
  function key(k) {
    if (celebrating) return false;
    const order = navOrder();
    if (!order.length) return false;
    if (k.startsWith('Arrow') && !cursor) {
      const first = order.find(p => (piles[p] || []).length) || order[0];
      cursor = { pile: first, index: topIndex(first) };
      paintCursor();
      return true;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const i = order.indexOf(cursor.pile), d = k === 'ArrowLeft' ? -1 : 1;
      const pile = order[(i + d + order.length) % order.length];
      cursor = { pile, index: topIndex(pile) };
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      const list = piles[cursor.pile] || [];
      let i = cursor.index;
      // Hoch: tiefer in die Spalte, solange die Karten dort mitgenommen werden können; runter: zur obersten
      if (k === 'ArrowUp') { if (i > 0 && opts.canDrag(cursor.pile, i - 1)) i--; }
      else if (i < list.length - 1) i++;
      cursor.index = i;
    } else if (k === 'Enter') {
      if (!cursor) return false;
      picked = null;
      opts.tap(cursor.pile, cursor.index);
    } else if (k === ' ') {
      if (!cursor) return false;
      if (!picked) {
        if (cursor.index >= 0 && opts.canDrag(cursor.pile, cursor.index)) picked = { ...cursor };
        else shake(cursor.pile, cursor.index);
      } else {
        const pk = picked;
        picked = null;
        if (pk.pile === cursor.pile || !opts.drop(pk.pile, pk.index, cursor.pile)) shake(pk.pile, pk.index);
      }
    } else if (k === 'Escape') {
      if (!picked && !cursor) return false;
      picked = null;
      cursor = null;
    } else return false;
    paintCursor();
    return true;
  }

  // --- Siegesfeier: alle Karten springen in Bögen vom Tisch --------------------------------

  function celebrate() {
    celebrating = true;
    const H = root.clientHeight, W = root.clientWidth, list = [...pos.keys()];
    const gap = Math.max(18, Math.min(45, 2200 / list.length));
    list.sort((a, b) => pos.get(b).z - pos.get(a).z).forEach((id, k) => {
      const el = els.get(id), p = pos.get(id);
      if (!el.animate) return;
      el.style.zIndex = 5000 + k;
      const vx = (Math.random() - 0.5) * W * 0.9, up = 60 + Math.random() * H * 0.35;
      const fall = H - p.y + layout.cardH * 1.5, rot = (Math.random() - 0.5) * 540;
      el.animate([
        { translate: '0 0', rotate: '0deg' },
        { translate: `${vx * 0.35}px ${-up}px`, rotate: `${rot * 0.3}deg`, offset: 0.3 },
        { translate: `${vx}px ${fall}px`, rotate: `${rot}deg` },
      ], { duration: 1300 + Math.random() * 500, delay: k * gap, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
    });
    return list.length * gap + 1800;
  }

  function stopCelebration() {
    celebrating = false;
    for (const el of els.values()) for (const a of el.getAnimations ? el.getAnimations() : []) a.cancel();
  }

  return {
    root,
    setLayout,
    render,
    mark,
    shake,
    key,
    celebrate,
    /** Mitte einer Karte in Bildschirm-Koordinaten (für Tests) */
    cardCenter(id) {
      const r = els.get(id).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 12) };
    },
    slotCenter(pile) {
      const r = slotEls.get(pile).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    get busy() { return !!press; },
    cancelPress() {
      if (press && press.dragging) snapBack(press.ids);
      press = null;
    },
    destroy() {
      clearTimeout(liftTimer);
      root.remove();
    },
  };
}
