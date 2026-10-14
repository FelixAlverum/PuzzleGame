# Fahrplan

Erst wenn zwei Spiele den Spielvertrag benutzen, kommt das Backend. Vorher würde man den Vertrag an einem einzigen
Spiel festzurren.

| Phase | Inhalt | Ergebnis | Stand |
|---|---|---|---|
| 0 | YouTube entfernen, Repo in die Zielstruktur bringen | Cozy Garden läuft wie bisher, ohne YouTube | **erledigt** |
| 1 | Monorepo mit Vite, Cozy Garden auf ES-Module + `mount/unmount`, Hülle mit Bibliothek (nur Gastmodus) | Bibliothek mit einem Spiel | **erledigt** |
| 2 | Minesweeper als zweites Spiel, dann Solitaire + Spider über `packages/cards` | Vertrag bewährt sich an vier Spielen | **läuft** – Minesweeper-Prototyp spielbar |
| 3 | API: Konten, Cloud-Spielstände, Ranglisten mit Nachspiel-Prüfung | Profil geräteübergreifend | offen |
| 4 | Shop, Zahlung, DLC, Rechtliches | Monetarisierung | offen |

## Phase 0 – erledigt (2026-10-14)

- YouTube-Playables-SDK aus `index.html` entfernt
- `yt.js` → `platform.js`: lokaler Plattform-Adapter mit der Form des künftigen Spielvertrags
- Spielstand-Schlüssel `puzzlegame-save` → `cozy-garden:save`, alter Stand wird beim ersten Laden übernommen
- Pause und Speichern bei verdecktem Tab über `visibilitychange` (vorher Sache von YouTube)
- `prototype/` aufgeteilt: Spiel → `games/cozy-garden/`, Docker/nginx → `infra/`, Doku → `docs/`

## Phase 1 – erledigt (2026-10-14)

- [x] npm-Workspaces (`apps/*`, `games/*`, `packages/*`) und Vite 8
- [x] `packages/game-sdk` (TypeScript): `defineGame`, Typen für Manifest, `Platform`, `GameHandle`, `createFakePlatform()`
- [x] `packages/i18n` (Sprachliste, Sprachwahl, Flaggen) und `packages/ui` (Theme) – beide von Hülle und Spiel genutzt
- [x] Cozy Garden auf ES-Module umgestellt. Die Tests laufen weiter in Node.
- [x] `main.js` → `mount(el, platform)`: Canvas und Menü in `el`, Listener über `AbortController`, `ResizeObserver` statt
      `resize`, `pause`/`resume`/`unmount`; `menu.js` → `createMenu(ui, api, signal)`; Menü-Markup in `menu.html`
- [x] CSS getrennt: Theme in `packages/ui`, Spiel-CSS unter `.cozy-garden` in `games/cozy-garden/src/style.css`
- [x] `apps/web`: Routing (`#/`, `#/play/:id`, `#/settings`), Bibliothek mit Cover, eigenem Rekord und „zuletzt gespielt“,
      geplante Spiele als „Bald verfügbar“, Plattform mit Speicher in `localStorage`, Übernahme alter Spielstände
- [x] Sprache und Gesamtlautstärke in die Hülle verlegt; im Spiel Knopf „← Spielesammlung“ und `Esc` im Hauptmenü
- [x] PWA: Manifest, Icon, Service Worker
- [x] `infra/web/Dockerfile` zweistufig (Vite-Build, dann nginx)
- [x] Tests: Speicher, Einstellungen, Plattform, Spielvertrag (`npm test`, 42 Tests), `npm run typecheck`

Abweichungen vom Plan, begründet in [entscheidungen.md](entscheidungen.md):
- Speicher in `localStorage` statt IndexedDB (synchron, sicher beim Schließen des Tabs)
- Pause/Weiter steuert die Hülle über das `GameHandle`, nicht das Spiel über `platform.onPause`
- `packages/audio` und `packages/storage` noch nicht angelegt: Es gibt erst einen Nutzer.

Nachzuholen:
- [x] Docker-Image 0.6.0 gebaut, im Container getestet und veröffentlicht (`alverum/puzzlegame:0.6.0` und `latest`,
      amd64 + arm64)
- [ ] PNG-Icons 192/512 px für die PWA (vor allem iOS)
- [ ] Spielerinnen und Spieler, die früher im Spiel eine Sprache gewählt hatten, landen zunächst bei der Browsersprache
      und müssen sie einmal in den Einstellungen der Sammlung wählen.

## Phase 2 – Aufgaben

- [x] `games/minesweeper` als Prototyp zum Probespielen (2026-10-14): Logik DOM-frei mit Seed (erster Klick öffnet
      immer eine Fläche), Stufen Anfänger/Fortgeschritten/Profi, Flaggen per Langdruck/Rechtsklick/Flaggen-Modus, Akkord,
      Tastatur, gedrehtes Profi-Feld auf Handys, Lauf und Statistik je Stufe, Rangliste Zeit je Stufe (`sort: 'asc'`)
- [x] Minesweeper: Niederlage als Kettenreaktion mit Knall, Feuerball und Wackeln, Klick überspringt
- [ ] Minesweeper nach dem Probespielen: weitere Töne, Animationen, eigene Feldgröße, Rückfrage vor „Neues Spiel“
- [x] Ranglisten können einen Titel haben (`Leaderboard.title`); die Bibliothek zeigt Zeiten in Sekunden
- [ ] Gemeinsames Audio-Grundgerüst (Kontext, Entsperren, Gesamtlautstärke, Rauschen) aus Cozy Garden und Minesweeper nach `packages/audio`
- [ ] `packages/cards`: Deck, Mischen mit Seed, Kartengrafik, Ziehen von Stapeln
- [ ] `games/solitaire` (Klondike), `games/spider` (1, 2, 4 Farben)
- [ ] In der Bibliothek aus „Bald verfügbar“ echte Spiele machen (`apps/web/src/games.js`) – Minesweeper erledigt
