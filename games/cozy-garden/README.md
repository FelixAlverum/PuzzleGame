# Cozy Garden

Block-Puzzle im Stil von Block Blast mit Pflanzenformen aus Naturmaterialien – das erste Spiel der Spielesammlung
(Spiel-ID `cozy-garden`). Wie die Sammlung aufgebaut ist und wohin sie sich entwickelt: [Repo-README](../../README.md)
und [docs/](../../docs/).

## Starten
Im Repo-Wurzelordner einmal `npm install`, dann:

- `npm run dev` startet die Plattform-Hülle. Cozy Garden ist dort das erste Spiel der Bibliothek.
- `npm run dev:cozy-garden` startet das Spiel einzeln, ohne Hülle, mit der Fake-Plattform aus `@spielesammlung/game-sdk`.
  Spielstände liegen dann getrennt unter `dev:cozy-garden:*`.

Entwickler-Parameter stehen vor dem `#`, in der Hülle also z. B. `http://localhost:5173/?autoplay#/play/cozy-garden`:

| Parameter | Wirkung |
|---|---|
| `?autoplay` | Ein gieriger Bot spielt selbst (ohne Menü) |
| `?biome=pond&size=10&diff=hard` | Startet direkt in einem Modus (`meadow`/`pond`/`tropics`, `6`/`8`/`10`, `easy`/`normal`/`hard` – nur wenn freigeschaltet) |
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests |
| `?lang=fr` | Sprache erzwingen, ohne die Einstellung der Hülle zu ändern (`de`, `en`, `fr`, `es`, `ru`, `zh`) |

Sprachen: Deutsch, Englisch, Französisch, Spanisch, Russisch, Chinesisch. Welche gilt, stellt man in den Einstellungen der
Spielesammlung ein (`platform.language()`), nicht mehr im Spiel.

Steuerung: Formen ziehen (Touch/Maus) oder Tastatur `1`–`4` wählen (`4` = Reservefeld), Pfeiltasten bewegen, `Enter` legen, `H` parken, `Esc` abbrechen, `M` Menü.

**Reservefeld:** Eine Form in das gestrichelte Feld neben der Ablage ziehen (Tastatur: Form wählen, dann `H`), um sie für später zu parken.
Liegt dort schon eine, werden beide getauscht. Von dort lässt sie sich wie jede andere Form aufs Beet ziehen.
Wird die letzte Form der Ablage geparkt, füllt sich die Ablage neu.

**Zug zurücknehmen:** Knopf ↶ oben links (Zahl = verfügbare Schritte) oder Taste `Z`/`Backspace` – auch nach Game Over.
Höchstens die letzten 3 Züge lassen sich zurücknehmen; Parken zählt als Zug. Punkte, Rekord und Garten springen mit zurück.
Die Statistik springt mit zurück (auch ein Game Over). An die Rangliste (`platform.scores`) geht nur der Rekord, der sich nicht mehr zurücknehmen lässt –
endgültig wird ein Game Over bei „Neu pflanzen“, beim Gang ins Menü oder beim Moduswechsel.
Der Verlauf wird nicht gespeichert; ein Garten-Reset ersetzt den Garten auch in den gemerkten Ständen.

## Menü, Biome, Statistik, Einstellungen
Beim Start erscheint das Menü: Biom wählen – **Wiese**, **Teich** oder **Tropen**. Das Biom gilt für die ganze Runde und bringt
eigenen Hintergrund, Rahmen, Garten, Musik, Atmosphäre und **3 Extra-Formen** (Wiese: Pilz, Blüte, Tulpe · Teich: Schilf, Seerose,
Rohrkolben · Tropen: Bananenblatt, Hibiskus, Bambus). Die übrigen 13 Grundformen gibt es überall.
Im Spiel führt ≡ oben links (oder `M`/`Esc`, nach Game Over auch der Knopf „Zum Menü“) zurück ins Menü; der Lauf bleibt gespeichert – je Biom, Feldgröße und Schwierigkeit einer.
Aus dem Menü führt **Bibliothek** (oder `Esc`) zurück zur Spielesammlung.

**Schwierigkeit:** Leicht, Mittel, Schwer – wählbar im Menü über den Biomen. Sie ändert nur den Formen-Mix: Leicht bringt mehr kleine
Formen und viel Gnade bei vollem Feld, Mittel ist der bisherige Generator, Schwer bringt mehr große Formen, keine Gnade und bis zu zwei
Riesenformen pro Korb. Neue Spieler starten auf Leicht. Erreicht eine Runde auf der höchsten freien Stufe **1000 Punkte** (beliebiges
Biom, beliebige Feldgröße), wird die nächste Stufe sofort frei. Alte Spielstände (v2) zählen als Mittel; Rekorde ab 1000 schalten beim
Laden nachträglich frei.

- **Statistik:** Spiele, gelegte Formen, höchste und niedrigste Punktzahl je Biom und Feldgröße, dazu Summen – filterbar nach Schwierigkeit.
  Als Spiel zählt nur eine Runde mit Game Over; „Zug zurück“ nimmt auch die Statistik zurück.
- **Anleitung:** Worum es geht, wie die Punkte entstehen (mit Beispiel), die Biome mit ihren Extra-Formen, Steuerung.
- **Einstellungen:** Musik / Soundeffekte / Atmosphäre (0–100 %), Feldgröße 6×6 / 8×8 / 10×10.
  Sprache und Gesamtlautstärke stellt die Spielesammlung für alle Spiele ein; steht die Gesamtlautstärke auf 0, sagt das Spiel es dazu.

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
| `index.js` | Manifest (`defineGame`): ID, Titel, Beschreibung, Cover, Spielstand-Version, alte Speicherschlüssel; lädt `src/main.js` erst beim Start |
| `index.html` | Startseite für den Einzelbetrieb ohne Hülle |
| `cover.svg` | Vorschaubild in der Bibliothek |
| `src/main.js` | `mount(el, platform)`: Layout, Eingabe, Loop, Rendering, Lebenszyklus (`pause`/`resume`/`unmount`) |
| `src/logic.js` | Spiellogik (pur, deterministisch): Platzieren, Auflösen, Punkte, Generator, Garten |
| `src/shapes.js` | Formen-Katalog, Drehungen/Spiegelungen |
| `src/materials.js` | Prozedurale Texturen, Zeichnen der Formen mit Auto-Tiling |
| `src/fx.js` | Partikel und schwebende Texte |
| `src/garden.js` | Garten-Anzeige (Meta-Fortschritt), Biom-Themen |
| `src/audio.js` | Synthetisierte Sounds, Musik und Atmosphäre je Biom (Web Audio), Kanäle Musik/Effekte/Atmosphäre unter der Gesamtlautstärke |
| `src/menu.js`, `src/menu.html` | Menü, Anleitung, Statistik, Einstellungen (HTML-Overlay, `createMenu`) |
| `src/style.css` | Aussehen des Spiels, alles unter `.cozy-garden` |
| `src/i18n.js` | Alle Spieltexte in Deutsch, Englisch, Französisch, Spanisch, Russisch, Chinesisch |

Die Logik liefert pro Zug Events (`placed`, `cleared`, `boardCleared`, `trayRefilled`, `gameOver`).
Animationen und Sound reagieren nur auf diese Events.

Das Spiel spricht nur über `platform` mit der Außenwelt (Vertrag: `@spielesammlung/game-sdk`). `mount` baut Canvas und
Menü in das übergebene Element; `unmount` speichert, räumt alle Listener an `window` ab (AbortController) und entfernt das DOM.
Pausiert die Hülle das Spiel (verdeckter Tab), stehen Loop und Ton, und es wird gespeichert.
Alte Spielstände unter `cozy-garden:save` (v0.5) bzw. `puzzlegame-save` (bis v0.4) übernimmt die Hülle beim ersten Start.
