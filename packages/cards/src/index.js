// Kartenspiele, DOM-freier Teil: Deck, Mischen mit Seed, Kartennamen und gemeinsame Texte.
// Läuft in Node (Spiellogik, Tests, später Prüfung auf dem Server).
// Der Tisch im DOM und der Spielrahmen liegen unter '@spielesammlung/cards/game' (bzw. '/table').
export * from './deck.js';
export { STR, cardName } from './strings.js';
