# Architektur

## Zielbild

```
┌──────────────────────────── Browser (PWA) ────────────────────────────┐
│  Plattform-Hülle (apps/web): Bibliothek · Einstellungen · Profil · Shop│
│        │  übergibt jedem Spiel ein einheitliches `platform`-Objekt    │
│        ▼                                                              │
│  [Cozy Garden] [Solitaire] [Spider] [Minesweeper]  … per import()     │
│        │                                                              │
│  Lokaler Speicher: Gastmodus, Offline, später Sync-Warteschlange      │
└────────┼──────────────────────────────────────────────────────────────┘
         ▼  HTTPS /api  (Phase 3)
┌──── API (apps/api) ───────┐     ┌──────────┐     ┌──────────────────┐
│ Konten · Spielstände ·    │────▶│ Postgres │     │ Zahlungsanbieter │
│ Ranglisten · DLC/Käufe    │◀────┼──────────┼─────│ (Webhook)        │
└───────────────────────────┘     └──────────┘     └──────────────────┘
```

**Grundregel:** Ein Spiel weiß nichts von Konten, Servern oder `localStorage`. Es redet ausschließlich mit dem
`platform`-Objekt. Ob dahinter ein Gast im Browser steckt oder ein angemeldetes Konto mit Cloud-Sync, entscheidet die Hülle.

Stand nach Phase 1: Hülle, Spielvertrag und Cozy Garden laufen, alles im Gastmodus und lokal. Profil, Shop, Login und
die API fehlen noch.

## Repo-Aufbau

```
apps/
  web/                 Plattform-Hülle: Routing, Bibliothek, Spielansicht, globale Einstellungen   (vorhanden)
  api/                 Backend: Auth, Spielstände, Ranglisten, Käufe/Entitlements               (Phase 3)
games/
  cozy-garden/         Block-Puzzle                                                             (vorhanden)
  minesweeper/         kleinstes Spiel, prüft den Spielvertrag als Erstes                        (Phase 2)
  solitaire/           Klondike                                                                 (Phase 2)
  spider/              Spider Solitaire                                                         (Phase 2)
packages/
  game-sdk/            Spielvertrag: defineGame(), Typen des platform-Objekts, Fake-Plattform    (vorhanden)
  i18n/                Sprachliste, Sprachwahl, Flaggen                                          (vorhanden)
  ui/                  Theme: Farben, Schrift, Knöpfe, Karten, Regler                            (vorhanden)
  audio/               Web-Audio-Grundlage, sobald ein zweites Spiel Ton hat
  cards/               Kartendeck, Mischen mit Seed, Kartengrafik → Solitaire + Spider            (Phase 2)
infra/                 Docker, nginx, docker-compose
docs/
```

Code wandert erst dann nach `packages/`, wenn **ein zweiter Nutzer** ihn braucht. Bis dahin bleibt er im Spiel.

### Build und Module

- **ES-Module + Vite 8.** Die Hülle (`apps/web`) ist das einzige Build-Ziel. Jedes Spiel landet in einem eigenen Chunk,
  der erst beim Start geladen wird: Die Hülle importiert nur das Manifest (`games/<id>/index.js`), das Manifest lädt den
  Spielcode in `mount` per `import('./src/main.js')`.
- **npm-Workspaces** für `apps/*`, `games/*`, `packages/*`. Pakete werden ohne eigenen Build direkt aus dem Quelltext
  importiert (`@spielesammlung/<name>`).
- **TypeScript** für `packages/game-sdk` (später auch `apps/api`). Nur löschbare Typ-Syntax (`erasableSyntaxOnly`),
  damit Node die Datei in Tests direkt ausführen kann. Hülle und Spiele sind JavaScript und beziehen die Typen per JSDoc
  (`@param {import('@spielesammlung/game-sdk').Platform} platform`). Prüfen: `npm run typecheck`.
- **Spiellogik bleibt DOM-frei und läuft in Node** (`games/cozy-garden/src/logic.js`). Die API nutzt sie später zum Prüfen
  von Ranglisten-Einträgen, siehe [daten-und-konten.md](daten-und-konten.md#ranglisten-fälschungssicher).
- Spiel-CSS wird per `import './style.css'` eingebunden und hängt unter der Wurzel-Klasse des Spiels (`.cozy-garden`).
  Das gemeinsame Theme kommt aus `@spielesammlung/ui/theme.css`.

## Spielvertrag

Quelle der Wahrheit: [packages/game-sdk/src/index.ts](../packages/game-sdk/src/index.ts).

Jedes Spiel exportiert ein Manifest:

```js
// games/cozy-garden/index.js
export default defineGame({
  id: 'cozy-garden',
  title: { de: 'Cozy Garden', en: 'Cozy Garden' },
  description: { de: '…', en: '…' },
  cover,                                             // URL (import cover from './cover.svg')
  saveVersion: 3,                                    // Migration alter Stände bleibt Sache des Spiels
  legacySaveKeys: ['cozy-garden:save', 'puzzlegame-save'],   // übernimmt die Hülle einmalig
  leaderboards: [{ id: 'best', sort: 'desc', format: 'points' }],
  async mount(el, platform) {
    const { mount } = await import('./src/main.js');   // Spielcode erst beim Start laden
    return mount(el, platform);                        // → { pause, resume, unmount }
  },
});
```

**Lebenszyklus (`GameHandle`)** – die Hülle steuert, das Spiel gehorcht:

| Aufruf | Wann | Was das Spiel tut |
|---|---|---|
| `mount(el, platform)` | Route `#/play/<id>` betreten | DOM in `el` aufbauen, Stand laden, Loop starten |
| `pause()` | Tab verdeckt | Loop und Ton anhalten, speichern |
| `resume()` | Tab wieder sichtbar | weiterlaufen |
| `unmount()` | Route verlassen | speichern, alle Listener/Timer/Observer abräumen, DOM entfernen |

**Das `platform`-Objekt:**

| Bereich | API | In der Hülle heute (`apps/web/src/platform.js`) |
|---|---|---|
| Spielstand | `save.load(slot?)` → Promise, `save.store(data, slot?)` | localStorage `lib:save:<id>:<slot>`, alte Schlüssel einmalig übernommen |
| Ranglisten | `scores.submit(board, value, proof?)` | nur eigener Rekord je Rangliste (`lib:scores:<id>`), angezeigt in der Bibliothek |
| DLC | `entitlements.has(id)`, `entitlements.onChange(cb)` | immer `false` (Phase 4) |
| Nutzer | `user` (id, Anzeigename, Gast ja/nein) | immer Gast |
| Sprache | `language()` → z. B. `'de'` | Einstellung der Hülle, sonst Browsersprache |
| Ton | `audio.volume()` (0..1), `audio.onChange(cb)` | Gesamtlautstärke aus den Einstellungen der Hülle |
| Verlassen | `exit()` – fehlt ohne Hülle | zurück zu `#/` |
| Fehler | `logError(e)` | `console.error` |

`createFakePlatform({ gameId, … })` aus dem `game-sdk` liefert dasselbe ohne Hülle: für Tests und für den Einzelstart
eines Spiels (`games/cozy-garden/index.html`, `npm run dev:cozy-garden`).

## Menü und Routing (Hülle)

| Route | Inhalt | Stand |
|---|---|---|
| `#/` | **Bibliothek**: Kacheln mit Cover, Beschreibung, eigener Rekord, zuletzt gespielt; geplante Spiele als „Bald verfügbar“ | vorhanden |
| `#/play/<spiel-id>` | Spiel im Vollbild. Zurück über den Knopf „← Spielesammlung“ (Holzfarbe) im Spiel, bei Cozy Garden auch `Esc` im Spielmenü | vorhanden |
| `#/settings` | **global**: Sprache, Gesamtlautstärke | vorhanden |
| `#/profile` | Ranglisten, Spielstände (exportieren, löschen, Cloud ↔ Gerät), Käufe, Konto löschen | Phase 3 |
| `#/shop` | Spiele und DLCs | Phase 4 |

Entwickler-Parameter der Spiele stehen vor dem `#`: `/?autoplay&debug#/play/cozy-garden`.

Alles Spielspezifische bleibt im Menü des Spiels. Bei Cozy Garden sind das Biom, Feldgröße, Schwierigkeit,
Anleitung, Statistik und die Lautstärke je Kanal. Sprache und Gesamtlautstärke gibt es nur in der Hülle.
