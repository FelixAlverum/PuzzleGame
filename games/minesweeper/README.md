# Minesweeper

Der Klassiker als zweites Spiel der Spielesammlung (Spiel-ID `minesweeper`), mit Ton und Animation für Aufdecken,
Flaggen, Sieg und Niederlage.

## Starten
- `npm run dev` startet die Plattform-Hülle, Minesweeper steht in der Bibliothek.
- `npm run dev:minesweeper` startet das Spiel einzeln mit der Fake-Plattform (Spielstände unter `dev:minesweeper:*`).

| Parameter | Wirkung |
|---|---|
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests (`game()`, `reveal(i)`, `flag(i)`, `setLevel(id)`, `setCustom({ w, h, mines })` …) |
| `?lang=fr` | Sprache erzwingen, ohne die Einstellung der Hülle zu ändern |

## Regeln und Bedienung
- Stufen: **Anfänger** 9×9 mit 10 Minen, **Fortgeschritten** 16×16 mit 40, **Profi** 30×16 mit 99.
- **Eigenes** Feld: Breite 5–40, Höhe 5–30, Minen bis auf 9 freie Felder. Ein zweiter Tipp auf „Eigenes“ öffnet die
  Maße wieder. Eigene Felder haben keine Rangliste und keine Bestzeit, nur Siege.
- Der erste Klick ist immer sicher und öffnet eine Fläche: Die Minen werden erst danach gelegt, nie auf das erste Feld
  und seine Nachbarn.
- **Aufdecken:** tippen oder klicken. **Flagge:** lang drücken (Touch), Rechtsklick, oder den Flaggen-Knopf oben
  einschalten, dann setzt jedes Tippen auf ein verdecktes Feld eine Flagge (auf offenen Zahlen deckt es weiter auf).
- **Akkord:** Auf eine offene Zahl tippen, um die übrigen Nachbarn aufzudecken, wenn ringsum genauso viele Flaggen stehen.
- **Tastatur:** Pfeile bewegen den Cursor, Leertaste/Enter deckt auf, `F` setzt eine Flagge, `N` startet ein neues Spiel.
- **Neues Spiel** verwirft einen begonnenen Lauf erst nach einem zweiten Tipp (oder `N`) innerhalb von 3 s.
- Auf hochkanten Bildschirmen wird das breite Profi-Feld gedreht, damit es ohne Scrollen passt.
- Die Zeit läuft ab dem ersten Aufdecken und nur, solange das Spiel sichtbar ist.
- **← Spielesammlung** oben links führt zurück in die Bibliothek.

## Ton und Animation
- Aufdecken: Ein einzelnes Feld klopft leise, eine ganze Fläche raschelt wie Moos und klingt mit einem Ton, der mit
  der Größe der Fläche steigt. Die Felder springen von der angeklickten Stelle aus nacheinander auf.
- Flagge: kurzes Flattern und Stecken, Entfernen etwas leiser.
- Sieg: Kalimba-Folge (bei neuer Bestzeit länger), eine Welle läuft diagonal über das Feld, die Flaggen hüpfen; danach
  kommt die Meldung.
- Bei „Bewegung reduzieren“ im System entfallen die Animationen beim Aufdecken und beim Sieg.

## Niederlage
Die getroffene Mine explodiert sofort mit lautem Knall, Feuerball, Lichtblitz und starkem Wackeln des Bildschirms.
Danach gehen die übrigen Minen nacheinander hoch, die nächstgelegenen zuerst, erst einzeln und dann immer schneller,
jede mit eigenem Knall und kleinerem Wackeln. Insgesamt dauert das höchstens etwa 3,4 s, auch bei 99 Minen
(Knalle höchstens alle 45 ms). Richtig gesetzte Flaggen bleiben stehen. Erst danach öffnet sich das Menü.
Ein Klick irgendwohin oder ein Tastendruck überspringt die Kette und öffnet das Menü sofort.

Der Knall ist synthetisch (`src/audio.js` auf Basis von `@spielesammlung/audio`, mit Kompressor), folgt der Gesamtlautstärke der Spielesammlung
und schweigt bei verdecktem Tab. Auf Handys vibriert es zusätzlich. Bei „Bewegung reduzieren“ im System wackelt der
Bildschirm nur leicht.

## Fortschritt
- Je Stufe (auch „Eigenes“) ein offener Lauf: Wer die Stufe wechselt oder das Spiel verlässt, macht später genau dort weiter.
- Statistik je Stufe: beendete Spiele, Siege, Bestzeit. Ein abgebrochenes Spiel zählt nicht.
- Siege gehen mit Zeit und Beweis (Seed + Züge) an `platform.scores` (je Stufe eine Rangliste, weniger ist besser).
  Die Bibliothek zeigt die eigene Bestzeit je Stufe.

## Tests
```
node --test "games/minesweeper/tests/*.test.js"
```

## Aufbau
| Datei | Aufgabe |
|---|---|
| `index.js` | Manifest: Titel, Beschreibung, Cover, Ranglisten je Stufe; lädt `src/main.js` erst beim Start |
| `index.html` | Startseite für den Einzelbetrieb ohne Hülle |
| `cover.svg` | Vorschaubild in der Bibliothek |
| `src/logic.js` | Spiellogik (pur, deterministisch mit Seed): Minen legen, Aufdecken mit Ausbreitung, Flaggen, Akkord, Sieg/Niederlage, Statistik |
| `src/main.js` | `mount(el, platform)`: Raster als HTML, Eingabe (Maus, Touch, Tastatur), Zeit, Speichern, Lebenszyklus |
| `src/audio.js` | Klänge: Aufdecken, Flagge, Sieg, Knall der Minen (ohne Dateien) |
| `src/style.css` | Aussehen unter `.minesweeper` (Spielrahmen aus `packages/ui`), Aufdecken, Welle, Explosion als CSS-Animation |
| `src/i18n.js` | Texte in 6 Sprachen |
| `assets/icon-*.svg` | Symbole der Kopfleiste (Minen, Zeit, Flaggen-Modus), eingebettet mit `currentColor` |
| `assets/cell-*.svg` | Bilder in den Feldern: Flagge, Mine, Kreuz über falscher Flagge (feste Farben) |

## Offen
- Screenreader: Felder mit Namen und Zustand, Cursor ansagen
