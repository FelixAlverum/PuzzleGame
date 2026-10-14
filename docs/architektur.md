# Architektur

## Zielbild

```
┌──────────────────────────── Browser (PWA) ────────────────────────────┐
│  Plattform-Hülle (apps/web): Bibliothek · Profil · Shop · Login       │
│        │  übergibt jedem Spiel ein einheitliches `platform`-Objekt    │
│        ▼                                                              │
│  [Cozy Garden] [Solitaire] [Spider] [Minesweeper]  … per import()     │
│        │                                                              │
│  Lokaler Speicher (IndexedDB): Gastmodus, Offline, Sync-Warteschlange │
└────────┼──────────────────────────────────────────────────────────────┘
         ▼  HTTPS /api
┌──── API (apps/api) ───────┐     ┌──────────┐     ┌──────────────────┐
│ Konten · Spielstände ·    │────▶│ Postgres │     │ Zahlungsanbieter │
│ Ranglisten · DLC/Käufe    │◀────┼──────────┼─────│ (Webhook)        │
└───────────────────────────┘     └──────────┘     └──────────────────┘
```

**Grundregel:** Ein Spiel weiß nichts von Konten, Servern oder `localStorage`. Es redet ausschließlich mit dem
`platform`-Objekt. Ob dahinter ein Gast im Browser steckt oder ein angemeldetes Konto mit Cloud-Sync, entscheidet die Hülle.

## Repo-Aufbau

```
apps/
  web/                 Plattform-Hülle: Routing, Bibliothek, Profil, Shop, Login, globale Einstellungen
  api/                 Backend: Auth, Spielstände, Ranglisten, Käufe/Entitlements
games/
  cozy-garden/         Block-Puzzle (vorhanden)
  minesweeper/         geplant – kleinstes Spiel, prüft den Spielvertrag als Erstes
  solitaire/           geplant (Klondike)
  spider/              geplant (Spider Solitaire)
packages/
  game-sdk/            Spielvertrag: defineGame(), Typen des platform-Objekts, Fake-Plattform für Tests
  ui/                  Theme, Farben, Schriften, Buttons, Overlays (heute im <style> von cozy-garden/index.html)
  i18n/                Sprachwahl, Fallback-Logik, gemeinsame Texte (Spieltexte bleiben im Spiel)
  audio/               Web-Audio-Grundlage, Lautstärkekanäle, Entsperren per Geste
  cards/               Kartendeck, Mischen mit Seed, Kartengrafik, Stapel ziehen → Solitaire + Spider
  storage/             IndexedDB-Cache, Sync mit der API
infra/                 Docker, nginx, docker-compose
docs/
```

Code wandert erst dann nach `packages/`, wenn **ein zweiter Nutzer** ihn braucht. Bis dahin bleibt er im Spiel.
Erster Kandidat ist `cards/` (Solitaire + Spider).

### Build

Heute läuft Cozy Garden ohne Build: klassische `<script>`-Tags, jedes Modul hängt ein globales Objekt an
(`Logic`, `Shapes`, `Platform`, …). Ab Phase 1 gilt:

- **ES-Module + Vite.** Die Hülle lädt jedes Spiel erst beim Start per `import()`. Der Dev-Server lädt bei Änderungen sofort neu.
- **npm-Workspaces** für `apps/*`, `games/*`, `packages/*`
- **TypeScript** mindestens für `packages/game-sdk` und `apps/api`, denn dort steht der Vertrag zwischen den Teilen.
  Spiele dürfen JavaScript mit JSDoc-Typen bleiben.
- **Spiellogik bleibt DOM-frei und läuft in Node** (wie `games/cozy-garden/src/logic.js` heute). Die API nutzt
  sie zum Prüfen von Ranglisten-Einträgen, siehe [daten-und-konten.md](daten-und-konten.md#ranglisten-fälschungssicher).

## Spielvertrag

Jedes Spiel exportiert ein Manifest und eine `mount`-Funktion:

```js
export default defineGame({
  id: 'cozy-garden',
  saveVersion: 3,                       // Migration alter Stände bleibt Sache des Spiels
  title: { de: 'Cozy Garden', en: 'Cozy Garden' },
  cover: './cover.webp',
  leaderboards: [
    { id: 'best', sort: 'desc', format: 'points' },
  ],
  dlc: ['cozy-garden.biome-tropics'],   // Produkt-IDs, die das Spiel abfragt (Beispiel)
  async mount(el, platform) {
    // Canvas + UI nur innerhalb von `el` aufbauen.
    // Listener an window/document mit einem AbortSignal registrieren, damit unmount sauber aufräumt.
    return { pause() {}, resume() {}, unmount() {} };
  },
});
```

Das `platform`-Objekt, das die Hülle übergibt:

| Bereich | API | Heute in Cozy Garden (`src/platform.js`) |
|---|---|---|
| Spielstand | `save.load(slot?)`, `save.store(data, slot?)` | `localStorage`, Schlüssel `cozy-garden:save` |
| Ranglisten | `scores.submit(board, value, proof?)`, `scores.top(board)` | `submit` ist ein No-op |
| DLC | `entitlements.has(id)`, `entitlements.onChange(cb)` | – |
| Nutzer | `user` (id, Anzeigename, Gast ja/nein) | – |
| Sprache | `language()`, später `onLanguageChange(cb)` | Browsersprache |
| Ton | `audio.enabled()`, `audio.onChange(cb)` (globale Stummschaltung) | immer an |
| Lebenszyklus | `onPause(cb)`, `onResume(cb)`, `exit()` (zurück zur Bibliothek) | `visibilitychange` |
| Fehler | `logError(e)` | `console.error` |

`packages/game-sdk` liefert `createFakePlatform()`, damit jedes Spiel auch ohne Hülle läuft und testbar bleibt.
Bis dahin spielt `games/cozy-garden/src/platform.js` genau diese Rolle.

## Menü und Routing (Hülle)

| Route | Inhalt |
|---|---|
| `#/` | **Bibliothek**: Kacheln mit Cover, „Weiterspielen“, eigener Rekord, Schloss oder Preis bei nicht gekauften Spielen |
| `#/play/<spiel-id>` | Spiel im Vollbild, fester Knopf „Zur Bibliothek“ |
| `#/profile` | Ranglisten, Spielstände (pro Spiel exportieren, löschen, Cloud ↔ Gerät), Käufe, Konto löschen |
| `#/shop` | Spiele und DLCs |
| `#/settings` | **global**: Sprache, Gesamtlautstärke, Konto |

Alles Spielspezifische bleibt im Menü des Spiels. Bei Cozy Garden sind das Biom, Feldgröße, Schwierigkeit,
Anleitung, Statistik und die Lautstärke je Kanal. Das heutige `menu.js` wird damit zum **Spielmenü**.
Sprache und Gesamtlautstärke wandern in die Hülle.
