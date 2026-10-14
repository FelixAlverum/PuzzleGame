// Globale Einstellungen der Hülle: Sprache und Gesamtlautstärke. Gelten für alle Spiele.
// Spielspezifisches (Feldgröße, Kanal-Lautstärken …) stellt jedes Spiel in seinem eigenen Menü ein.
import { LANGS, pick } from '@spielesammlung/i18n';

const DEFAULTS = { lang: null, volume: 1 };   // lang null = Sprache des Browsers

// Nur gültige Werte übernehmen, ungültige lassen den bisherigen Wert stehen
function sanitize(v, base = DEFAULTS) {
  const out = { ...base };
  if (!v || typeof v !== 'object') return out;
  if (LANGS.includes(v.lang) || v.lang === null) out.lang = v.lang;   // null = zurück zur Browsersprache
  if (Number.isFinite(v.volume)) out.volume = Math.max(0, Math.min(1, v.volume));
  return out;
}

export function createSettings(store, browserLanguage = () => globalThis.navigator?.language) {
  let value = sanitize(store.get('settings'));
  const subs = new Set();
  return {
    get: () => value,
    // Gültige Sprache: gewählt, sonst Browser, sonst Englisch
    language: () => value.lang || pick(browserLanguage()),
    set(patch) {
      value = sanitize(patch, value);
      store.set('settings', value);
      for (const fn of subs) fn(value);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
