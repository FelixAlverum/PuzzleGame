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
