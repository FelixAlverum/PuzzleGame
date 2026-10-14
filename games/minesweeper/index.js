// Manifest von Minesweeper: alles, was die Bibliothek vor dem Start wissen muss.
// Der eigentliche Spielcode (src/main.js) wird erst beim Start geladen.
import { defineGame } from '@spielesammlung/game-sdk';
import cover from './cover.svg';

const LEVEL_TITLES = {
  beginner: { de: 'Anfänger', en: 'Beginner', fr: 'Débutant', es: 'Principiante', ru: 'Новичок', zh: '初级' },
  intermediate: { de: 'Fortgeschritten', en: 'Intermediate', fr: 'Intermédiaire', es: 'Intermedio', ru: 'Любитель', zh: '中级' },
  expert: { de: 'Profi', en: 'Expert', fr: 'Expert', es: 'Experto', ru: 'Профессионал', zh: '高级' },
};

export default defineGame({
  id: 'minesweeper',
  title: { de: 'Minesweeper', en: 'Minesweeper', fr: 'Démineur', es: 'Buscaminas', ru: 'Сапёр', zh: '扫雷' },
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
  leaderboards: Object.entries(LEVEL_TITLES).map(([id, title]) => ({ id, title, sort: 'asc', format: 'time' })),
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');
    return mount(el, platform);
  },
});
