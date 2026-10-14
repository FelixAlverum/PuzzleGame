// Manifest von Spider Solitaire: alles, was die Bibliothek vor dem Start wissen muss.
// Der eigentliche Spielcode (src/main.js) wird erst beim Start geladen.
import { defineGame } from '@spielesammlung/game-sdk';
import { STR } from './src/i18n.js';
import cover from './cover.svg';

const VARIANTS = ['s1', 's2', 's4'];
const names = key => Object.fromEntries(Object.entries(STR).map(([lang, s]) => [lang, s[key]]));

export default defineGame({
  id: 'spider',
  title: { de: 'Spider Solitaire', en: 'Spider Solitaire', fr: 'Spider Solitaire', es: 'Solitario Spider', ru: 'Паук', zh: '蜘蛛纸牌' },
  description: {
    de: 'Zehn Spalten, zwei Decks: Ordne König bis Ass in einer Farbe. Mit 1, 2 oder 4 Farben.',
    en: 'Ten columns, two decks: sort King to Ace in one suit. With 1, 2 or 4 suits.',
    fr: 'Dix colonnes, deux jeux : range du Roi à l’As dans une couleur. À 1, 2 ou 4 couleurs.',
    es: 'Diez columnas, dos barajas: ordena del Rey al As de un palo. Con 1, 2 o 4 palos.',
    ru: 'Десять столбцов, две колоды: собери от короля до туза одной масти. 1, 2 или 4 масти.',
    zh: '十列牌，两副牌：把同花色从 K 排到 A。可选单色、双色或四色。',
  },
  cover,
  saveVersion: 1,
  // Bestzeit je Anzahl Farben in ms (weniger ist besser); proof: Seed + Züge, lässt sich nachspielen
  leaderboards: VARIANTS.map(id => ({ id, title: names(id), sort: 'asc', format: 'time' })),
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');
    return mount(el, platform);
  },
});
