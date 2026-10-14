# packages/

Gemeinsamer Code, der von mehreren Spielen oder von Hülle und Spielen gebraucht wird.
Code zieht erst hierher, wenn ihn **ein zweiter Nutzer** braucht. Bis dahin bleibt er im Spiel.

| Paket | Aufgabe | Stand |
|---|---|---|
| [game-sdk/](game-sdk/) | Spielvertrag in TypeScript: `defineGame()`, Typen von Manifest, `Platform` und `GameHandle`, `createFakePlatform()` für Tests und Einzelbetrieb | vorhanden |
| [i18n/](i18n/) | Sprachliste, Sprachwahl (`pick`), `localized()` für Texte je Sprache, Flaggen | vorhanden |
| [ui/](ui/) | Theme: Farben, Schrift, Pillen-Knöpfe, Karten, Segmente, Regler; Spielrahmen für HTML-Spiele (Kopfleiste, Zähler, Ergebnis, Fußzeile) (`theme.css`) | vorhanden |
| [audio/](audio/) | Web-Audio-Grundlage: Kontext, Entsperren per Geste, Gesamtlautstärke, Pause, Ton, Rauschen, Kalimba, Pentatonik | vorhanden (Cozy Garden, Minesweeper, Kartenspiele) |
| [cards/](cards/) | Deck, Mischen mit Seed, Kartengrafik, Tisch mit Ziehen und Ablegen, Spielrahmen `mountCardGame` für Patiencen | vorhanden (Solitaire, Spider) |
| `storage/` | Offline-Cache und Sync mit der API | mit Phase 3; heute reicht `apps/web/src/storage.js` |

Jedes Paket ist ein npm-Workspace mit eigenem `package.json` (Name `@spielesammlung/<paket>`), wird ohne eigenen Build
direkt aus dem Quelltext importiert und hat seine Tests unter `tests/*.test.js`.
