# Cozy Garden

Block-Puzzle im Stil von Block Blast mit Pflanzenformen aus Naturmaterialien – das erste Spiel der Spielesammlung
(Spiel-ID `cozy-garden`). Wie die Sammlung aufgebaut ist und wohin sie sich entwickelt: [Repo-README](../../README.md)
und [docs/](../../docs/).

## Starten
`index.html` im Browser öffnen. Kein Build und keine Abhängigkeiten nötig.

| Parameter | Wirkung |
|---|---|
| `?autoplay` | Ein gieriger Bot spielt selbst (ohne Menü) |
| `?biome=pond&size=10&diff=hard` | Startet direkt in einem Modus (`meadow`/`pond`/`tropics`, `6`/`8`/`10`, `easy`/`normal`/`hard` – nur wenn freigeschaltet) |
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests |
| `?lang=fr` | Sprache erzwingen, ohne sie zu speichern (`de`, `en`, `fr`, `es`, `ru`, `zh`) |

Sprachen: Deutsch, Englisch, Französisch, Spanisch, Russisch, Chinesisch – in den Einstellungen wählbar; ohne Auswahl nach Browsersprache, sonst Englisch.

Steuerung: Formen ziehen (Touch/Maus) oder Tastatur `1`–`4` wählen (`4` = Reservefeld), Pfeiltasten bewegen, `Enter` legen, `H` parken, `Esc` abbrechen, `M` Menü.

**Reservefeld:** Eine Form in das gestrichelte Feld neben der Ablage ziehen (Tastatur: Form wählen, dann `H`), um sie für später zu parken.
Liegt dort schon eine, werden beide getauscht. Von dort lässt sie sich wie jede andere Form aufs Beet ziehen.
Wird die letzte Form der Ablage geparkt, füllt sich die Ablage neu.

**Zug zurücknehmen:** Knopf ↶ oben links (Zahl = verfügbare Schritte) oder Taste `Z`/`Backspace` – auch nach Game Over.
Höchstens die letzten 3 Züge lassen sich zurücknehmen; Parken zählt als Zug. Punkte, Rekord und Garten springen mit zurück.
Die Statistik springt mit zurück (auch ein Game Over). An die Rangliste (`Platform.scores`) geht nur der Rekord, der sich nicht mehr zurücknehmen lässt –
endgültig wird ein Game Over bei „Neu pflanzen“, beim Gang ins Menü oder beim Moduswechsel.
Der Verlauf wird nicht gespeichert; ein Garten-Reset ersetzt den Garten auch in den gemerkten Ständen.

## Menü, Biome, Statistik, Einstellungen
Beim Start erscheint das Menü: Biom wählen – **Wiese**, **Teich** oder **Tropen**. Das Biom gilt für die ganze Runde und bringt
eigenen Hintergrund, Rahmen, Garten, Musik, Atmosphäre und **3 Extra-Formen** (Wiese: Pilz, Blüte, Tulpe · Teich: Schilf, Seerose,
Rohrkolben · Tropen: Bananenblatt, Hibiskus, Bambus). Die übrigen 13 Grundformen gibt es überall.
Im Spiel führt ≡ oben links (oder `M`/`Esc`, nach Game Over auch der Knopf „Zum Menü“) zurück ins Menü; der Lauf bleibt gespeichert – je Biom, Feldgröße und Schwierigkeit einer.

**Schwierigkeit:** Leicht, Mittel, Schwer – wählbar im Menü über den Biomen. Sie ändert nur den Formen-Mix: Leicht bringt mehr kleine
Formen und viel Gnade bei vollem Feld, Mittel ist der bisherige Generator, Schwer bringt mehr große Formen, keine Gnade und bis zu zwei
Riesenformen pro Korb. Neue Spieler starten auf Leicht. Erreicht eine Runde auf der höchsten freien Stufe **1000 Punkte** (beliebiges
Biom, beliebige Feldgröße), wird die nächste Stufe sofort frei. Alte Spielstände (v2) zählen als Mittel; Rekorde ab 1000 schalten beim
Laden nachträglich frei.

- **Statistik:** Spiele, gelegte Formen, höchste und niedrigste Punktzahl je Biom und Feldgröße, dazu Summen – filterbar nach Schwierigkeit.
  Als Spiel zählt nur eine Runde mit Game Over; „Zug zurück“ nimmt auch die Statistik zurück.
- **Anleitung:** Worum es geht, wie die Punkte entstehen (mit Beispiel), die Biome mit ihren Extra-Formen, Steuerung.
- **Einstellungen:** Musik / Soundeffekte / Atmosphäre (0–100 %), Feldgröße 6×6 / 8×8 / 10×10, Sprache (6 Sprachen, mit Flaggen).
  Ohne Auswahl gilt die Sprache des Browsers.

## Garten
Jede aufgelöste Linie lässt eine Pflanze wachsen. Sind alle 5 erblüht, folgt der nächste Garten mit der nächsten Pflanzenart.
Jedes Biom hat seinen eigenen Garten: **Wiese** (Mohn, Sonnenblume, …), **Teich** (Seerose, Lotus, Sumpf-Schwertlilie, Rohrkolben, Hechtkraut),
**Tropen** (Hibiskus, Strelitzie, Orchidee, Frangipani, Fackelingwer).
Ab dem ersten erblühten Garten erscheint oben rechts im Garten ↻ zum Zurücksetzen des Gartens dieses Bioms (mit Rückfrage).

## Tests
```
node --test "games/cozy-garden/tests/*.test.js"
```
oder im Repo-Wurzelordner `npm test`.

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
| `src/i18n.js` | Alle Texte in Deutsch, Englisch, Französisch, Spanisch, Russisch, Chinesisch |
| `src/platform.js` | Plattform-Adapter: Spielstand, Rangliste, Sprache, Ton, Pause – heute lokal (localStorage), später von der Plattform-Hülle gestellt |
| `src/main.js` | Layout, Eingabe, Loop, Rendering, Lebenszyklus |

Die Logik liefert pro Zug Events (`placed`, `cleared`, `boardCleared`, `trayRefilled`, `gameOver`).
Animationen und Sound reagieren nur auf diese Events.

Das Spiel spricht nur über `platform.js` mit der Außenwelt. Der Spielstand liegt lokal unter dem Schlüssel
`cozy-garden:save`; ein alter Stand unter `puzzlegame-save` (bis v0.4) wird beim ersten Laden übernommen.
Ist der Tab verdeckt, pausiert das Spiel samt Ton und speichert.
