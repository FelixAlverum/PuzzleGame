// Ein Spiel im Vollbild: mount beim Betreten, pause/resume bei verdecktem Tab, unmount beim Verlassen.
import { createPlatform } from '../platform.js';
import { markPlayed } from '../storage.js';
import { el, link } from '../dom.js';

export function playView(app, game, { store, settings, S }) {
  document.body.classList.add('playing');
  const stage = el('div', 'stage');
  stage.dataset.game = game.id;
  app.append(stage);

  let handle = null, gone = false;
  const platform = createPlatform(game, { store, settings, exit: () => { location.hash = '#/'; } });

  const onVisibility = () => {
    if (!handle) return;
    if (document.hidden) handle.pause(); else handle.resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  Promise.resolve()
    .then(() => game.mount(stage, platform))
    .then(h => {
      if (gone) { h.unmount(); return; }         // schon wieder verlassen, während das Spiel lud
      handle = h;
      markPlayed(store, game.id);                // erst, wenn das Spiel wirklich läuft
      if (document.hidden) h.pause();
    })
    .catch(e => {
      console.error(e);
      if (gone) return;
      const box = el('div', 'card load-error');
      box.append(el('p', null, S.loadError), link('#/', 'pill primary', S.toLibrary));
      stage.append(box);
    });

  return {
    cleanup() {
      gone = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (handle) handle.unmount();
      stage.remove();
      document.body.classList.remove('playing');
    },
  };
}
