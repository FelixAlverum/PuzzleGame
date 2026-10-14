# packages/

Gemeinsamer Code, der von mehreren Spielen oder von Hülle und Spielen gebraucht wird.
Code zieht erst hierher, wenn ihn **ein zweiter Nutzer** braucht. Bis dahin bleibt er im Spiel.

| Paket | Aufgabe | Stand |
|---|---|---|
| [game-sdk/](game-sdk/) | Spielvertrag in TypeScript: `defineGame()`, Typen von Manifest, `Platform` und `GameHandle`, `createFakePlatform()` für Tests und Einzelbetrieb | vorhanden |
| [i18n/](i18n/) | Sprachliste, Sprachwahl (`pick`), `localized()` für Texte je Sprache, Flaggen | vorhanden |
| [ui/](ui/) | Theme: Farben, Schrift, Pillen-Knöpfe, Karten, Segmente, Regler (`theme.css`) | vorhanden |
| `audio/` | Web-Audio-Grundlage, Lautstärkekanäle, Entsperren per Geste | sobald ein zweites Spiel Ton bekommt (heute in `games/cozy-garden/src/audio.js`) |
| `cards/` | Kartendeck, Mischen mit Seed, Kartengrafik, Stapel ziehen | für Solitaire + Spider (Phase 2) |
| `storage/` | Offline-Cache und Sync mit der API | mit Phase 3; heute reicht `apps/web/src/storage.js` |

Jedes Paket ist ein npm-Workspace mit eigenem `package.json` (Name `@spielesammlung/<paket>`), wird ohne eigenen Build
direkt aus dem Quelltext importiert und hat seine Tests unter `tests/*.test.js`.
