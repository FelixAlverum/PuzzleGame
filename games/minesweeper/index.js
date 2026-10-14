// Manifest von Minesweeper: alles, was die Bibliothek vor dem Start wissen muss.
// Der eigentliche Spielcode (src/main.js) wird erst beim Start geladen.
import { defineGame } from '@spielesammlung/game-sdk';
import cover from './cover.svg';
import { STR } from './src/i18n.js';

// Stufen mit Rangliste (wie LEVEL_IDS in src/logic.js); Namen je Sprache aus den Spieltexten
const LEVEL_IDS = ['beginner', 'intermediate', 'expert'];
const levelTitle = id => Object.fromEntries(Object.entries(STR).map(([lang, s]) => [lang, s[id]]));

export default defineGame({
  id: 'minesweeper',
  title: levelTitle('title'),
  description: {
    de: 'Der Klassiker: Decke alle Felder ohne Mine auf. Der erste Klick ist immer sicher.',
    en: 'The classic: reveal every field without a mine. Your first click is always safe.',
    fr: 'Le classique : découvre toutes les cases sans mine. Le premier clic est toujours sûr.',
    es: 'El clásico: descubre todas las casillas sin mina. El primer clic siempre es seguro.',
    ru: 'Классика: открой все клетки без мин. Первый ход всегда безопасен.',
    zh: '经典玩法：翻开所有没有地雷的格子。第一次点击永远安全。',
  },
  cover,
  saveVersion: 1,
  // Bestzeit je Stufe in ms (weniger ist besser); proof: Seed + Züge, lässt sich nachspielen
  leaderboards: LEVEL_IDS.map(id => ({ id, title: levelTitle(id), sort: 'asc', format: 'time' })),
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');
    return mount(el, platform);
  },
});
