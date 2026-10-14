// Texte von Solitaire in den sechs Sprachen der Sammlung. Knöpfe, Meldungen und Kartennamen kommen aus
// @spielesammlung/cards; hier steht nur, was Solitaire eigen ist. Kein DOM: läuft auch in Node.

export const STR = {
  de: {
    title: 'Solitaire', draw1: '1 Karte ziehen', draw3: '3 Karten ziehen',
    help: 'Ziehen oder antippen: Karten wandern auf die Zielstapel (je Farbe von Ass bis König) oder in die Spalten – absteigend, rot und schwarz im Wechsel. In leere Spalten passt nur ein König.',
  },
  en: {
    title: 'Solitaire', draw1: 'Draw 1', draw3: 'Draw 3',
    help: 'Drag or tap: cards go to the foundations (Ace to King per suit) or onto the columns – descending, alternating red and black. Only a King fits into an empty column.',
  },
  fr: {
    title: 'Solitaire', draw1: 'Tirer 1 carte', draw3: 'Tirer 3 cartes',
    help: 'Glisse ou touche : les cartes vont sur les fondations (de l’As au Roi par couleur) ou sur les colonnes, en descendant et en alternant rouge et noir. Seul un Roi va dans une colonne vide.',
  },
  es: {
    title: 'Solitario', draw1: 'Robar 1', draw3: 'Robar 3',
    help: 'Arrastra o toca: las cartas van a las bases (del As al Rey por palo) o a las columnas, en orden descendente y alternando rojo y negro. En una columna vacía solo cabe un Rey.',
  },
  ru: {
    title: 'Косынка', draw1: 'По 1 карте', draw3: 'По 3 карты',
    help: 'Перетащи или нажми: карты идут в дома (от туза до короля по мастям) или в столбцы — по убыванию, чередуя красные и чёрные. В пустой столбец можно положить только короля.',
  },
  zh: {
    title: '纸牌接龙', draw1: '每次翻 1 张', draw3: '每次翻 3 张',
    help: '拖动或点击：把牌移到收牌区（每种花色从 A 到 K），或移到牌列上——按降序、红黑交替。空列只能放 K。',
  },
};
