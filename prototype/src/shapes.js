// Formen-Katalog (siehe Vault: 05 Formen). Läuft im Browser (window.Shapes) und in Node (Tests).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Shapes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Raster: X = Zelle, o = Zelle mit Akzent-Deko, . = leer
  const DEFS = [
    { id: 'kiesel',      mat: 'stone', weight: 6,  variants: 'none',          grid: ['X'] },
    { id: 'samen',       mat: 'bark',  weight: 10, variants: 'rotate',        grid: ['XX'] },
    { id: 'keimling',    mat: 'moss',  weight: 10, variants: 'rotate',        grid: ['o.', 'XX'], accent: 'sprout' },
    { id: 'zweig',       mat: 'wood',  weight: 9,  variants: 'rotate',        grid: ['XXo'], accent: 'leaflet' },
    { id: 'ast',         mat: 'wood',  weight: 6,  variants: 'rotate',        grid: ['XXXX'] },
    { id: 'baumstamm',   mat: 'wood',  weight: 3,  variants: 'rotate',        grid: ['oXXXo'], accent: 'rings' },
    { id: 'moospolster', mat: 'moss',  weight: 8,  variants: 'none',          grid: ['XX', 'XX'] },
    { id: 'felsplatte',  mat: 'stone', weight: 2,  variants: 'none',          grid: ['XXX', 'XoX', 'XXX'], accent: 'lichen' },
    { id: 'pilz',        mat: 'bark',  weight: 7,  variants: 'rotate',        grid: ['ooo', '.X.'], accent: 'cap' },
    { id: 'bluete',      mat: 'petal', weight: 4,  variants: 'none',          grid: ['.X.', 'XoX', '.X.'], accent: 'stamen' },
    { id: 'tulpe',       mat: 'petal', weight: 3,  variants: 'rotate',        grid: ['X.X', 'XXX', '.o.'], accent: 'stem' },
    { id: 'ranke',       mat: 'leaf',  weight: 4,  variants: 'rotate',        grid: ['X..', 'XX.', '.XX'] },
    { id: 'zaunecke',    mat: 'wood',  weight: 5,  variants: 'rotate',        grid: ['X..', 'X..', 'XXX'] },
    { id: 'wurzel',      mat: 'bark',  weight: 3,  variants: 'rotate',        grid: ['.X.', 'XXX', 'X.X'] },
    { id: 'farnwedel',   mat: 'leaf',  weight: 2,  variants: 'rotate+mirror', grid: ['.X', 'XX', '.X', 'XX'] },
    { id: 'laubblatt',   mat: 'leaf',  weight: 2,  variants: 'rotate',        grid: ['.XX', 'XXX', 'XX.'] },
  ];

  const MATERIALS = ['wood', 'stone', 'moss', 'leaf', 'petal', 'bark'];

  function normalize(cells) {
    const minR = Math.min(...cells.map(p => p.r));
    const minC = Math.min(...cells.map(p => p.c));
    const out = cells.map(p => ({ r: p.r - minR, c: p.c - minC, a: p.a }));
    out.sort((p, q) => p.r - q.r || p.c - q.c);
    return out;
  }

  function parse(grid) {
    const cells = [];
    grid.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === 'X' || ch === 'o') cells.push({ r, c, a: ch === 'o' });
    }));
    return normalize(cells);
  }

  const rotate = cells => normalize(cells.map(p => ({ r: p.c, c: -p.r, a: p.a })));
  const mirror = cells => normalize(cells.map(p => ({ r: p.r, c: -p.c, a: p.a })));
  const keyOf = cells => cells.map(p => `${p.r},${p.c},${p.a ? 1 : 0}`).join(';');

  const SHAPES = DEFS.map(def => {
    const seen = new Map();
    const add = cells => { const k = keyOf(cells); if (!seen.has(k)) seen.set(k, cells); };
    let cur = parse(def.grid);
    const turns = def.variants === 'none' ? 1 : 4;
    for (let i = 0; i < turns; i++) {
      add(cur);
      if (def.variants === 'rotate+mirror') add(mirror(cur));
      cur = rotate(cur);
    }
    const variants = [...seen.values()].map(cells => ({
      cells,
      h: 1 + Math.max(...cells.map(p => p.r)),
      w: 1 + Math.max(...cells.map(p => p.c)),
    }));
    return { ...def, size: variants[0].cells.length, variants };
  });

  const BY_ID = Object.fromEntries(SHAPES.map(s => [s.id, s]));

  return { SHAPES, BY_ID, MATERIALS };
});
