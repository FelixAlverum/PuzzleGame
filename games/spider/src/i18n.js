// Texte von Spider in den sechs Sprachen der Sammlung. Knöpfe, Meldungen und Kartennamen kommen aus
// @spielesammlung/cards; hier steht nur, was Spider eigen ist. Kein DOM: läuft auch in Node.

export const STR = {
  de: {
    title: 'Spider', s1: '1 Farbe', s2: '2 Farben', s4: '4 Farben',
    help: 'Absteigend bauen, die Farbe ist egal. Folgen in einer Farbe lassen sich zusammen bewegen; König bis Ass in einer Farbe wird abgeräumt. Stapel antippen: neue Reihe austeilen.',
    gap: 'Erst jede Spalte belegen, dann neu austeilen.',
  },
  en: {
    title: 'Spider', s1: '1 suit', s2: '2 suits', s4: '4 suits',
    help: 'Build down regardless of suit. Runs of one suit move together; King to Ace in one suit is cleared. Tap the stock to deal a new row.',
    gap: 'Fill every column before dealing again.',
  },
  fr: {
    title: 'Spider', s1: '1 couleur', s2: '2 couleurs', s4: '4 couleurs',
    help: 'Construis en descendant, quelle que soit la couleur. Les suites d’une même couleur se déplacent ensemble ; du Roi à l’As dans une couleur, elles disparaissent. Touche la pioche pour distribuer une rangée.',
    gap: 'Remplis chaque colonne avant de redistribuer.',
  },
  es: {
    title: 'Spider', s1: '1 palo', s2: '2 palos', s4: '4 palos',
    help: 'Construye en orden descendente, sin importar el palo. Las escaleras de un mismo palo se mueven juntas; del Rey al As de un palo se retiran. Toca el mazo para repartir una fila.',
    gap: 'Llena todas las columnas antes de volver a repartir.',
  },
  ru: {
    title: 'Паук', s1: '1 масть', s2: '2 масти', s4: '4 масти',
    help: 'Складывай по убыванию, масть не важна. Последовательности одной масти двигаются вместе; от короля до туза одной масти — убираются. Нажми на колоду, чтобы раздать новый ряд.',
    gap: 'Сначала заполни все столбцы, потом раздавай.',
  },
  zh: {
    title: '蜘蛛纸牌', s1: '单色', s2: '双色', s4: '四色',
    help: '按降序叠放，花色不限。同花色的顺子可以一起移动；同花色从 K 到 A 会被收走。点击牌堆发一行新牌。',
    gap: '先把每一列都放上牌，再发牌。',
  },
};
