// Manifest von Solitaire (Klondike): alles, was die Bibliothek vor dem Start wissen muss.
// Der eigentliche Spielcode (src/main.js) wird erst beim Start geladen.
import { defineGame } from '@spielesammlung/game-sdk';
import { STR } from './src/i18n.js';
import cover from './cover.svg';

const VARIANTS = ['draw1', 'draw3'];
const names = key => Object.fromEntries(Object.entries(STR).map(([lang, s]) => [lang, s[key]]));

export default defineGame({
  id: 'solitaire',
  title: names('title'),
  description: {
    de: 'Die klassische Patience: Lege alle Karten nach Farben von Ass bis König ab. Mit Rückgängig und Tipps.',
    en: 'The classic patience: build every suit from Ace to King. With undo and hints.',
    fr: 'La patience classique : range chaque couleur de l’As au Roi. Avec annulation et indices.',
    es: 'El solitario clásico: ordena cada palo del As al Rey. Con deshacer y pistas.',
    ru: 'Классический пасьянс: собери каждую масть от туза до короля. С отменой ходов и подсказками.',
    zh: '经典接龙：把每种花色从 A 收到 K。可以撤销，也有提示。',
  },
  cover,
  saveVersion: 1,
  // Bestzeit je Variante in ms (weniger ist besser); proof: Seed + Züge, lässt sich nachspielen
  leaderboards: VARIANTS.map(id => ({ id, title: names(id), sort: 'asc', format: 'time' })),
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');
    return mount(el, platform);
  },
});
