# games/

Ein Ordner pro Spiel, benannt nach der Spiel-ID (Kleinbuchstaben, Bindestrich).

| Ordner | Spiel | Stand |
|---|---|---|
| [cozy-garden](cozy-garden/) | Block-Puzzle mit Pflanzenformen | spielbar |
| `minesweeper/` | Minesweeper | geplant (Phase 2) |
| `solitaire/` | Solitaire (Klondike) | geplant (Phase 2) |
| `spider/` | Spider Solitaire | geplant (Phase 2) |

## Ein neues Spiel anlegen

1. Ordner `games/<id>/` mit `package.json`: Name `@spielesammlung/<id>`, `"type": "module"`, `"exports": { ".": "./index.js" }`,
   Abhängigkeit `@spielesammlung/game-sdk`.
2. `index.js` exportiert das Manifest mit `defineGame({ id, title, description, cover, saveVersion, mount })`.
   `mount` lädt den Spielcode per `await import('./src/main.js')`, damit die Bibliothek klein bleibt.
3. `src/main.js` exportiert `mount(el, platform)` und gibt `{ pause, resume, unmount }` zurück.
4. In `apps/web/package.json` als Abhängigkeit und in `apps/web/src/games.js` in `GAMES` eintragen, `npm install`.
5. Optional `index.html` zum Einzelstart mit `createFakePlatform` (Vorlage: `cozy-garden/index.html`) und ein Skript
   `"dev": "vite"`.

## Regeln für ein Spiel

- Es spricht nur über `platform` mit der Außenwelt: kein `localStorage`, kein `fetch`, keine Konto-Logik.
  Siehe [Spielvertrag](../docs/architektur.md#spielvertrag).
- Alles DOM entsteht in dem Element, das `mount` bekommt. CSS hängt unter einer eigenen Wurzel-Klasse (z. B. `.cozy-garden`).
- `unmount` räumt vollständig auf: Listener an `window`/`document` (am einfachsten mit einem `AbortController`),
  Timer, `requestAnimationFrame`, Observer. Danach darf nichts mehr laufen – die Hülle mountet beim nächsten Start neu.
- Die **Spiellogik** liegt in einem eigenen, DOM-freien Modul, deterministisch mit Seed und in Node lauffähig.
  Daran hängen Tests und die Prüfung der Ranglisten.
- Spielstände tragen eine Versionsnummer. Alte Stände migriert das Spiel selbst.
- Eigene Tests unter `tests/*.test.js`. `npm test` in der Repo-Wurzel findet sie automatisch.
- Spielspezifische Einstellungen und Texte bleiben im Spiel. Sprache und Gesamtlautstärke kommen von der Plattform.
