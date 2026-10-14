// Bibliothek: alle Spiele als Karten, geplante als „Bald verfügbar“
import { localized } from '@spielesammlung/i18n';
import { GAMES, UPCOMING } from '../games.js';
import { bestScore, lastPlayed } from '../storage.js';
import { el, header, link } from '../dom.js';

export function libraryView(app, { store, S, lang, htmlLang }) {
  const page = el('main', 'page');
  page.append(header(S.appName, S.tagline, link('#/settings', 'pill ghost', S.settings)));

  const grid = el('div', 'games');
  for (const g of GAMES) {
    const card = el('article', 'card game');
    card.dataset.game = g.id;
    const cover = link(`#/play/${g.id}`, 'cover');
    cover.tabIndex = -1;                         // der Knopf „Spielen“ reicht für die Tastatur
    cover.setAttribute('aria-hidden', 'true');
    const img = el('img');
    img.src = g.cover;
    img.alt = '';
    cover.append(img);
    card.append(cover, el('h2', null, localized(g.title, lang)));
    if (g.description) card.append(el('p', 'desc', localized(g.description, lang)));

    // Eigener Rekord je Rangliste, die schon einen Wert hat: Punkte als Zahl, Zeiten in Sekunden
    const meta = el('p', 'meta');
    for (const board of g.leaderboards || []) {
      const best = bestScore(store, g.id, board.id);
      if (best == null || (board.sort === 'desc' && best <= 0)) continue;   // 0 Punkte ist noch kein Rekord
      const value = board.format === 'time'
        ? (best / 1000).toLocaleString(htmlLang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s'
        : best.toLocaleString(htmlLang);
      const label = board.title ? `${S.best} (${localized(board.title, lang)})` : S.best;
      meta.append(el('span', null, `${label} ${value}`));
    }
    const played = lastPlayed(store, g.id);
    if (played) meta.append(el('span', null, `${S.lastPlayed} ${new Date(played).toLocaleDateString(htmlLang)}`));
    if (meta.childElementCount) card.append(meta);

    const actions = el('div', 'actions');
    actions.append(link(`#/play/${g.id}`, 'pill primary', S.play));
    card.append(actions);
    grid.append(card);
  }

  for (const u of UPCOMING) {
    const card = el('article', 'card game soon');
    const cover = el('div', 'cover icon');
    cover.innerHTML = u.icon;
    card.append(cover, el('h2', null, localized(u.title, lang)), el('p', 'desc', S.soon));
    grid.append(card);
  }

  page.append(grid);
  app.append(page);
  return { cleanup() {} };
}
