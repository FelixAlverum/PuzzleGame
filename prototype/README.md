# PuzzleGame – Prototyp v0.1

Block-Puzzle im Stil von Block Blast mit Pflanzenformen aus Naturmaterialien, gebaut als **YouTube Playable**.
Planung, Konkurrenzanalyse und Anforderungen liegen im Obsidian-Vault (`vault/PuzzleGame`).

## Starten
`index.html` im Browser öffnen. Kein Build und keine Abhängigkeiten nötig.

| Parameter | Wirkung |
|---|---|
| `?autoplay` | Ein gieriger Bot spielt selbst |
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests |

Steuerung: Formen ziehen (Touch/Maus) oder Tastatur `1`–`3` wählen, Pfeiltasten bewegen, `Enter` legen, `Esc` abbrechen.
Zug zurücknehmen: Knopf ↶ oben links (Zahl = verfügbare Schritte, bis zu 100 pro Runde) oder Taste `Z`/`Backspace` – auch nach Game Over.
Der Verlauf wird nicht gespeichert und endet mit „Neu pflanzen“.

## Garten
Jede aufgelöste Linie lässt eine Pflanze wachsen. Sind alle 5 erblüht, folgt der nächste Garten; die Themen wechseln reihum:
**Wiese** (Mohn, Sonnenblume, …), **Teich** (Seerose, Lotus, Sumpf-Schwertlilie, Rohrkolben, Hechtkraut) und
**Tropen** (Hibiskus, Strelitzie, Orchidee, Frangipani, Fackelingwer). Hintergrund und Garten-Boden passen sich dem Thema an.
Ab dem ersten erblühten Garten erscheint oben rechts im Garten ↻ zum kompletten Zurücksetzen (mit Rückfrage).

## Docker
Öffentliches Image auf Docker Hub: [`alverum/puzzlegame`](https://hub.docker.com/r/alverum/puzzlegame) (amd64 + arm64).
```
docker run -d -p 8080:8080 alverum/puzzlegame:latest
```
Danach im Browser `http://localhost:8080` öffnen. Ausgeliefert von nginx (unprivilegiert, Port 8080).

Neue Version veröffentlichen (im Ordner `prototype`, Version anpassen):
```
docker buildx build --platform linux/amd64,linux/arm64 -t alverum/puzzlegame:0.1.0 -t alverum/puzzlegame:latest --push .
```

## Tests
```
node --test prototype/tests/logic.test.js
```

## Aufbau
| Datei | Aufgabe |
|---|---|
| `src/shapes.js` | Formen-Katalog, Drehungen/Spiegelungen |
| `src/logic.js` | Spiellogik (pur, deterministisch): Platzieren, Auflösen, Punkte, Generator, Garten |
| `src/materials.js` | Prozedurale Texturen, Zeichnen der Formen mit Auto-Tiling |
| `src/fx.js` | Partikel und schwebende Texte |
| `src/garden.js` | Garten-Anzeige (Meta-Fortschritt) |
| `src/audio.js` | Synthetisierte Sounds (Web Audio) |
| `src/yt.js` | Hülle um das YouTube Playables SDK, lokal mit localStorage als Fallback |
| `src/main.js` | Layout, Eingabe, Loop, Rendering, Lebenszyklus |

Die Logik liefert pro Zug Events (`placed`, `cleared`, `boardCleared`, `trayRefilled`, `gameOver`).
Animationen und Sound reagieren nur auf diese Events.
