// Manifest von Cozy Garden: alles, was die Bibliothek vor dem Start wissen muss.
// Der eigentliche Spielcode (src/main.js) wird erst beim Start geladen.
import { defineGame } from '@spielesammlung/game-sdk';
import cover from './cover.svg';

export default defineGame({
  id: 'cozy-garden',
  title: { de: 'Cozy Garden', en: 'Cozy Garden', fr: 'Cozy Garden', es: 'Cozy Garden', ru: 'Cozy Garden', zh: 'Cozy Garden' },
  description: {
    de: 'Block-Puzzle mit Pflanzen aus Naturmaterialien. Löse Reihen auf und lass deinen Garten erblühen.',
    en: 'Block puzzle with plants made of natural materials. Clear lines and let your garden bloom.',
    fr: 'Puzzle de blocs aux plantes en matériaux naturels. Complète des lignes et fais fleurir ton jardin.',
    es: 'Puzle de bloques con plantas de materiales naturales. Completa líneas y haz florecer tu jardín.',
    ru: 'Блочная головоломка с растениями из природных материалов. Собирай линии, и твой сад расцветёт.',
    zh: '用天然材料植物拼成的方块益智游戏。消除行列，让你的花园绽放。',
  },
  cover,
  saveVersion: 3,
  // Stände von vor der Spielesammlung: v0.5 (eigenständig) und davor (YouTube Playable)
  legacySaveKeys: ['cozy-garden:save', 'puzzlegame-save'],
  leaderboards: [{ id: 'best', sort: 'desc', format: 'points' }],
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');
    return mount(el, platform);
  },
});
