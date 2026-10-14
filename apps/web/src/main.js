// Plattform-Hülle: Routing zwischen Bibliothek, Spiel und Einstellungen.
//   #/              Bibliothek
//   #/play/<id>     Spiel im Vollbild
//   #/settings      globale Einstellungen (Sprache, Gesamtlautstärke)
// Entwickler-Parameter der Spiele (z. B. ?autoplay, ?debug) stehen vor dem #: /?autoplay#/play/cozy-garden
import '@spielesammlung/ui/theme.css';
import './shell.css';
import { HTML_LANG } from '@spielesammlung/i18n';
import { createStore } from './storage.js';
import { createSettings } from './settings.js';
import { STR } from './strings.js';
import { findGame } from './games.js';
import { libraryView } from './views/library.js';
import { playView } from './views/play.js';
import { settingsView } from './views/settings.js';

const store = createStore();
const settings = createSettings(store);
const app = document.getElementById('app');
let view = null;

function context() {
  const lang = settings.language();
  return { store, settings, lang, htmlLang: HTML_LANG[lang], S: STR[lang] };
}

function route() {
  if (view) view.cleanup();
  view = null;
  app.textContent = '';
  const ctx = context();
  document.documentElement.lang = ctx.htmlLang;
  document.title = ctx.S.appName;

  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const game = page === 'play' && findGame(arg);
  if (game) view = playView(app, game, ctx);
  else if (page === 'settings') view = settingsView(app, ctx);
  else view = libraryView(app, ctx);
}

// Sprachwechsel (auch auf „Automatisch“): die offene Seite in der neuen Sprache neu aufbauen
let chosenLang = settings.get().lang;
settings.subscribe(v => {
  if (v.lang === chosenLang) return;
  chosenLang = v.lang;
  route();
});

window.addEventListener('hashchange', route);
route();

// Offline spielbar und installierbar (nur im fertigen Build, im Dev-Server stört der Cache)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.error(e));
  });
}
