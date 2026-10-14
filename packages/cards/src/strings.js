// Gemeinsame Texte der Kartenspiele (Knöpfe, Meldungen, Kartennamen für Screenreader) in den sechs Sprachen der
// Sammlung. Spieltitel, Varianten und Anleitung bringt jedes Spiel selbst mit; sie überschreiben diese Texte.
// Kein DOM: läuft auch in Node.

export const STR = {
  de: {
    back: '← Spielesammlung', newGame: 'Neues Spiel', sure: 'Wirklich neu?', undo: 'Rückgängig', hint: 'Tipp',
    moves: 'Züge', time: 'Zeit', won: 'Gewonnen!', again: 'Nochmal', look: 'Tisch ansehen',
    best: 'Bestzeit', wins: 'Siege', newBest: 'Neue Bestzeit!', noMoves: 'Keine sinnvollen Züge mehr – Rückgängig oder neues Spiel.',
    drawHint: 'Tipp: eine Karte vom Stapel ziehen.', stock: 'Stapel', empty: 'leer', faceDown: 'verdeckte Karte',
    keys: 'Tastatur: Pfeile wählen, Enter legt ab, Leertaste nimmt auf und legt hin, U rückgängig, H Tipp, N neues Spiel',
  },
  en: {
    back: '← Game collection', newGame: 'New game', sure: 'Really restart?', undo: 'Undo', hint: 'Hint',
    moves: 'Moves', time: 'Time', won: 'You won!', again: 'Play again', look: 'View table',
    best: 'Best time', wins: 'Wins', newBest: 'New best time!', noMoves: 'No useful moves left – undo or start a new game.',
    drawHint: 'Hint: draw a card from the stock.', stock: 'Stock', empty: 'empty', faceDown: 'face-down card',
    keys: 'Keyboard: arrows select, Enter plays, Space picks up and puts down, U undo, H hint, N new game',
  },
  fr: {
    back: '← Collection de jeux', newGame: 'Nouvelle partie', sure: 'Vraiment recommencer ?', undo: 'Annuler', hint: 'Indice',
    moves: 'Coups', time: 'Temps', won: 'Gagné !', again: 'Rejouer', look: 'Voir la table',
    best: 'Meilleur temps', wins: 'Victoires', newBest: 'Nouveau meilleur temps !', noMoves: 'Plus de coup utile – annule ou commence une nouvelle partie.',
    drawHint: 'Indice : pioche une carte.', stock: 'Pioche', empty: 'vide', faceDown: 'carte retournée',
    keys: 'Clavier : flèches pour choisir, Entrée pour jouer, Espace pour prendre et poser, U annuler, H indice, N nouvelle partie',
  },
  es: {
    back: '← Colección de juegos', newGame: 'Nueva partida', sure: '¿Seguro que reinicias?', undo: 'Deshacer', hint: 'Pista',
    moves: 'Movimientos', time: 'Tiempo', won: '¡Has ganado!', again: 'Otra vez', look: 'Ver la mesa',
    best: 'Mejor tiempo', wins: 'Victorias', newBest: '¡Nuevo mejor tiempo!', noMoves: 'No quedan movimientos útiles: deshaz o empieza otra partida.',
    drawHint: 'Pista: roba una carta del mazo.', stock: 'Mazo', empty: 'vacío', faceDown: 'carta boca abajo',
    keys: 'Teclado: flechas para elegir, Intro juega, Espacio coge y deja, U deshacer, H pista, N nueva partida',
  },
  ru: {
    back: '← Сборник игр', newGame: 'Новая игра', sure: 'Точно заново?', undo: 'Отменить', hint: 'Подсказка',
    moves: 'Ходы', time: 'Время', won: 'Победа!', again: 'Ещё раз', look: 'Посмотреть стол',
    best: 'Лучшее время', wins: 'Победы', newBest: 'Новое лучшее время!', noMoves: 'Полезных ходов нет – отмени ход или начни заново.',
    drawHint: 'Подсказка: возьми карту из колоды.', stock: 'Колода', empty: 'пусто', faceDown: 'закрытая карта',
    keys: 'Клавиатура: стрелки — выбор, Enter — сыграть, пробел — взять и положить, U — отмена, H — подсказка, N — новая игра',
  },
  zh: {
    back: '← 游戏合集', newGame: '新游戏', sure: '确定重新开始？', undo: '撤销', hint: '提示',
    moves: '步数', time: '时间', won: '你赢了！', again: '再来一局', look: '查看牌桌',
    best: '最佳时间', wins: '胜利', newBest: '新的最佳时间！', noMoves: '没有可走的步了——撤销或开始新游戏。',
    drawHint: '提示：从牌堆抽一张牌。', stock: '牌堆', empty: '空', faceDown: '背面朝上的牌',
    keys: '键盘：方向键选择，回车出牌，空格拿起和放下，U 撤销，H 提示，N 新游戏',
  },
};

// Kartennamen: Farben und Werte je Sprache, zusammengesetzt mit cardName()
const NAMES = {
  de: { suits: ['Pik', 'Herz', 'Karo', 'Kreuz'], ranks: [null, 'Ass', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Bube', 'Dame', 'König'], f: (s, r) => `${s} ${r}` },
  en: { suits: ['spades', 'hearts', 'diamonds', 'clubs'], ranks: [null, 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'], f: (s, r) => `${r} of ${s}` },
  fr: { suits: ['pique', 'cœur', 'carreau', 'trèfle'], ranks: [null, 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi'], f: (s, r) => `${r} de ${s}` },
  es: { suits: ['picas', 'corazones', 'diamantes', 'tréboles'], ranks: [null, 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jota', 'Reina', 'Rey'], f: (s, r) => `${r} de ${s}` },
  ru: { suits: ['пик', 'червей', 'бубен', 'треф'], ranks: [null, 'Туз', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Валет', 'Дама', 'Король'], f: (s, r) => `${r} ${s}` },
  zh: { suits: ['黑桃', '红桃', '方块', '梅花'], ranks: [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], f: (s, r) => `${s}${r}` },
};

/** Name einer Karte, z. B. cardName('de', { suit: 1, rank: 12 }) = 'Herz Dame' */
export function cardName(lang, card) {
  const n = NAMES[lang] || NAMES.en;
  return n.f(n.suits[card.suit], n.ranks[card.rank]);
}
