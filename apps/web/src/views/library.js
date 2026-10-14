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

    const meta = el('p', 'meta');
    const board = g.leaderboards && g.leaderboards[0];
    const best = board ? bestScore(store, g.id, board.id) : null;
    if (best != null) meta.append(el('span', null, `${S.best} ${best.toLocaleString(htmlLang)}`));
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
