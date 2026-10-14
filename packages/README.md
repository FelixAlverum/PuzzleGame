# packages/

Gemeinsamer Code, der von mehreren Spielen oder von Hülle und Spielen gebraucht wird. Noch leer.
Code zieht erst hierher, wenn ihn **ein zweiter Nutzer** braucht. Bis dahin bleibt er im Spiel.

| Paket | Aufgabe | Kommt aus / für |
|---|---|---|
| `game-sdk/` | Spielvertrag: `defineGame()`, Typen des `platform`-Objekts, `createFakePlatform()` für Tests | ersetzt `games/cozy-garden/src/platform.js` (Phase 1) |
| `ui/` | Theme, Farben, Schriften, Buttons, Overlays | heute im `<style>` von `games/cozy-garden/index.html` |
| `i18n/` | Sprachwahl, Fallback auf Englisch, gemeinsame Texte | `pick()`/`LANGS` aus `games/cozy-garden/src/i18n.js` |
| `audio/` | Web-Audio-Grundlage, Lautstärkekanäle, Entsperren per Geste | Grundgerüst aus `games/cozy-garden/src/audio.js` |
| `cards/` | Kartendeck, Mischen mit Seed, Kartengrafik, Stapel ziehen | für Solitaire + Spider (Phase 2) |
| `storage/` | IndexedDB-Cache, Sync mit der API | für `apps/web` (Phase 1/3) |
