// Dünne Hülle um das YouTube Playables SDK (ytgame). Außerhalb von YouTube (lokal im Browser)
// fällt sie auf localStorage bzw. Standardwerte zurück, damit der Prototyp überall läuft.
// Vorgaben: siehe Vault: 03 Technik/YouTube Playables Anforderungen.
(function (root) {
  'use strict';

  const sdk = typeof root.ytgame !== 'undefined' ? root.ytgame : null;
  const inEnv = !!(sdk && sdk.IN_PLAYABLES_ENV);
  const KEY = 'puzzlegame-save';
  let loaded = false;

  const YT = {
    inEnv,

    firstFrameReady() { if (inEnv) sdk.game.firstFrameReady(); },
    gameReady() { if (inEnv) sdk.game.gameReady(); },

    async load() {
      try {
        const raw = inEnv ? await sdk.game.loadData() : root.localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        YT.logError(e);
        return null;
      } finally {
        loaded = true; // Playables: saveData erst, nachdem loadData abgeschlossen ist
      }
    },

    save(data) {
      if (!loaded) return;
      const raw = JSON.stringify(data);
      if (inEnv) { sdk.game.saveData(raw).catch(YT.logError); return; }
      try { root.localStorage.setItem(KEY, raw); } catch (e) { /* z. B. privates Fenster */ }
    },

    sendScore(value) { if (inEnv) sdk.engagement.sendScore({ value }).catch(YT.logError); },

    async language() {
      if (inEnv) {
        try { return await sdk.system.getLanguage(); } catch (e) { YT.logError(e); }
      }
      return root.navigator.language || 'en';
    },

    audioEnabled() { return inEnv ? sdk.system.isAudioEnabled() : true; },
    onAudioChange(cb) { if (inEnv) sdk.system.onAudioEnabledChange(cb); },
    onPause(cb) { if (inEnv) sdk.system.onPause(cb); },
    onResume(cb) { if (inEnv) sdk.system.onResume(cb); },

    logError(e) {
      if (inEnv) { try { sdk.health.logError(); } catch (_) { /* best effort */ } }
      console.error(e);
    },
  };

  root.YT = YT;
})(self);
