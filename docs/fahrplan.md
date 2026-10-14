# Fahrplan

Erst wenn zwei Spiele den Spielvertrag benutzen, kommt das Backend. Vorher würde man den Vertrag an einem einzigen
Spiel festzurren.

| Phase | Inhalt | Ergebnis | Stand |
|---|---|---|---|
| 0 | YouTube entfernen, Repo in die Zielstruktur bringen | Cozy Garden läuft wie bisher, ohne YouTube | **erledigt** |
| 1 | Monorepo mit Vite, Cozy Garden auf ES-Module + `mount/unmount`, Hülle mit Bibliothek (nur Gastmodus) | Bibliothek mit einem Spiel | offen |
| 2 | Minesweeper als zweites Spiel, dann Solitaire + Spider über `packages/cards` | Vertrag bewährt sich an vier Spielen | offen |
| 3 | API: Konten, Cloud-Spielstände, Ranglisten mit Nachspiel-Prüfung | Profil geräteübergreifend | offen |
| 4 | Shop, Zahlung, DLC, Rechtliches | Monetarisierung | offen |

## Phase 0 – erledigt (2026-10-14)

- YouTube-Playables-SDK aus `index.html` entfernt
- `yt.js` → `platform.js`: lokaler Plattform-Adapter mit der Form des künftigen Spielvertrags
  (`save`, `scores`, `language`, `audio`, `onPause/onResume`, `logError`)
- Spielstand-Schlüssel `puzzlegame-save` → `cozy-garden:save`, alter Stand wird beim ersten Laden übernommen
- Pause und Speichern bei verdecktem Tab über `visibilitychange` (vorher Sache von YouTube)
- `prototype/` aufgeteilt: Spiel → `games/cozy-garden/`, Docker/nginx → `infra/`, Doku → `docs/`
- Wurzel-`package.json` mit `npm test`

## Phase 1 – Aufgaben

- [ ] npm-Workspaces und Vite einrichten
- [ ] `packages/game-sdk`: `defineGame`, Typen für `platform`, `createFakePlatform()`
- [ ] Cozy Garden auf ES-Module umstellen (`root.X = …` → `export`). Die Tests laufen weiter in Node.
- [ ] `main.js` in `mount(el, platform)` kapseln: Canvas und Menü-Overlay in `el` statt `document.body`,
      die 8 `addEventListener` an `window`/`document` mit `AbortController` aufräumbar machen
- [ ] CSS aus `index.html` in `packages/ui` (Theme) und Cozy-Garden-eigenes CSS trennen
- [ ] `apps/web`: Routing (`#/`, `#/play/:id`, `#/settings`), Bibliothek, Plattform mit IndexedDB
- [ ] Sprache und Gesamtlautstärke in die Hülle verlegen
- [ ] PWA-Manifest und Service Worker
- [ ] `infra/web/Dockerfile` auf mehrstufigen Vite-Build umstellen
