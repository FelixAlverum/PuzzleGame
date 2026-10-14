# Entscheidungen

Neueste oben. **Entschieden** heißt: gilt, bis es hier ausdrücklich geändert wird.
**Vorschlag** heißt: so ist es geplant, festgelegt wird es spätestens in der genannten Phase.

## Entschieden

| Datum | Entscheidung | Warum |
|---|---|---|
| 2026-10-14 | **Spielstände der Hülle in `localStorage`** (Präfix `lib:`), nicht IndexedDB, bis Cloud-Sync kommt | Synchron, also sicher beim Schließen des Tabs (`pagehide`). Die Datenmengen sind klein. IndexedDB lohnt sich erst mit der Sync-Warteschlange (Phase 3). |
| 2026-10-14 | **Lebenszyklus über `GameHandle`**: `mount` gibt `{ pause, resume, unmount }` zurück, die Hülle ruft sie auf | Eine Stelle entscheidet über Sichtbarkeit und Routing. Spiele müssen nicht selbst auf `visibilitychange` hören. |
| 2026-10-14 | **Sprache und Gesamtlautstärke nur in der Hülle**, Kanal-Lautstärken und alles andere im Spiel | Eine Sprache für die ganze Sammlung. Spiele bekommen sie über `platform.language()` und `platform.audio`. |
| 2026-10-14 | **Spiele laufen in der Seite** (`mount/unmount` in ein Element), nicht im iframe. CSS unter einer Wurzel-Klasse je Spiel. | Gemeinsame Pakete, ein Build. Ein iframe lohnt sich erst, falls fremde Spiele dazukommen. |
| 2026-10-14 | **ES-Module + Vite 8, npm-Workspaces**, Pakete ohne eigenen Build direkt aus dem Quelltext | Spiele laden erst beim Start, gemeinsame Pakete, schneller Dev-Server |
| 2026-10-14 | **TypeScript für `game-sdk`** (und später `api`), Hülle und Spiele in JavaScript mit JSDoc-Typen | Der Vertrag zwischen den Teilen braucht Typen, die Spiele nicht zwingend. Nur löschbare Typ-Syntax, damit Node `.ts` direkt ausführt. |
| 2026-10-14 | **Kein YouTube Playable mehr.** Das Projekt wird eine Spielesammlung mit eigenen Konten. | Mehrere Spiele, eigene Konten und DLC-Verkauf passen nicht in den Rahmen von Playables. |
| 2026-10-14 | **Monorepo** mit `apps/`, `games/`, `packages/`, `infra/`, `docs/` | Gemeinsamer Code (Karten, UI, Plattform) ohne Paket-Veröffentlichung, ein Ort für alles |
| 2026-10-14 | Das bisherige Spiel heißt **Cozy Garden**, Spiel-ID `cozy-garden` | Der Titel im Spiel war schon „Cozy Garden“. „PuzzleGame“ bleibt nur Repo-Name. |
| 2026-10-14 | **Spiele sprechen nur über `platform`** mit der Außenwelt | Spiele bleiben unabhängig von Konto, Speicherort und Server und lassen sich einzeln testen |
| 2026-10-14 | **Gastmodus**: Spielen ohne Konto, Übernahme ins Konto bei Registrierung | Kein Login-Zwang vor dem ersten Spiel |
| 2026-10-14 | Docker-Image-Name `alverum/puzzlegame` bleibt vorerst | Bestehende Server laufen weiter. Umbenennen, sobald die Sammlung einen Namen hat. |

## Vorschlag

| Phase | Vorschlag | Warum |
|---|---|---|
| 2 | Minesweeper als zweites Spiel | Am kleinsten, prüft den Vertrag mit wenig Aufwand |
| 3 | Eigene API (Node, Fastify) + Postgres + fertige Auth-Bibliothek (z. B. better-auth) | Volle Kontrolle für Nachspiel-Prüfung und Kauf-Webhooks, läuft im selben docker-compose. Alternative: Supabase. |
| 3 | Ranglisten nur mit nachgespieltem `proof` | Vom Client gemeldete Punkte sind beliebig fälschbar |
| 3 | IndexedDB mit Sync-Warteschlange für Cloud-Spielstände | Offline-first mit Revisionen, siehe daten-und-konten.md |
| 4 | Merchant of Record (Paddle oder Lemon Squeezy) | Übernimmt EU-Umsatzsteuer und Rechnungen |

## Offen

- Name der Spielesammlung (betrifft Repo, Docker-Images, Domain, PWA-Titel; heute Arbeitstitel „Spielesammlung“)
- Welche Inhalte von Cozy Garden DLC werden (z. B. Biome) und was gratis bleibt
- Reihenfolge Solitaire und Spider
