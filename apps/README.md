# apps/

Anwendungen, die ausgeliefert werden.

| Ordner | Aufgabe | Stand |
|---|---|---|
| [web/](web/) | Plattform-Hülle: Routing, Bibliothek, Spielansicht, globale Einstellungen. Lädt Spiele per `import()` und übergibt ihnen `platform`. | Phase 1 erledigt; Profil, Shop und Login folgen mit Phase 3/4 |
| `api/` | Backend: Konten, Spielstände (Sync mit Revision), Ranglisten mit Nachspiel-Prüfung, Käufe und Entitlements | geplant, Phase 3 |

## apps/web

| Datei | Aufgabe |
|---|---|
| `src/main.js` | Routing: `#/` Bibliothek, `#/play/<id>` Spiel, `#/settings` Einstellungen; Service Worker anmelden |
| `src/games.js` | Spiele der Bibliothek (Manifeste) und geplante Spiele |
| `src/platform.js` | baut das `platform`-Objekt für ein Spiel |
| `src/storage.js` | alles Gespeicherte unter `lib:*` in localStorage, Übernahme alter Spielstände, eigener Rekord, zuletzt gespielt |
| `src/settings.js` | globale Einstellungen: Sprache, Gesamtlautstärke |
| `src/strings.js` | Texte der Hülle in 6 Sprachen |
| `src/views/` | Bibliothek, Spielansicht (mount/pause/resume/unmount), Einstellungen |
| `public/` | PWA: Manifest, Icon, Service Worker |
| `tests/` | Speicher, Einstellungen, Plattform (Node, ohne Browser) |
| `e2e/`, `playwright.config.js` | Browser-Tests gegen den Produktions-Build (`npm run test:e2e`) |

Details: [docs/architektur.md](../docs/architektur.md), [docs/daten-und-konten.md](../docs/daten-und-konten.md).
