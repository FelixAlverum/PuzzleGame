# Spider Solitaire

Spider mit zwei Decks als viertes Spiel der Spielesammlung (Spiel-ID `spider`). Tisch, Bedienung, Zeit, Speichern
und Siegesfeier kommen aus dem gemeinsamen Rahmen der Kartenspiele ([packages/cards](../../packages/cards/));
dieses Spiel liefert nur Regeln, Texte und die Lage der Stapel.

## Starten
- `npm run dev` startet die Plattform-Hülle, Spider steht in der Bibliothek.
- `npm run dev:spider` startet das Spiel einzeln mit der Fake-Plattform (Spielstände unter `dev:spider:*`).

| Parameter | Wirkung |
|---|---|
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests (`game()`, `move(m)`, `setVariant(v)`, `setPiles(…)` …) |
| `?lang=fr` | Sprache erzwingen, ohne die Einstellung der Hülle zu ändern |

## Regeln und Bedienung
- Varianten: **1 Farbe** (nur Pik), **2 Farben** (Pik, Herz), **4 Farben**. Immer 104 Karten.
- Zehn Spalten (6, 6, 6, 6, 5, 5, 5, 5, 5, 5 Karten, oberste offen), 50 Karten auf dem Stapel = fünf Runden.
- Eine Karte passt auf jede Karte, die genau einen Wert höher ist – die Farbe ist egal – und in jede leere Spalte.
  Mehrere Karten bewegen sich nur zusammen, wenn sie eine absteigende Folge in einer Farbe bilden.
- Liegt König bis Ass in einer Farbe in einer Spalte, wandert die Folge von selbst auf einen der acht Plätze oben.
  Acht fertige Folgen gewinnen.
- Den Stapel antippen legt auf jede Spalte eine Karte – nur, wenn keine Spalte leer ist (sonst erscheint ein Hinweis).
- **Ziehen** oder **antippen**: Antippen schiebt die Folge ab dieser Karte an die beste Stelle (gleiche Farbe zuerst,
  leere Spalte zuletzt).
- **Rückgängig**, **Tipp** und **Tastatur** wie bei Solitaire (`D` teilt aus).

## Fortschritt
- Je Variante ein offener Lauf; gespeichert werden Seed, Züge und Zeit.
- Statistik je Variante: Spiele, Siege, Bestzeit. Aufgegebene Spiele zählen als verloren.
- Siege gehen mit Zeit und Beweis (Seed + Züge) an `platform.scores`, je Variante eine Rangliste.

## Tests
```
node --test "games/spider/tests/*.test.js"
```

## Aufbau
| Datei | Aufgabe |
|---|---|
| `index.js` | Manifest: Titel, Beschreibung, Cover, Ranglisten je Variante |
| `index.html` | Startseite für den Einzelbetrieb ohne Hülle |
| `cover.svg` | Vorschaubild in der Bibliothek |
| `src/logic.js` | Regeln (pur, deterministisch mit Seed): Austeilen, Züge, fertige Folgen, Antippen, Tipp, Rückgängig, Laden |
| `src/main.js` | Lage der Stapel je Bildschirmgröße, Hinweis bei gesperrtem Austeilen, Übergabe an `mountCardGame` |
| `src/i18n.js` | Spieltexte in 6 Sprachen |
| `src/style.css` | Kleinigkeiten unter `.spider` |

## Offen
- Punkte nach Windows-Art (500 − Züge + 100 je Folge) als zweite Rangliste
