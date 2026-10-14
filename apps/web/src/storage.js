// Alles, was die Hülle im Browser ablegt, liegt unter dem Präfix „lib:“:
//   lib:settings               globale Einstellungen (Sprache, Gesamtlautstärke)
//   lib:meta                   zuletzt gespielt je Spiel
//   lib:save:<spiel>:<slot>    Spielstände (für die Hülle undurchsichtiges JSON)
//   lib:scores:<spiel>         eigener Rekord je Rangliste
// localStorage statt IndexedDB: Es schreibt synchron, also auch sicher beim Schließen des Tabs (pagehide).
// Mit Konten und Cloud-Sync (Phase 3) kommt eine Sync-Warteschlange dazu, siehe docs/daten-und-konten.md.

const PREFIX = 'lib:';

function memoryBackend() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}

// localStorage, wenn erreichbar (in privaten Fenstern oder bei gesperrtem Speicher kann schon der Zugriff werfen)
export function defaultBackend() {
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch (e) { /* gesperrt */ }
  return memoryBackend();
}

export function createStore(backend = defaultBackend()) {
  const readRaw = key => {
    try {
      const raw = backend.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch (e) {
      console.error(e);
      return null;
    }
  };
  return {
    get: key => readRaw(PREFIX + key),
    set(key, value) {
      try {
        backend.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;   // Speicher voll o. Ä.
      }
    },
    remove(key) { try { backend.removeItem(PREFIX + key); } catch (e) { /* egal */ } },
    // Zugriff auf Schlüssel ohne Präfix – nur für die Übernahme alter Stände
    legacy: {
      get: readRaw,
      remove(key) { try { backend.removeItem(key); } catch (e) { /* egal */ } },
    },
  };
}

const saveKey = (gameId, slot) => `save:${gameId}:${slot || 'default'}`;

// Spielstand laden. Fehlt er, wird einmalig ein alter Stand aus manifest.legacySaveKeys übernommen
// (der erste gefundene zählt, die Liste ist von neu nach alt sortiert) und alle alten Schlüssel gelöscht.
export function loadSave(store, game, slot) {
  const key = saveKey(game.id, slot);
  const data = store.get(key);
  if (data != null || (slot && slot !== 'default')) return data;
  const legacyKeys = game.legacySaveKeys || [];
  for (const old of legacyKeys) {
    const found = store.legacy.get(old);
    if (found == null) continue;
    if (store.set(key, found)) legacyKeys.forEach(k => store.legacy.remove(k));
    return found;
  }
  return null;
}

export function storeSave(store, gameId, data, slot) {
  store.set(saveKey(gameId, slot), data);
}

// Eigener Rekord je Rangliste: 'desc' = mehr ist besser, 'asc' = weniger ist besser (z. B. Zeit)
export function submitScore(store, game, board, value) {
  if (!Number.isFinite(value)) return;
  const def = (game.leaderboards || []).find(b => b.id === board);
  if (!def) return;
  const key = `scores:${game.id}`, all = store.get(key) || {};
  const old = all[board];
  const better = old == null || (def.sort === 'asc' ? value < old : value > old);
  if (better) { all[board] = value; store.set(key, all); }
}

export const bestScore = (store, gameId, board) => {
  const all = store.get(`scores:${gameId}`);
  return all && Number.isFinite(all[board]) ? all[board] : null;
};

export function markPlayed(store, gameId, now = Date.now()) {
  const meta = store.get('meta') || {};
  meta.lastPlayed = { ...meta.lastPlayed, [gameId]: now };
  store.set('meta', meta);
}

export const lastPlayed = (store, gameId) => {
  const meta = store.get('meta');
  return (meta && meta.lastPlayed && meta.lastPlayed[gameId]) || null;
};
