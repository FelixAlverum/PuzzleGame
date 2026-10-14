// Kartengrafik als HTML, aufgebaut wie echte Spielkarten:
// - Ecke oben mit Wert und Farbe (bleibt im Fächer sichtbar), unten dieselbe Ecke um 180° gedreht
// - 2–10: Farbsymbole im klassischen Muster, die untere Hälfte steht auf dem Kopf
// - Ass: großes Farbsymbol im Kranz, Bube/Dame/König: doppelköpfige Figur im Rahmen
// Kleine Karten (Tisch mit Klasse .compact, z. B. Spider auf dem Handy) zeigen statt des Musters ein großes Symbol
// und keine untere Ecke – das regelt cards.css, die Karte enthält beides.
// Die Bilder liegen als eigene Dateien unter packages/cards/assets/ und werden eingebettet (?raw), damit currentColor
// die Kartenfarbe übernimmt. Austauschen: Datei ersetzen. Farbsymbole als SVG statt Unicode (iOS zeigt ♥ als Emoji).
import { RANK_LABEL } from './deck.js';
import spades from '../assets/suits/spades.svg?raw';
import hearts from '../assets/suits/hearts.svg?raw';
import diamonds from '../assets/suits/diamonds.svg?raw';
import clubs from '../assets/suits/clubs.svg?raw';
import jack from '../assets/figures/jack.svg?raw';
import queen from '../assets/figures/queen.svg?raw';
import king from '../assets/figures/king.svg?raw';
import aceOrnament from '../assets/ace-ornament.svg?raw';

const SUIT = [spades, hearts, diamonds, clubs];          // Reihenfolge wie SUITS in deck.js
const FIGURE = { 11: jack, 12: queen, 13: king };

// Lage der Farbsymbole je Wert: [x, y] im Musterfeld (0..1); ab y > 0.5 steht das Symbol auf dem Kopf
const L = 0, C = 0.5, R = 1;
const SIDES4 = [[L, 0], [R, 0], [L, 1], [R, 1]];
const SIDES6 = [...SIDES4, [L, 0.5], [R, 0.5]];
const SIDES8 = [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1]];
export const PIPS = {
  2: [[C, 0], [C, 1]],
  3: [[C, 0], [C, 0.5], [C, 1]],
  4: SIDES4,
  5: [...SIDES4, [C, 0.5]],
  6: SIDES6,
  7: [...SIDES6, [C, 0.25]],
  8: [...SIDES6, [C, 0.25], [C, 0.75]],
  9: [...SIDES8, [C, 0.5]],
  10: [...SIDES8, [C, 1 / 6], [C, 5 / 6]],
};

// Klassen idx-top/idx-bot statt top/bot: .top ist im Theme schon die Kopfzeile einer Seite
const corner = (card, cls) => `<span class="idx ${cls}"><b>${RANK_LABEL[card.rank]}</b>${SUIT[card.suit]}</span>`;

function middle(card) {
  const s = SUIT[card.suit];
  if (FIGURE[card.rank]) {
    return `<span class="mid fig">${FIGURE[card.rank]}</span>`;
  }
  if (card.rank === 1) return `<span class="mid ace"><span class="orn">${aceOrnament}</span>${s}</span>`;
  const pips = PIPS[card.rank].map(([x, y]) =>
    `<i${y > 0.5 ? ' class="flip"' : ''} style="left:${x * 100}%;top:${(y * 100).toFixed(2)}%">${s}</i>`).join('');
  return `<span class="mid simple">${s}</span><span class="pips">${pips}</span>`;
}

/** Innenleben einer Karte (Vorderseite + Rückseite) */
export function cardHTML(card) {
  return `<div class="face">${corner(card, 'idx-top')}${middle(card)}${corner(card, 'idx-bot')}</div><div class="back"></div>`;
}
