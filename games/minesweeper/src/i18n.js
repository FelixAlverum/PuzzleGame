// Texte von Minesweeper in Deutsch, Englisch, Französisch, Spanisch, Russisch und Chinesisch (vereinfacht).
// Kein DOM: läuft auch in Node. Welche Sprache gilt, entscheidet die Plattform (platform.language()).

const STR = {
  de: {
    title: 'Minesweeper', back: '← Spielesammlung',
    beginner: 'Anfänger', intermediate: 'Fortgeschritten', expert: 'Profi',
    custom: 'Eigenes', customTitle: 'Eigenes Feld', width: 'Breite', height: 'Höhe', mineCount: 'Minen',
    start: 'Los geht’s', cancel: 'Abbrechen', sure: 'Wirklich neu?',
    newGame: 'Neues Spiel', flagMode: 'Flaggen setzen', minesLeft: 'Minen übrig', time: 'Zeit',
    won: 'Geschafft!', lost: 'Boom! Mine erwischt.', again: 'Nochmal', look: 'Feld ansehen',
    best: 'Bestzeit', wins: 'Siege', newBest: 'Neue Bestzeit!',
    help: 'Tippen/Klick: aufdecken · Lang drücken/Rechtsklick: Flagge · Auf eine Zahl: Nachbarn aufdecken',
    keys: 'Tastatur: Pfeile bewegen, Leertaste aufdecken, F Flagge, N neues Spiel',
  },
  en: {
    title: 'Minesweeper', back: '← Game collection',
    beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert',
    custom: 'Custom', customTitle: 'Custom field', width: 'Width', height: 'Height', mineCount: 'Mines',
    start: 'Start', cancel: 'Cancel', sure: 'Really restart?',
    newGame: 'New game', flagMode: 'Place flags', minesLeft: 'Mines left', time: 'Time',
    won: 'Cleared!', lost: 'Boom! You hit a mine.', again: 'Play again', look: 'View board',
    best: 'Best time', wins: 'Wins', newBest: 'New best time!',
    help: 'Tap/click: reveal · Long press/right-click: flag · Tap a number: reveal its neighbours',
    keys: 'Keyboard: arrows move, Space reveals, F flags, N new game',
  },
  fr: {
    title: 'Démineur', back: '← Collection de jeux',
    beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert',
    custom: 'Perso', customTitle: 'Terrain personnalisé', width: 'Largeur', height: 'Hauteur', mineCount: 'Mines',
    start: 'C’est parti', cancel: 'Annuler', sure: 'Vraiment recommencer ?',
    newGame: 'Nouvelle partie', flagMode: 'Poser des drapeaux', minesLeft: 'Mines restantes', time: 'Temps',
    won: 'Réussi !', lost: 'Boum ! Une mine.', again: 'Rejouer', look: 'Voir le terrain',
    best: 'Meilleur temps', wins: 'Victoires', newBest: 'Nouveau meilleur temps !',
    help: 'Toucher/clic : découvrir · Appui long/clic droit : drapeau · Sur un chiffre : découvrir les voisines',
    keys: 'Clavier : flèches pour bouger, Espace pour découvrir, F drapeau, N nouvelle partie',
  },
  es: {
    title: 'Buscaminas', back: '← Colección de juegos',
    beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Experto',
    custom: 'Personal', customTitle: 'Tablero personalizado', width: 'Ancho', height: 'Alto', mineCount: 'Minas',
    start: 'Empezar', cancel: 'Cancelar', sure: '¿Seguro que reinicias?',
    newGame: 'Nueva partida', flagMode: 'Poner banderas', minesLeft: 'Minas restantes', time: 'Tiempo',
    won: '¡Lo lograste!', lost: '¡Bum! Has pisado una mina.', again: 'Otra vez', look: 'Ver tablero',
    best: 'Mejor tiempo', wins: 'Victorias', newBest: '¡Nuevo mejor tiempo!',
    help: 'Toca/clic: descubrir · Mantén pulsado/clic derecho: bandera · Toca un número: descubrir sus vecinas',
    keys: 'Teclado: flechas para mover, Espacio descubre, F bandera, N nueva partida',
  },
  ru: {
    title: 'Сапёр', back: '← Сборник игр',
    beginner: 'Новичок', intermediate: 'Любитель', expert: 'Профессионал',
    custom: 'Своё', customTitle: 'Своё поле', width: 'Ширина', height: 'Высота', mineCount: 'Мины',
    start: 'Начать', cancel: 'Отмена', sure: 'Точно заново?',
    newGame: 'Новая игра', flagMode: 'Ставить флажки', minesLeft: 'Осталось мин', time: 'Время',
    won: 'Готово!', lost: 'Бум! Это была мина.', again: 'Ещё раз', look: 'Посмотреть поле',
    best: 'Лучшее время', wins: 'Победы', newBest: 'Новое лучшее время!',
    help: 'Касание/клик: открыть · Долгое нажатие/правый клик: флажок · На цифру: открыть соседей',
    keys: 'Клавиатура: стрелки — двигать, пробел — открыть, F — флажок, N — новая игра',
  },
  zh: {
    title: '扫雷', back: '← 游戏合集',
    beginner: '初级', intermediate: '中级', expert: '高级',
    custom: '自定义', customTitle: '自定义棋盘', width: '宽度', height: '高度', mineCount: '地雷',
    start: '开始', cancel: '取消', sure: '确定重新开始？',
    newGame: '新游戏', flagMode: '插旗模式', minesLeft: '剩余地雷', time: '时间',
    won: '成功了！', lost: '砰！踩到地雷了。', again: '再来一局', look: '查看棋盘',
    best: '最佳时间', wins: '胜利', newBest: '新的最佳时间！',
    help: '点击：翻开 · 长按/右键：插旗 · 点数字：翻开周围',
    keys: '键盘：方向键移动，空格翻开，F 插旗，N 新游戏',
  },
};

export { STR };
export { LANGS, HTML_LANG, pick } from '@spielesammlung/i18n';
