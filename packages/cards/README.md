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
Kartengrafik als HTML mit SVG-Farbsymbolen (`src/face.js`): Ecke mit Wert und Farbe, großes Symbol, Figuren für
Bube, Dame, König; Größen hängen an `--cw`/`--ch`.

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
