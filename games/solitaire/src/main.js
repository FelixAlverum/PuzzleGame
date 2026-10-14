// Solitaire (Klondike): Regeln in logic.js, Texte in i18n.js. Tisch, Bedienung, Zeit, Speichern und Lebenszyklus
// übernimmt der gemeinsame Rahmen der Kartenspiele (@spielesammlung/cards/game). Hier steht nur die Lage der Stapel.
import { mountCardGame } from '@spielesammlung/cards/game';
import * as Logic from './logic.js';
import { STR } from './i18n.js';
import './style.css';

const RECYCLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M19 2.5v5h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Oben: Stapel, Ablage, Lücke, vier Zielstapel. Darunter sieben Spalten.
 * Kartengröße: passt in die Breite und lässt unter der oberen Reihe Platz für knapp zwei Kartenhöhen (Spalten stauchen sich).
 */
export function layout(variant, W, H) {
  const cols = 7, pad = Math.max(6, Math.min(14, W * 0.015)), gap = Math.max(4, Math.min(16, W * 0.016));
  const cardW = Math.floor(Math.min((W - 2 * pad - gap * (cols - 1)) / cols, (H - 2 * pad - gap) / 2.9 / 1.4, 130));
  const cardH = Math.round(cardW * 1.4);
  const x0 = (W - (cols * cardW + (cols - 1) * gap)) / 2;
  const x = i => Math.round(x0 + i * (cardW + gap));
  const yTab = pad + cardH + gap * 1.4;
  return {
    cardW, cardH,
    slots: [
      { id: 'stock', x: x(0), y: pad, fan: 'none', label: RECYCLE },
      { id: 'waste', x: x(1), y: pad, fan: 'right', show: variant === 'draw3' ? 3 : 1 },
      ...Logic.FOUNDATIONS.map((id, k) => ({ id, x: x(3 + k), y: pad, fan: 'none', label: 'A', drop: true })),
      ...Logic.TABLEAU.map((id, k) => ({ id, x: x(k), y: yTab, fan: 'down', maxH: H - yTab - pad, label: 'K', drop: true })),
    ],
  };
}

/** @param {HTMLElement} el @param {import('@spielesammlung/game-sdk').Platform} platform */
export function mount(el, platform) {
  return mountCardGame(el, platform, {
    className: 'solitaire',
    STR,
    Logic,
    cards: () => Logic.CARDS,
    layout,
  });
}
