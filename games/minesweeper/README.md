# Minesweeper (Prototyp)

Der Klassiker als zweites Spiel der Spielesammlung (Spiel-ID `minesweeper`). Ein Prototyp zum Probespielen: Die Regeln
und die Bedienung sind vollständig, Ton und Animationen fehlen noch.

## Starten
- `npm run dev` startet die Plattform-Hülle, Minesweeper steht in der Bibliothek.
- `npm run dev:minesweeper` startet das Spiel einzeln mit der Fake-Plattform (Spielstände unter `dev:minesweeper:*`).

| Parameter | Wirkung |
|---|---|
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests (`game()`, `reveal(i)`, `flag(i)`, `setLevel(id)` …) |
| `?lang=fr` | Sprache erzwingen, ohne die Einstellung der Hülle zu ändern |

## Regeln und Bedienung
- Stufen: **Anfänger** 9×9 mit 10 Minen, **Fortgeschritten** 16×16 mit 40, **Profi** 30×16 mit 99.
- Der erste Klick ist immer sicher und öffnet eine Fläche: Die Minen werden erst danach gelegt, nie auf das erste Feld
  und seine Nachbarn.
- **Aufdecken:** tippen oder klicken. **Flagge:** lang drücken (Touch), Rechtsklick, oder den Flaggen-Knopf oben
  einschalten, dann setzt jedes Tippen eine Flagge.
- **Akkord:** Auf eine offene Zahl tippen, um die übrigen Nachbarn aufzudecken, wenn ringsum genauso viele Flaggen stehen.
- **Tastatur:** Pfeile bewegen den Cursor, Leertaste/Enter deckt auf, `F` setzt eine Flagge, `N` startet ein neues Spiel.
- Auf hochkanten Bildschirmen wird das breite Profi-Feld gedreht, damit es ohne Scrollen passt.
- Die Zeit läuft ab dem ersten Aufdecken und nur, solange das Spiel sichtbar ist.
- **← Spielesammlung** oben links führt zurück in die Bibliothek.

## Fortschritt
- Je Stufe ein offener Lauf: Wer die Stufe wechselt oder das Spiel verlässt, macht später genau dort weiter.
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
| `src/style.css` | Aussehen, alles unter `.minesweeper` |
| `src/i18n.js` | Texte in 6 Sprachen |

## Offen für die nächste Runde
- Ton (dann gemeinsames `packages/audio` mit Cozy Garden)
- Kleine Animationen beim Aufdecken und bei der Explosion
- Eigene Feldgröße und Minenzahl
- Rückfrage, bevor „Neues Spiel“ einen begonnenen Lauf verwirft
