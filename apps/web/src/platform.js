// Das platform-Objekt, das jedes Spiel beim Start bekommt (Vertrag: packages/game-sdk).
// Heute: Gast im Browser, alles lokal. Konten, Cloud-Sync und echte Ranglisten kommen mit der API (Phase 3),
// Käufe und DLC mit Phase 4 – an diesem Objekt ändert sich für die Spiele dann nichts.
import { loadSave, storeSave, submitScore } from './storage.js';

/**
 * @param {import('@spielesammlung/game-sdk').GameManifest} game
 * @param {{ store: ReturnType<typeof import('./storage.js').createStore>,
 *           settings: ReturnType<typeof import('./settings.js').createSettings>,
 *           exit?: () => void }} ctx
 * @returns {import('@spielesammlung/game-sdk').Platform}
 */
export function createPlatform(game, { store, settings, exit }) {
  return {
    gameId: game.id,
    user: { id: null, name: null, guest: true },
    save: {
      async load(slot) { return loadSave(store, game, slot); },
      store(data, slot) { storeSave(store, game.id, data, slot); },
    },
    scores: {
      // Lokal nur der eigene Rekord (für die Bibliothek). proof wird erst mit der API gebraucht.
      submit(board, value) { submitScore(store, game, board, value); },
    },
    entitlements: {
      has: () => false,                          // noch keine Käufe (Phase 4)
      onChange: () => () => {},
    },
    language: () => settings.language(),
    audio: {
      volume: () => settings.get().volume,
      onChange: cb => settings.subscribe(v => cb(v.volume)),
    },
    exit,
    logError: e => console.error(e),
  };
}
