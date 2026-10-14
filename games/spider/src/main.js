// Spider Solitaire: Regeln in logic.js, Texte in i18n.js. Tisch, Bedienung, Zeit, Speichern und Lebenszyklus
// übernimmt der gemeinsame Rahmen der Kartenspiele (@spielesammlung/cards/game). Hier steht nur die Lage der Stapel.
import { mountCardGame } from '@spielesammlung/cards/game';
import * as Logic from './logic.js';
import { STR } from './i18n.js';
import './style.css';

/**
 * Oben: Stapel (je übrige Runde ein Stück versetzt) und acht Plätze für fertige Folgen. Darunter zehn Spalten,
 * die lang werden können – darum etwas schmalere Karten als bei Solitaire und engere Fächer.
 */
export function layout(variant, W, H) {
  const cols = 10, pad = Math.max(5, Math.min(12, W * 0.012)), gap = Math.max(3, Math.min(12, W * 0.012));
  const cardW = Math.floor(Math.min((W - 2 * pad - gap * (cols - 1)) / cols, (H - 2 * pad - gap) / 3.2 / 1.4, 110));
  const cardH = Math.round(cardW * 1.4);
  const x0 = (W - (cols * cardW + (cols - 1) * gap)) / 2;
  const x = i => Math.round(x0 + i * (cardW + gap));
  const yTab = pad + cardH + gap * 1.4;
  return {
    cardW, cardH,
    slots: [
      { id: 'stock', x: x(0), y: pad, fan: 'none', group: 10, groupStep: Math.round(cardW * 0.16) },
      ...Logic.FOUNDATIONS.map((id, k) => ({ id, x: x(2 + k), y: pad, fan: 'none', nav: false })),
      ...Logic.TABLEAU.map((id, k) => ({ id, x: x(k), y: yTab, fan: 'down', maxH: H - yTab - pad, downStep: 0.09, upStep: 0.25, drop: true })),
    ],
  };
}

/** @param {HTMLElement} el @param {import('@spielesammlung/game-sdk').Platform} platform */
export function mount(el, platform) {
  return mountCardGame(el, platform, {
    className: 'spider',
    STR,
    Logic,
    cards: Logic.cardsOf,
    layout,
    // Stapel antippen geht nicht, solange eine Spalte leer ist
    explain: (game, pile) => (pile === 'stock' && Logic.dealBlocked(game) === 'gap' ? 'gap' : null),
  });
}
