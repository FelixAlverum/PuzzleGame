// Plattform-Adapter: die einzige Stelle, an der das Spiel mit der Außenwelt spricht – Spielstand, Rangliste,
// Sprache, Ton, Pause. Das Spiel selbst fasst weder localStorage noch Netzwerk an.
// Heute läuft alles lokal im Browser. Später stellt die Plattform-Hülle (apps/web) dieses Objekt bereit,
// dann mit Konto, Cloud-Spielständen und Ranglisten – siehe docs/architektur.md, „Spielvertrag“.
(function (root) {
  'use strict';

  const GAME_ID = 'cozy-garden';
  const KEY = `${GAME_ID}:save`;
  const LEGACY_KEY = 'puzzlegame-save';   // Schlüssel bis v0.4 (YouTube-Playable-Zeit)
  let loaded = false;

  const storage = (() => { try { return root.localStorage; } catch (e) { return null; } })();

  const Platform = {
    gameId: GAME_ID,

    save: {
      async load() {
        try {
          const raw = storage && (storage.getItem(KEY) ?? storage.getItem(LEGACY_KEY));
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          Platform.logError(e);
          return null;
        } finally {
          loaded = true; // nie einen leeren Stand über einen noch nicht geladenen schreiben
        }
      },

      store(data) {
        if (!loaded || !storage) return;
        try {
          storage.setItem(KEY, JSON.stringify(data));
          storage.removeItem(LEGACY_KEY);
        } catch (e) { /* z. B. privates Fenster oder Speicher voll */ }
      },
    },

    // Ranglisten kommen mit der API (Fahrplan Phase 3). Bis dahin zählt nur die Statistik im Spielstand.
    scores: {
      submit(board, value) { /* lokal: nichts zu tun */ },
    },

    async language() { return root.navigator.language || 'en'; },

    // Globale Stummschaltung durch die Plattform-Hülle. Lokal ist der Ton immer an.
    audio: {
      enabled() { return true; },
      onChange(cb) { /* lokal: ändert sich nie */ },
    },

    // Pause, sobald der Tab verdeckt ist, weiter, wenn er wieder sichtbar wird
    onPause(cb) { root.document.addEventListener('visibilitychange', () => { if (root.document.hidden) cb(); }); },
    onResume(cb) { root.document.addEventListener('visibilitychange', () => { if (!root.document.hidden) cb(); }); },

    logError(e) { console.error(e); },
  };

  root.Platform = Platform;
})(self);
