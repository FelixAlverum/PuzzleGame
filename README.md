# Spielesammlung (Arbeitstitel)

Eine Bibliothek von Browserspielen unter einem gemeinsamen Dach: Aus einem Menü startet man Cozy Garden, Solitaire,
Spider Solitaire, Minesweeper und weitere Spiele. Ein Benutzerkonto hält Highscores, gekaufte DLCs und Spielstände
geräteübergreifend zusammen. Spielen geht auch ohne Konto (Gastmodus).

Früher war das Repo ein einzelnes YouTube Playable („PuzzleGame“). Das ist es nicht mehr. Daraus ist das erste Spiel
der Sammlung geworden: [Cozy Garden](games/cozy-garden/).

## Stand

| Teil | Stand |
|---|---|
| [apps/web](apps/web/) – Plattform-Hülle | Bibliothek, Spielansicht, Einstellungen (Sprache, Gesamtlautstärke), PWA; Gastmodus, alles lokal |
| [games/cozy-garden](games/cozy-garden/) | spielbar, in der Hülle und einzeln |
| [games/minesweeper](games/minesweeper/) | Prototyp zum Probespielen, in der Hülle und einzeln |
| Solitaire, Spider | in der Bibliothek als „Bald verfügbar“, siehe [Fahrplan](docs/fahrplan.md) Phase 2 |
| API, Konten, Cloud-Sync, Ranglisten, Shop | geplant, Phase 3 und 4 |

## Aufbau

```
apps/
  web/           Plattform-Hülle: Bibliothek, Spielansicht, Einstellungen (Vite)
  api/           Backend: Konten, Spielstände, Ranglisten, Käufe     (geplant, Phase 3)
games/           ein Ordner pro Spiel, jedes Spiel hält sich an den Spielvertrag
  cozy-garden/   Block-Puzzle mit Pflanzenformen
  minesweeper/   Minesweeper (Prototyp)
packages/
  game-sdk/      Spielvertrag (TypeScript): defineGame, Typen des platform-Objekts, Fake-Plattform
  i18n/          Sprachliste, Sprachwahl, Flaggen
  ui/            gemeinsames Theme (Farben, Knöpfe, Karten, Regler)
infra/           Docker, nginx, docker-compose für den Server
docs/            Architektur, Daten und Konten, Betrieb, Fahrplan, Entscheidungen
```

npm-Workspaces verbinden alles: Die Hülle importiert die Spiele als `@spielesammlung/<spiel-id>`, die Spiele und die Hülle
importieren die Pakete als `@spielesammlung/<paket>`. Was in welchen Ordner gehört, steht in der README des jeweiligen
Ordners: [apps](apps/README.md) · [games](games/README.md) · [packages](packages/README.md).

## Entwickeln

Node 22.18 oder neuer.

```
npm install
npm run dev               # Plattform-Hülle mit allen Spielen: http://localhost:5173
npm run dev:cozy-garden   # Cozy Garden einzeln, ohne Hülle
npm run dev:minesweeper   # Minesweeper einzeln, ohne Hülle
npm test                  # Tests aller Spiele, Pakete und der Hülle
npm run typecheck         # TypeScript-Prüfung des Spielvertrags
npm run build             # Produktions-Build nach apps/web/dist
npm run preview           # den Build lokal ansehen (mit Service Worker): http://localhost:4173
```

Docker-Image bauen und veröffentlichen: siehe [docs/betrieb.md](docs/betrieb.md).

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/architektur.md](docs/architektur.md) | Zielbild, Repo-Aufbau, Spielvertrag (`platform`), Menü und Routing |
| [docs/daten-und-konten.md](docs/daten-und-konten.md) | Gastmodus, Speicher, Datenmodell, Spielstand-Sync, DLC, fälschungssichere Ranglisten |
| [docs/betrieb.md](docs/betrieb.md) | Docker, Server, PWA, Bezahlung, rechtliche Pflichten |
| [docs/fahrplan.md](docs/fahrplan.md) | Phasen 0–4 mit Stand |
| [docs/entscheidungen.md](docs/entscheidungen.md) | Was entschieden ist, was noch offen ist |
