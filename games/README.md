# games/

Ein Ordner pro Spiel, benannt nach der Spiel-ID (Kleinbuchstaben, Bindestrich).

| Ordner | Spiel | Stand |
|---|---|---|
| [cozy-garden](cozy-garden/) | Block-Puzzle mit Pflanzenformen | spielbar |
| `minesweeper/` | Minesweeper | geplant (Phase 2) |
| `solitaire/` | Solitaire (Klondike) | geplant (Phase 2) |
| `spider/` | Spider Solitaire | geplant (Phase 2) |

## Regeln für ein Spiel

- Es spricht nur über `platform` mit der Außenwelt: kein `localStorage`, kein `fetch`, keine Konto-Logik.
  Siehe [Spielvertrag](../docs/architektur.md#spielvertrag).
- Die **Spiellogik** liegt in einem eigenen, DOM-freien Modul, deterministisch mit Seed und in Node lauffähig.
  Daran hängen Tests und die Prüfung der Ranglisten.
- Spielstände tragen eine Versionsnummer. Alte Stände migriert das Spiel selbst.
- Eigene Tests unter `tests/*.test.js`. `npm test` in der Repo-Wurzel findet sie automatisch.
- Spielspezifische Einstellungen und Texte bleiben im Spiel. Sprache und Gesamtlautstärke kommen von der Plattform.
