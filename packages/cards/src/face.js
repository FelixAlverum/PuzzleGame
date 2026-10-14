// Kartengrafik als HTML/SVG: Ecke mit Wert und Farbe (bleibt im Fächer sichtbar), in der Mitte großes Farbsymbol,
// bei Bube, Dame und König eine kleine Figur. Farbsymbole als SVG statt Unicode, weil iOS ♥ sonst als Emoji zeigt.
import { RANK_LABEL, isRed } from './deck.js';

export const SUIT_PATH = [
  // Pik
  'M12 1.5C9.2 5.6 3.5 8.6 3.5 13.4a4.3 4.3 0 0 0 7.4 3L9.8 22h4.4l-1.1-5.6a4.3 4.3 0 0 0 7.4-3C20.5 8.6 14.8 5.6 12 1.5z',
  // Herz
  'M12 21.5C6.8 17 2.5 13.4 2.5 8.6A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9.5 2.2c0 4.8-4.3 8.4-9.5 12.9z',
  // Karo
  'M12 1.5L20.5 12 12 22.5 3.5 12z',
  // Kreuz
  'M12 2.2a4.3 4.3 0 0 0-3.6 6.7A4.3 4.3 0 1 0 10.6 16L9.8 22h4.4l-.8-6a4.3 4.3 0 1 0 2.2-7.1A4.3 4.3 0 0 0 12 2.2z',
];

export const suitSvg = suit => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SUIT_PATH[suit]}" fill="currentColor"/></svg>`;

const GOLD = '#e2b44a', SKIN = '#f3d4ab', HAIR = '#7a4a26';

// Figur für Bube (11), Dame (12), König (13) in einem Rahmen; Gewand in der Kartenfarbe
function figure(rank, suit) {
  const robe = isRed(suit) ? '#b8452f' : '#33404f';
  const head = `<circle cx="20" cy="25" r="7" fill="${SKIN}"/><circle cx="17.6" cy="24.5" r="0.9" fill="#3a2a1c"/><circle cx="22.4" cy="24.5" r="0.9" fill="#3a2a1c"/>`;
  const body = `<path d="M5 51C5 39 11 34 20 34s15 5 15 17z" fill="${robe}"/><path d="M20 34v17" stroke="${GOLD}" stroke-width="2"/>` +
    `<path d="M12 36.5c3 2.6 13 2.6 16 0" stroke="${GOLD}" stroke-width="2" fill="none"/>`;
  let hat = '';
  if (rank === 13) {
    hat = `<path d="M13 30c1 4 13 4 14 0l-1.5 6c-3 2-8 2-11 0z" fill="${HAIR}"/>` +   // Bart
      `<path d="M11.5 19V10l4.2 4.2L20 8l4.3 6.2L28.5 10v9z" fill="${GOLD}"/><circle cx="20" cy="15.5" r="1.4" fill="#b8452f"/>`;
  } else if (rank === 12) {
    hat = `<ellipse cx="13.5" cy="28" rx="2.6" ry="6" fill="${HAIR}"/><ellipse cx="26.5" cy="28" rx="2.6" ry="6" fill="${HAIR}"/>` +
      `<path d="M14 19.5v-5l3 2.4 3-4.4 3 4.4 3-2.4v5z" fill="${GOLD}"/><circle cx="20" cy="17" r="1.1" fill="#3f7a2a"/>`;
  } else {
    hat = `<path d="M11.5 21c0-7 17-7 17 0z" fill="${robe}"/><path d="M26 15c4-5 8-5 10-3-3 0-6 2-8 5" fill="${GOLD}"/>`;
  }
  return `<svg viewBox="0 0 40 52" aria-hidden="true" preserveAspectRatio="xMidYMax meet">` +
    `<rect x="1" y="1" width="38" height="50" rx="4" fill="#f6ecd2" stroke="currentColor" stroke-width="1.2"/>` +
    `${body}${head}${hat}</svg>`;
}

/** Innenleben einer Karte (Vorderseite + Rückseite) */
export function cardHTML(card) {
  const mid = card.rank >= 11 ? figure(card.rank, card.suit) : suitSvg(card.suit);
  return `<div class="face"><span class="idx"><b>${RANK_LABEL[card.rank]}</b>${suitSvg(card.suit)}</span>` +
    `<span class="mid${card.rank === 1 ? ' ace' : ''}${card.rank >= 11 ? ' fig' : ''}">${mid}</span></div><div class="back"></div>`;
}
