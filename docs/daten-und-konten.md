# Daten und Konten

## Gastmodus zuerst

Spielen geht ohne Konto, dann liegt alles lokal im Browser. Wer sich registriert, bekommt die Gastdaten
(Spielstände, Statistik, Rekorde) ins Konto übernommen. Ein Login ist nie Voraussetzung fürs Spielen, nur für
Cloud-Sync, Ranglisten und Käufe.

## Speicher im Browser (heute)

Die Hülle legt alles in `localStorage` unter dem Präfix `lib:` ab (`apps/web/src/storage.js`):

| Schlüssel | Inhalt |
|---|---|
| `lib:settings` | globale Einstellungen: `{ lang, volume }` (`lang: null` = Browsersprache) |
| `lib:meta` | `{ lastPlayed: { <spiel-id>: Zeitstempel } }` |
| `lib:save:<spiel-id>:<slot>` | Spielstand, für die Hülle undurchsichtiges JSON (Slot meist `default`) |
| `lib:scores:<spiel-id>` | eigener Rekord je Rangliste |

Warum `localStorage` und nicht IndexedDB: Es schreibt synchron. Spiele speichern auch beim Schließen des Tabs
(`pagehide`), und ein asynchroner IndexedDB-Schreibvorgang kann dort abbrechen. Die Datenmengen sind klein
(Cozy Garden: wenige KB). Mit Cloud-Sync (Phase 3) kommt eine Sync-Warteschlange dazu. Erst dann lohnt sich IndexedDB.

Alte Stände übernimmt die Hülle einmalig: Fehlt `lib:save:<id>:default`, sucht sie die Schlüssel aus
`manifest.legacySaveKeys` (neuester zuerst), kopiert den ersten Fund und löscht alle alten Schlüssel.
Für Cozy Garden sind das `cozy-garden:save` (v0.5) und `puzzlegame-save` (bis v0.4).

Im Einzelbetrieb ohne Hülle (`createFakePlatform`) liegen Spielstände getrennt unter `dev:<spiel-id>:<slot>`.

## Datenmodell (Postgres)

| Tabelle | Inhalt |
|---|---|
| `users` | id, E-Mail, Anzeigename, Sprache, erstellt |
| `sessions` / `accounts` | verwaltet die Auth-Bibliothek (Passwort, Magic Link, Passkey) – Login nicht selbst bauen |
| `user_settings` | globale Einstellungen als JSON (Sprache, Gesamtlautstärke) |
| `saves` | user_id, game_id, slot, save_version, data (jsonb), **revision**, updated_at – PK (user_id, game_id, slot) |
| `scores` | id, user_id, game_id, board_id, value, proof (jsonb), verified, created_at – Index (game_id, board_id, value) |
| `products` | id (`cozy-garden.biome-tropics`), game_id, Art (Spiel / DLC / Bundle), Preis, Anbieter-Preis-ID |
| `entitlements` | user_id, product_id, Quelle (Kauf / Geschenk / gratis), granted_at, revoked_at – PK (user_id, product_id) |
| `orders` | id, user_id, Anbieter, Anbieter-Referenz, Betrag, Währung, Status – der Beleg hinter einem Entitlement |

Spiele selbst stehen nicht in der Datenbank. Ihre Stammdaten (ID, Titel, Ranglisten, DLC-IDs) kommen aus dem
Manifest im Code, siehe [architektur.md](architektur.md#spielvertrag). `products` verbindet sie mit Preisen.

## Spielstände

- **Für die Plattform undurchsichtiges JSON.** Die Plattform kennt nur `save_version`. Migrationen macht das Spiel
  selbst, so wie Cozy Garden heute v1 → v2 → v3 hochzieht (`loadSave` in `games/cozy-garden/src/main.js`).
- **Größenlimit** pro Slot, z. B. 256 KB.
- **Offline-first (Phase 3):** zuerst lokal schreiben, dann im Hintergrund hochladen, mit `revision` (optimistische Sperre).
  Hat der Server eine neuere Revision, weil auf einem anderen Gerät weitergespielt wurde, gewinnt der neuere Stand.
  Im Profil lässt sich zwischen „Dieses Gerät“ und „Cloud“ wählen.
- **Statistik ≠ Rangliste.** Spielinterne Statistik (bei Cozy Garden: Spiele, gelegte Formen, Min/Max je Biom)
  bleibt im Spielstand. In `scores` landen nur Werte für Ranglisten.

## DLC

- Ein DLC ist ein **Produkt**, der Besitz ist ein **Entitlement**. Was in `entitlements` steht (und nicht widerrufen
  ist), ist freigeschaltet. Gekaufte Inhalte hängen am Konto, nie am Gerät.
- Das Spiel fragt nur `platform.entitlements.has('…')`, vom Kauf selbst weiß es nichts.
- **Code-DLC** (z. B. ein Biom, das prozedural gezeichnet wird) darf im Bundle liegen und nur gesperrt sein.
  Im Browser lässt sich das aushebeln. Bei kleinen Inhalten ist das vertretbar.
- **Asset-DLC** (große Bilder, Musik) liefert die API nur gegen ein gültiges Entitlement aus.

## Ranglisten fälschungssicher

Vom Client gemeldete Punkte lassen sich beliebig fälschen. Deshalb schickt ein Spiel zur Punktzahl einen `proof` mit,
den die API **nachspielt**. Dafür muss die Spiellogik deterministisch, DOM-frei und in Node lauffähig sein.

| Spiel | proof | Bereits vorbereitet |
|---|---|---|
| Cozy Garden | Seed + Liste der Züge (`place`, `hold`) | ja: `Logic.newGame(seed, …)`, `place`/`hold` sind pur |
| Minesweeper | Seed + Klicks mit Zeitstempeln | – |
| Solitaire / Spider | Seed + Züge | – |

Nur verifizierte Einträge (`verified = true`) erscheinen in öffentlichen Ranglisten. Zeiten (Minesweeper) prüft die
API auf Plausibilität, denn eine Zeit lässt sich nicht nachspielen.

## Datenschutz

Datenexport (alle eigenen Daten als JSON) und Kontolöschung gehören von Anfang an ins Profil.
Beides schreibt die DSGVO vor, siehe [betrieb.md](betrieb.md#rechtliches).
