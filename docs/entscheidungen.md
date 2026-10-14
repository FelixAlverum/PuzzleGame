# Entscheidungen

Neueste oben. **Entschieden** heißt: gilt, bis es hier ausdrücklich geändert wird.
**Vorschlag** heißt: so ist es geplant, festgelegt wird es spätestens in der genannten Phase.

## Entschieden

| Datum | Entscheidung | Warum |
|---|---|---|
| 2026-10-14 | **Kein YouTube Playable mehr.** Das Projekt wird eine Spielesammlung mit eigenen Konten. | Mehrere Spiele, eigene Konten und DLC-Verkauf passen nicht in den Rahmen von Playables. |
| 2026-10-14 | **Monorepo** mit `apps/`, `games/`, `packages/`, `infra/`, `docs/` | Gemeinsamer Code (Karten, UI, Plattform) ohne Paket-Veröffentlichung, ein Ort für alles |
| 2026-10-14 | Das bisherige Spiel heißt **Cozy Garden**, Spiel-ID `cozy-garden` | Der Titel im Spiel war schon „Cozy Garden“. „PuzzleGame“ bleibt nur Repo-Name. |
| 2026-10-14 | **Spiele sprechen nur über `platform`** mit der Außenwelt | Spiele bleiben unabhängig von Konto, Speicherort und Server und lassen sich einzeln testen |
| 2026-10-14 | **Gastmodus**: Spielen ohne Konto, Übernahme ins Konto bei Registrierung | Kein Login-Zwang vor dem ersten Spiel |
| 2026-10-14 | Docker-Image-Name `alverum/puzzlegame` bleibt vorerst | Bestehende Server laufen weiter. Umbenennen, sobald die Sammlung einen Namen hat. |

## Vorschlag

| Phase | Vorschlag | Warum |
|---|---|---|
| 1 | ES-Module + Vite, npm-Workspaces | Spiele erst beim Start laden, gemeinsame Pakete, schneller Dev-Server |
| 1 | TypeScript für `game-sdk` und `api`, Spiele dürfen JS + JSDoc bleiben | Der Vertrag zwischen den Teilen braucht Typen, die Spiele nicht zwingend |
| 1 | Spiele laufen in der Seite (`mount/unmount`), nicht im iframe | Gemeinsame Pakete, ein Build. iframe erst, falls fremde Spiele dazukommen. |
| 2 | Minesweeper als zweites Spiel | Am kleinsten, prüft den Vertrag mit wenig Aufwand |
| 3 | Eigene API (Node, Fastify) + Postgres + fertige Auth-Bibliothek (z. B. better-auth) | Volle Kontrolle für Nachspiel-Prüfung und Kauf-Webhooks, läuft im selben docker-compose. Alternative: Supabase. |
| 3 | Ranglisten nur mit nachgespieltem `proof` | Vom Client gemeldete Punkte sind beliebig fälschbar |
| 4 | Merchant of Record (Paddle oder Lemon Squeezy) | Übernimmt EU-Umsatzsteuer und Rechnungen |

## Offen

- Name der Spielesammlung (betrifft Repo, Docker-Images, Domain, PWA-Titel)
- Welche Inhalte von Cozy Garden DLC werden (z. B. Biome) und was gratis bleibt
- Reihenfolge Solitaire und Spider
