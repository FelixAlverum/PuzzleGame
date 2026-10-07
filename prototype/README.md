# PuzzleGame – Prototyp v0.1

Block-Puzzle im Stil von Block Blast mit Pflanzenformen aus Naturmaterialien, gebaut als **YouTube Playable**.
Planung, Konkurrenzanalyse und Anforderungen liegen im Obsidian-Vault (`vault/PuzzleGame`).

## Starten
`index.html` im Browser öffnen. Kein Build und keine Abhängigkeiten nötig.

| Parameter | Wirkung |
|---|---|
| `?autoplay` | Ein gieriger Bot spielt selbst (ohne Menü) |
| `?biome=pond&size=10` | Startet direkt in einem Modus (`meadow`/`pond`/`tropics`, `6`/`8`/`10`) |
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests |
| `?lang=fr` | Sprache erzwingen (`de`, `en`, `fr`, `es`, `ru`) |

Sprachen: Deutsch, Englisch, Französisch, Spanisch, Russisch – gewählt nach YouTube- bzw. Browsersprache, sonst Englisch.

Steuerung: Formen ziehen (Touch/Maus) oder Tastatur `1`–`4` wählen (`4` = Reservefeld), Pfeiltasten bewegen, `Enter` legen, `Esc` abbrechen.

**Reservefeld:** Eine Form in das gestrichelte Feld neben der Ablage ziehen (Tastatur: Form wählen, dann `H`), um sie für später zu parken.
Liegt dort schon eine, werden beide getauscht. Von dort lässt sie sich wie jede andere Form aufs Beet ziehen.
Wird die letzte Form der Ablage geparkt, füllt sich die Ablage neu.

**Zug zurücknehmen:** Knopf ↶ oben links (Zahl = verfügbare Schritte) oder Taste `Z`/`Backspace` – auch nach Game Over.
Höchstens die letzten 3 Züge lassen sich zurücknehmen; Parken zählt als Zug. Punkte, Rekord und Garten springen mit zurück.
An YouTube geht nur der Rekord, der sich nicht mehr zurücknehmen lässt (der volle Rekord bei „Neu pflanzen“).
Der Verlauf wird nicht gespeichert und endet mit „Neu pflanzen“.

## Menü, Biome, Statistik, Einstellungen
Beim Start erscheint das Menü: Biom wählen – **Wiese**, **Teich** oder **Tropen**. Das Biom gilt für die ganze Runde und bringt
eigenen Hintergrund, Rahmen, Garten, Musik, Atmosphäre und **3 Extra-Formen** (Wiese: Pilz, Blüte, Tulpe · Teich: Schilf, Seerose,
Rohrkolben · Tropen: Bananenblatt, Hibiskus, Bambus). Die übrigen 13 Grundformen gibt es überall.
Im Spiel führt ≡ oben links (oder `M`/`Esc`) zurück ins Menü; der Lauf bleibt gespeichert – je Biom und Feldgröße einer.

- **Statistik:** Spiele, gelegte Formen, höchste und niedrigste Punktzahl je Biom und Feldgröße, dazu Summen.
  Als Spiel zählt nur eine Runde mit Game Over; „Zug zurück“ nimmt auch die Statistik zurück.
- **Anleitung:** Worum es geht, wie die Punkte entstehen (mit Beispiel), die Biome mit ihren Extra-Formen, Steuerung.
- **Einstellungen:** Musik / Soundeffekte / Atmosphäre (0–100 %), Feldgröße 6×6 / 8×8 / 10×10, Sprache (Deutsch / English / 中文, mit Flaggen).
  Ohne Auswahl gilt die Sprache von YouTube bzw. des Browsers.

## Garten
Jede aufgelöste Linie lässt eine Pflanze wachsen. Sind alle 5 erblüht, folgt der nächste Garten mit der nächsten Pflanzenart.
Jedes Biom hat seinen eigenen Garten: **Wiese** (Mohn, Sonnenblume, …), **Teich** (Seerose, Lotus, Sumpf-Schwertlilie, Rohrkolben, Hechtkraut),
**Tropen** (Hibiskus, Strelitzie, Orchidee, Frangipani, Fackelingwer).
Ab dem ersten erblühten Garten erscheint oben rechts im Garten ↻ zum Zurücksetzen des Gartens dieses Bioms (mit Rückfrage).

## Docker
Öffentliches Image auf Docker Hub: [`alverum/puzzlegame`](https://hub.docker.com/r/alverum/puzzlegame) (amd64 + arm64).
```
docker run -d -p 8080:8080 alverum/puzzlegame:latest
```
Danach im Browser `http://localhost:8080` öffnen. Ausgeliefert von nginx (unprivilegiert, Port 8080).

Neue Version veröffentlichen (im Ordner `prototype`, Version anpassen):
```
docker buildx build --platform linux/amd64,linux/arm64 -t alverum/puzzlegame:0.2.0 -t alverum/puzzlegame:latest --push .
```

## Tests
```
node --test prototype/tests/logic.test.js prototype/tests/i18n.test.js
```

## Aufbau
| Datei | Aufgabe |
|---|---|
| `src/shapes.js` | Formen-Katalog, Drehungen/Spiegelungen |
| `src/logic.js` | Spiellogik (pur, deterministisch): Platzieren, Auflösen, Punkte, Generator, Garten |
| `src/materials.js` | Prozedurale Texturen, Zeichnen der Formen mit Auto-Tiling |
| `src/fx.js` | Partikel und schwebende Texte |
| `src/garden.js` | Garten-Anzeige (Meta-Fortschritt), Biom-Themen |
| `src/audio.js` | Synthetisierte Sounds, Musik und Atmosphäre je Biom (Web Audio), Kanäle Musik/Effekte/Atmosphäre |
| `src/menu.js` | Menü, Anleitung, Statistik, Einstellungen (HTML-Overlay) |
| `src/i18n.js` | Alle Texte in Deutsch, Englisch, Chinesisch |
| `src/yt.js` | Hülle um das YouTube Playables SDK, lokal mit localStorage als Fallback |
| `src/main.js` | Layout, Eingabe, Loop, Rendering, Lebenszyklus |

Die Logik liefert pro Zug Events (`placed`, `cleared`, `boardCleared`, `trayRefilled`, `gameOver`).
Animationen und Sound reagieren nur auf diese Events.
