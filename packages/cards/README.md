# @spielesammlung/cards

Alles, was Kartenspiele gemeinsam haben. Genutzt von [Solitaire](../../games/solitaire/) und
[Spider](../../games/spider/).

| Einstieg | Inhalt | DOM |
|---|---|---|
| `@spielesammlung/cards` | `makeDeck`, `shuffle` und `rng` mit Seed, `isRed`, `cloneLayout`, `validMove`, `cardName`, gemeinsame Texte (`STR`) | nein, läuft in Node |
| `@spielesammlung/cards/table` | `createTable(host, opts)`: Kartengrafik, Plätze, Fächer, Ziehen und Ablegen, Antippen, Tastatur-Cursor, Siegesfeier | ja |
| `@spielesammlung/cards/game` | `mountCardGame(el, platform, def)`: kompletter Rahmen einer Patience | ja |
| `@spielesammlung/cards/cards.css` | Filz, Karten, Rückseite, Plätze (bindet `mountCardGame` selbst ein) | – |

## Karten
Eine Karte ist `{ id, suit, rank }`: `suit` 0–3 (♠ ♥ ♦ ♣), `rank` 1–13. Spielstände und Züge speichern nur `id`s.
`makeDeck({ decks: 2, suits: 1 })` ergibt 104 Pik-Karten für Spider mit einer Farbe.
Kartengrafik als HTML (`src/face.js`), aufgebaut wie echte Spielkarten: Ecke oben mit Wert und Farbe, unten dieselbe
Ecke auf dem Kopf; 2–10 mit Farbsymbolen im klassischen Muster (`PIPS`), Ass im Kranz, Bube/Dame/König doppelköpfig
im Rahmen. Im Fächer ist nur der obere Streifen zu sehen (28 % der Höhe), darunter beginnen Muster und Figuren.
Kleine Karten (unter 64 px Breite, Tisch mit Klasse `.compact`, z. B. Spider auf dem Handy) zeigen statt des Musters
ein großes Symbol und keine untere Ecke. Größen hängen an `--cw`/`--ch`.

## Bilder austauschen
Alle Bilder liegen als eigene SVG-Dateien unter `assets/`. Zum Austauschen die Datei ersetzen, Name beibehalten.

| Datei | Wofür | Hinweise |
|---|---|---|
| `suits/spades.svg`, `hearts.svg`, `diamonds.svg`, `clubs.svg` | Farbsymbole (Ecke und Mitte) | eingebettet; `fill="currentColor"` übernimmt Rot/Schwarz der Karte |
| `figures/jack.svg`, `queen.svg`, `king.svg` | Bube, Dame, König in der Kartenmitte (doppelköpfig, mit Hellebarde, Blume, Zepter) | eingebettet; `currentColor` = Gewand/Rahmen (rot bei ♥♦, blaugrau bei ♠♣, in `cards.css`), Format etwa 40:44 |
| `ace-ornament.svg` | Kranz hinter dem großen Symbol des Asses | eingebettet; `currentColor` = Kartenfarbe, quadratisch |
| `back.svg` | Rückseite aller Karten | Hintergrundbild, wird auf die Karte gestreckt: Seitenverhältnis 5:7 (z. B. viewBox 100 × 140) |
| `icons/clock.svg`, `moves.svg`, `undo.svg`, `hint.svg` | Zeit, Züge, Rückgängig, Tipp in der Kopfleiste | eingebettet; `currentColor` = Farbe des Knopfs |

Eingebettete Bilder (`?raw`) sollten keine `id`s brauchen, weil sie mehrfach in der Seite stehen; die Rückseite darf welche haben.

## Ein Patience-Spiel mit `mountCardGame`
Das Spiel liefert:

| Feld | Inhalt |
|---|---|
| `className` | Wurzel-Klasse für eigenes CSS |
| `STR` | Spieltexte je Sprache: `title`, `help` und je Variante ihr Name (überschreiben die gemeinsamen Texte) |
| `Logic` | DOM-freie Regeln: `VARIANTS`, `DEFAULT_VARIANT`, `newGame(v, seed)`, `fromPiles`, `apply(g, zug)` → Ereignisse oder `null`, `undo`, `restore`, `toSave`, `view`, `canDrag`, `dropMove`, `tapMove`, `hint`, `autoMove` |
| `cards(variant)` | Karten der Variante |
| `layout(variant, w, h)` | `{ cardW, cardH, slots }`; je Platz `id`, `x`, `y`, `fan` (`down`/`right`/`none`) und z. B. `maxH`, `drop`, `label` |
| `explain(game, pile, index)` | optional: Text-Schlüssel, wenn Antippen nichts bewirkt |

Züge sind `['d']` (Stapel) oder `['m', von, index, nach]`. Der Rahmen kümmert sich um Kopfleiste, Zeit und Züge,
Rückgängig (spielt die Züge ohne den letzten nach), Tipp, Zuendespielen, Rückfrage vor „Neues Spiel“, Speichern je
Variante, Statistik, `platform.scores` mit Beweis (Seed + Züge), Ton, Siegesfeier und den Lebenszyklus.

Ton: `src/sound.js` (Karte gleitet, landet, dreht sich, Zielstapel als Kalimba) auf Basis von `@spielesammlung/audio`.
