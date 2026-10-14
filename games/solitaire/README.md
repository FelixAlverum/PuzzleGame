# Solitaire (Klondike)

Die klassische Patience als drittes Spiel der Spielesammlung (Spiel-ID `solitaire`). Tisch, Bedienung, Zeit,
Speichern und Siegesfeier kommen aus dem gemeinsamen Rahmen der Kartenspiele
([packages/cards](../../packages/cards/)); dieses Spiel liefert nur Regeln, Texte und die Lage der Stapel.

## Starten
- `npm run dev` startet die Plattform-Hülle, Solitaire steht in der Bibliothek.
- `npm run dev:solitaire` startet das Spiel einzeln mit der Fake-Plattform (Spielstände unter `dev:solitaire:*`).

| Parameter | Wirkung |
|---|---|
| `?debug` | Zustand unter `window.__dbg` für automatisierte Tests (`game()`, `move(m)`, `tap(stapel, index)`, `setPiles(…)` …) |
| `?lang=fr` | Sprache erzwingen, ohne die Einstellung der Hülle zu ändern |

## Regeln und Bedienung
- Varianten: **1 Karte ziehen** und **3 Karten ziehen**. Der Stapel lässt sich beliebig oft durchgehen.
- Zielstapel: je Farbe vom Ass bis zum König. Spalten: absteigend, rot und schwarz im Wechsel; in eine leere Spalte
  passt nur ein König. Offene Folgen wandern zusammen, verdeckte Karten drehen sich von selbst um.
- **Ziehen** mit Maus oder Finger, oder **antippen**: Die Karte geht auf einen Zielstapel, sonst in die erste passende
  Spalte. Den Stapel antippen zieht neue Karten bzw. dreht die Ablage zurück.
- **Rückgängig** (beliebig weit), **Tipp** (markiert den nützlichsten Zug oder sagt, dass keiner mehr hilft).
- Sind Stapel und Ablage leer und alle Karten offen, spielt sich der Rest von selbst zu Ende.
- **Tastatur:** Pfeile wählen Stapel und Karte, Enter spielt die Karte wie ein Antippen, Leertaste nimmt auf und legt
  am gewählten Stapel ab, `D` zieht, `U`/`Strg+Z` nimmt zurück, `H` Tipp, `N` neues Spiel.
- „Neues Spiel“ fragt bei einem begonnenen Spiel nach (zweiter Tipp innerhalb von 3 s).

## Fortschritt
- Je Variante ein offener Lauf, auch über Verlassen und Neuladen hinweg. Gespeichert werden nur Seed, Züge und Zeit –
  der Stand ergibt sich durch Nachspielen.
- Statistik je Variante: Spiele, Siege, Bestzeit. Ein aufgegebenes Spiel (neues Spiel mitten im Lauf) zählt als verloren.
- Siege gehen mit Zeit und Beweis (Seed + Züge) an `platform.scores`, je Variante eine Rangliste (weniger ist besser).

## Tests
```
node --test "games/solitaire/tests/*.test.js"
```

## Aufbau
| Datei | Aufgabe |
|---|---|
| `index.js` | Manifest: Titel, Beschreibung, Cover, Ranglisten je Variante; lädt `src/main.js` erst beim Start |
| `index.html` | Startseite für den Einzelbetrieb ohne Hülle |
| `cover.svg` | Vorschaubild in der Bibliothek |
| `src/logic.js` | Regeln (pur, deterministisch mit Seed): Austeilen, Ziehen, Züge, Antippen, Tipp, Zuendespielen, Rückgängig, Laden |
| `src/main.js` | Lage der Stapel je Bildschirmgröße, Übergabe an `mountCardGame` |
| `src/i18n.js` | Spieltexte in 6 Sprachen (Knöpfe und Kartennamen kommen aus `packages/cards`) |
| `src/style.css` | Kleinigkeiten unter `.solitaire` |

## Offen
- Nur lösbare Partien austeilen (braucht einen Löser)
- Punkte nach Windows-Art als zweite Rangliste
