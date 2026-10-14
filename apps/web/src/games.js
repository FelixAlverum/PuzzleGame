// Spiele der Bibliothek. Ein neues Spiel: Ordner unter games/, Manifest mit defineGame, hier eintragen.
// Importiert werden nur die Manifeste – der Spielcode lädt erst beim Start (dynamischer import im Manifest).
import cozyGarden from '@spielesammlung/cozy-garden';

export const GAMES = [cozyGarden];

export const findGame = id => GAMES.find(g => g.id === id) || null;

// Geplante Spiele (Fahrplan Phase 2): erscheinen in der Bibliothek als „Bald verfügbar“
export const UPCOMING = [
  {
    id: 'minesweeper',
    title: { de: 'Minesweeper', en: 'Minesweeper', fr: 'Démineur', es: 'Buscaminas', ru: 'Сапёр', zh: '扫雷' },
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#4a3424" stroke-width="4" stroke-linecap="round">' +
      '<path d="M32 10v44M10 32h44M17 17l30 30M47 17L17 47"/></g><circle cx="32" cy="32" r="14" fill="#4a3424"/>' +
      '<circle cx="27" cy="27" r="4" fill="#fbf5e6"/></svg>',
  },
  {
    id: 'solitaire',
    title: { de: 'Solitaire', en: 'Solitaire', fr: 'Solitaire', es: 'Solitario', ru: 'Косынка', zh: '纸牌接龙' },
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="8" width="34" height="46" rx="5" fill="#fbf5e6" stroke="#4a3424" stroke-width="3" transform="rotate(-10 29 31)"/>' +
      '<rect x="20" y="10" width="34" height="46" rx="5" fill="#fbf5e6" stroke="#4a3424" stroke-width="3"/>' +
      '<path d="M37 22c-4 6-9 9-9 14a5 5 0 0 0 9 3a5 5 0 0 0 9-3c0-5-5-8-9-14z" fill="#b8452f"/></svg>',
  },
  {
    id: 'spider',
    title: { de: 'Spider Solitaire', en: 'Spider Solitaire', fr: 'Spider Solitaire', es: 'Solitario Spider', ru: 'Паук', zh: '蜘蛛纸牌' },
    icon: '<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#4a3424" stroke-width="3" fill="none" stroke-linecap="round">' +
      '<path d="M26 28L12 18M26 32L10 32M26 36L12 46M38 28L52 18M38 32L54 32M38 36L52 46"/></g>' +
      '<ellipse cx="32" cy="34" rx="9" ry="11" fill="#4a3424"/><circle cx="32" cy="20" r="6" fill="#4a3424"/></svg>',
  },
];
