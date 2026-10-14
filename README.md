# Spielesammlung (Arbeitstitel)

Eine Bibliothek von Browserspielen unter einem gemeinsamen Dach: Aus einem Menü startet man Cozy Garden, Solitaire,
Spider Solitaire, Minesweeper und weitere Spiele. Ein Benutzerkonto hält Highscores, gekaufte DLCs und Spielstände
geräteübergreifend zusammen. Spielen geht auch ohne Konto (Gastmodus).

Früher war das Repo ein einzelnes YouTube Playable („PuzzleGame“). Das ist es nicht mehr. Daraus ist das erste Spiel
der Sammlung geworden: [Cozy Garden](games/cozy-garden/).

## Stand

| Teil | Stand |
|---|---|
| [games/cozy-garden](games/cozy-garden/) | spielbar, läuft eigenständig, Speichern lokal |
| Plattform-Hülle, weitere Spiele, API | geplant, siehe [Fahrplan](docs/fahrplan.md) |

## Aufbau

```
apps/          Anwendungen, die ausgeliefert werden
  web/           Plattform-Hülle: Bibliothek, Profil, Shop, Login   (geplant, Phase 1)
  api/           Backend: Konten, Spielstände, Ranglisten, Käufe    (geplant, Phase 3)
games/         ein Ordner pro Spiel, jedes Spiel hält sich an den Spielvertrag
  cozy-garden/   Block-Puzzle mit Pflanzenformen
packages/      gemeinsamer Code mehrerer Spiele bzw. von Hülle und Spielen (geplant)
infra/         Docker, nginx, docker-compose für den Server
docs/          Architektur, Daten und Konten, Betrieb, Fahrplan, Entscheidungen
```

Was in welchen Ordner gehört, steht in der README des jeweiligen Ordners:
[apps](apps/README.md) · [games](games/README.md) · [packages](packages/README.md).

## Starten

Cozy Garden: [games/cozy-garden/index.html](games/cozy-garden/index.html) im Browser öffnen. Kein Build nötig.

Tests (Node 22 oder neuer):
```
npm test
```

Docker-Image bauen und veröffentlichen: siehe [docs/betrieb.md](docs/betrieb.md).

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/architektur.md](docs/architektur.md) | Zielbild, Repo-Aufbau, Spielvertrag (`platform`), Menü und Routing |
| [docs/daten-und-konten.md](docs/daten-und-konten.md) | Gastmodus, Datenmodell, Spielstand-Sync, DLC, fälschungssichere Ranglisten |
| [docs/betrieb.md](docs/betrieb.md) | Docker, Server, PWA, Bezahlung, rechtliche Pflichten |
| [docs/fahrplan.md](docs/fahrplan.md) | Phasen 0–4 mit Stand |
| [docs/entscheidungen.md](docs/entscheidungen.md) | Was entschieden ist, was noch offen ist |
