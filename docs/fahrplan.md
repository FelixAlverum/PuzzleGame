# Fahrplan

Erst wenn zwei Spiele den Spielvertrag benutzen, kommt das Backend. Vorher würde man den Vertrag an einem einzigen
Spiel festzurren.

| Phase | Inhalt | Ergebnis | Stand |
|---|---|---|---|
| 0 | YouTube entfernen, Repo in die Zielstruktur bringen | Cozy Garden läuft wie bisher, ohne YouTube | **erledigt** |
| 1 | Monorepo mit Vite, Cozy Garden auf ES-Module + `mount/unmount`, Hülle mit Bibliothek (nur Gastmodus) | Bibliothek mit einem Spiel | **erledigt** |
| 2 | Minesweeper als zweites Spiel, dann Solitaire + Spider über `packages/cards` | Vertrag bewährt sich an vier Spielen | **erledigt** |
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

## Phase 2 – erledigt (2026-10-14)

- [x] `games/minesweeper` (2026-10-14): Logik DOM-frei mit Seed (erster Klick öffnet immer eine Fläche), Stufen
      Anfänger/Fortgeschritten/Profi, Flaggen per Langdruck/Rechtsklick/Flaggen-Modus, Akkord, Tastatur, gedrehtes
      Profi-Feld auf Handys, Lauf und Statistik je Stufe, Rangliste Zeit je Stufe (`sort: 'asc'`)
- [x] Minesweeper: Niederlage als Kettenreaktion mit Knall, Feuerball und Wackeln, Klick überspringt
- [x] Minesweeper nach dem Probespielen: Töne für Aufdecken, Flagge und Sieg; Felder springen beim Aufdecken auf,
      Siegeswelle; eigenes Feld (Breite, Höhe, Minen); Rückfrage vor „Neues Spiel“ bei begonnenem Lauf
- [x] Ranglisten können einen Titel haben (`Leaderboard.title`); die Bibliothek zeigt Zeiten in Sekunden
- [x] `packages/audio`: Kontext, Entsperren, Gesamtlautstärke, Pause, Ton, Rauschen, Kalimba, Pentatonik – genutzt von
      Cozy Garden, Minesweeper und den Kartenspielen
- [x] `packages/ui`: Spielrahmen für HTML-Spiele (Kopfleiste, Zähler, Ergebnis, Fußzeile), Minesweeper umgestellt
- [x] `packages/cards`: Deck und Mischen mit Seed, Kartengrafik (SVG-Farbsymbole, Figuren), Tisch mit Ziehen und
      Ablegen, Antippen, Tastatur-Cursor, Siegesfeier; `mountCardGame` als Rahmen für Patiencen (Zeit, Züge,
      Rückgängig, Tipp, Zuendespielen, Speichern, Statistik, Rangliste, Ton)
- [x] `games/solitaire` (Klondike, 1 oder 3 Karten ziehen) und `games/spider` (1, 2, 4 Farben), Rangliste Zeit je Variante
- [x] Bibliothek: alle vier Spiele spielbar, „Bald verfügbar“ ist leer
- [x] Tests: 85 Unit-Tests (`npm test`), 27 Browser-Tests (`npm run test:e2e`)

Abweichungen vom Plan, begründet in [entscheidungen.md](entscheidungen.md):
- Kartenspiele werten die Zeit, nicht Punkte nach Windows-Art (eine Rangliste je Variante, wie bei Minesweeper)
- Kartenspiele speichern nur Seed und Züge; „Rückgängig“ spielt nach, statt Zwischenstände zu sichern

Offen für eine spätere Runde:
- [ ] Solitaire: nur lösbare Partien austeilen (braucht einen Löser)
- [ ] Punkte als zweite Rangliste für Solitaire und Spider
- [x] Docker-Image 0.8.0 mit den vier Spielen gebaut und veröffentlicht (`alverum/puzzlegame:0.8.0` und `latest`,
      amd64 + arm64)

## Code-Review (2026-10-14)

Erledigt:
- [x] Service Worker: nur gehashte Dateien zuerst aus dem Cache, alles andere zuerst übers Netz; räumt nicht mehr gebrauchte
      Dateien auf, ohne Spiele zu verlieren
- [x] Minesweeper: Knöpfe geben nach Maus/Touch den Fokus ab (Tastatur steuert wieder das Feld, Leertaste löst
      „Neues Spiel“ nicht erneut aus); Flaggen-Modus deckt auf offenen Zahlen weiter auf; Tastatur erst mit fertigem Raster
- [x] Einstellungen: Sprache lässt sich auf „Automatisch“ (Browsersprache) zurückstellen
- [x] „Zuletzt gespielt“ erst, wenn das Spiel wirklich gestartet ist
- [x] Browser-Tests im Repo (Playwright, `npm run test:e2e`, 16 Tests, Desktop + Handy)

Offen:
- [ ] Minesweeper für Screenreader: Felder mit Namen und Zustand, Cursor ansagen
- [ ] Doppelte Texte: „← Spielesammlung“ in Hülle, Cozy Garden, Minesweeper und `packages/cards`
      (Vorschlag: Beschriftung über `platform`). Stufen- und Variantennamen kommen jetzt aus den Spieltexten.
- [ ] Dockerfile: erst `package.json`-Dateien kopieren und `npm ci`, dann den Code (Layer-Cache)
- [ ] nginx: Sicherheits-Header (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`)
- [ ] Kleinkram: ungenutzter Export `NATIVE` in Cozy Garden, `cozy-garden/src/main.js` (1259 Zeilen) beim nächsten
      Umbau aufteilen, App-Titel und Manifest nur deutsch
