// Karten ohne DOM: Deck, Mischen mit Seed, Namen. Läuft im Browser und in Node (Tests, später Prüfung auf dem Server).
// Eine Karte ist { id, suit, rank }: id 0..n-1 eindeutig im Spiel, suit 0..3 (♠ ♥ ♦ ♣), rank 1..13 (Ass..König).
// Spielstände und Züge speichern nur ids; welche Karte hinter einer id steckt, ergibt sich aus dem Deck allein.

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOL = ['♠', '♥', '♦', '♣'];
export const RANK_LABEL = [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const isRed = suit => suit === 1 || suit === 2;

/** Zufallszahlen 0..1 aus einem 32-Bit-Seed (mulberry32): gleicher Seed, gleiche Folge */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gemischte Kopie (Fisher-Yates), deterministisch mit dem Seed */
export function shuffle(list, seed) {
  const out = list.slice(), r = rng(seed);
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [out[k], out[j]] = [out[j], out[k]];
  }
  return out;
}

/**
 * Deck aus `decks` × 52 Karten. suits: wie viele verschiedene Farben vorkommen (4, 2 = ♠♥, 1 = nur ♠);
 * die Kartenzahl bleibt gleich, weniger Farben heißt mehr Kopien je Farbe (Spider mit 1 oder 2 Farben).
 */
export function makeDeck({ decks = 1, suits = 4 } = {}) {
  const used = suits === 1 ? [0] : suits === 2 ? [0, 1] : [0, 1, 2, 3];
  const cards = [];
  for (let k = 0; k < decks * 4; k++) {
    const suit = used[k % used.length];
    for (let rank = 1; rank <= 13; rank++) cards.push({ id: cards.length, suit, rank });
  }
  return cards;
}

/**
 * Tischlage kopieren: { piles: { <stapel>: [ids] }, up: [0/1 je id] }. Die Spiellogik hält so ihre Ausgangslage fest
 * und spielt für „Rückgängig“ und beim Laden alle Züge von dort aus nach.
 */
export function cloneLayout({ piles, up }) {
  const out = {};
  for (const k of Object.keys(piles)) out[k] = piles[k].slice();
  return { piles: out, up: up.slice() };
}

/** Prüft einen gespeicherten Zug grob: ['d'] oder ['m', von, index, nach] mit Stapelnamen aus `pileIds` */
export function validMove(m, pileIds) {
  if (!Array.isArray(m)) return false;
  if (m[0] === 'd') return m.length === 1;
  return m[0] === 'm' && m.length === 4 && pileIds.includes(m[1]) && pileIds.includes(m[3]) && Number.isInteger(m[2]) && m[2] >= 0;
}
