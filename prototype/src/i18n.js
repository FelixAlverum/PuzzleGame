// Alle Texte des Spiels in Deutsch, Englisch und Chinesisch (vereinfacht).
// Läuft im Browser (window.I18N) und in Node (Test: alle Sprachen haben dieselben Schlüssel).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.I18N = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STR = {
    de: {
      // Spiel (Canvas)
      best: 'Rekord', combo: 'Combo', hint: 'Ziehe eine Form aufs Beet', over: 'Der Garten ruht', again: 'Neu pflanzen',
      newBest: 'Neuer Rekord!', bloom: 'Der Garten blüht!', fresh: 'Frischer Boden!', garden: 'Garten', undo: 'Zug zurück',
      resetTitle: 'Garten zurücksetzen?', resetText: 'Alle Pflanzen und Gärten dieses Bioms beginnen von vorn.', resetYes: 'Zurücksetzen', resetNo: 'Abbrechen',
      name_meadow: 'Wiese', name_pond: 'Teich', name_tropics: 'Tropen',
      // Menü
      title: 'Cozy Garden', choose: 'Wähle dein Biom', play: 'Spielen', cont: 'Weiter', newGame: 'Neues Spiel', sure: 'Sicher? Nochmal tippen',
      field: 'Feld', guide: 'Anleitung', stats: 'Statistik', settings: 'Einstellungen', back: 'Zurück',
      desc_meadow: 'Pilze, Blüten und Tulpen', desc_pond: 'Seerosen, Schilf und Rohrkolben', desc_tropics: 'Hibiskus, Bambus und Bananenblätter',
      // Statistik
      total: 'Alle Biome', sum: 'Summe', games: 'Spiele', tiles: 'Gelegte Formen', bestScore: 'Höchste Punktzahl', worstScore: 'Niedrigste Punktzahl',
      gamesShort: 'Spiele', tilesShort: 'Formen', bestScoreShort: 'Höchste', worstScoreShort: 'Niedrigste', fieldShort: 'Feld',
      resetStats: 'Statistik zurücksetzen',
      // Einstellungen
      sound: 'Ton', music: 'Musik', sfx: 'Soundeffekte', amb: 'Atmosphäre', muted: 'Der Ton ist in YouTube gerade stummgeschaltet.',
      fieldSize: 'Spielfeldgröße', sizeNote: 'Jede Größe hat eigene Rekorde, eine eigene Statistik und einen eigenen Spielstand.',
      language: 'Sprache',
      // Anleitung
      g_aboutH: 'Worum geht es?',
      g_about: [
        'Ziehe Formen aus dem Korb auf das Beet. Formen lassen sich nicht drehen.',
        'Ist eine Reihe oder Spalte ganz voll, löst sie sich auf – so wird wieder Platz frei.',
        'Jede aufgelöste Linie lässt eine Pflanze in deinem Garten wachsen. Blühen alle 5, beginnt der nächste Garten mit einer neuen Blumenart.',
        'Das Spiel endet, wenn keine deiner Formen mehr passt. Mit „Zug zurück“ nimmst du Züge zurück – sogar nach dem Game Over.',
        'Die Spielfeldgröße (6×6, 8×8, 10×10) stellst du in den Einstellungen ein. Jede Größe hat eigene Rekorde und eine eigene Statistik.',
      ],
      g_scoreH: 'So entstehen die Punkte',
      g_score: [
        ['Jede Zelle einer gelegten Form', '+1'], ['1 Linie', '+10'], ['2 Linien auf einmal', '+30'],
        ['3 Linien auf einmal', '+60'], ['4 Linien auf einmal', '+100'], ['Ganzes Beet leer (frischer Boden)', '+300'],
      ],
      g_combo: 'Combo: Löst du in aufeinanderfolgenden Zügen Linien auf, steigt die Combo. Jede Stufe bringt 50 % mehr Linienpunkte: Combo 2 = ×1,5, Combo 3 = ×2, Combo 4 = ×2,5 … Die Combo übersteht bis zu 2 Züge ohne Auflösung.',
      g_example: 'Beispiel: Eine Form mit 4 Zellen löst in Combo 3 zwei Linien auf: 4 + 30 × 2 = 64 Punkte.',
      g_biomesH: 'Die Biome',
      g_biomes: 'Im Menü wählst du ein Biom. Es gilt für die ganze Runde und bringt eigenes Aussehen, eigene Musik, einen eigenen Garten und 3 besondere Formen. Alle anderen Formen gibt es überall, und die besonderen Formen sind in jedem Biom gleich groß – kein Biom ist leichter.',
      g_bio_meadow: 'Holzrahmen, sanfte Kalimba-Musik und Vogelgezwitscher. Im Garten wachsen Mohn, Sonnenblume, Lavendel, Glockenblume und Margerite.',
      g_bio_pond: 'Steinrahmen, schwebende Glockentöne, Wassertropfen und Frösche. Im Garten wachsen Seerose, Lotus, Sumpf-Schwertlilie, Rohrkolben und Hechtkraut.',
      g_bio_tropics: 'Bambusrahmen, beschwingte Marimba, exotische Vögel und Zikaden. Im Garten wachsen Hibiskus, Strelitzie, Orchidee, Frangipani und Fackelingwer.',
      g_controlsH: 'Steuerung',
      g_controls: [
        'Touch / Maus: Form aufs Beet ziehen',
        'Tastatur: 1–3 Form wählen, Pfeiltasten bewegen, Enter legen, Esc abbrechen',
        'Z oder Rücktaste: Zug zurück · M oder Esc: Menü',
      ],
    },

    en: {
      best: 'Best', combo: 'Combo', hint: 'Drag a piece onto the bed', over: 'The garden rests', again: 'Plant again',
      newBest: 'New best!', bloom: 'Your garden is in bloom!', fresh: 'Fresh soil!', garden: 'Garden', undo: 'Undo move',
      resetTitle: 'Reset garden?', resetText: 'All plants and gardens of this biome start over.', resetYes: 'Reset', resetNo: 'Cancel',
      name_meadow: 'Meadow', name_pond: 'Pond', name_tropics: 'Tropics',
      title: 'Cozy Garden', choose: 'Choose your biome', play: 'Play', cont: 'Continue', newGame: 'New game', sure: 'Sure? Tap again',
      field: 'Field', guide: 'Guide', stats: 'Stats', settings: 'Settings', back: 'Back',
      desc_meadow: 'Mushrooms, blossoms and tulips', desc_pond: 'Water lilies, reeds and cattails', desc_tropics: 'Hibiscus, bamboo and banana leaves',
      total: 'All biomes', sum: 'Total', games: 'Games played', tiles: 'Tiles placed', bestScore: 'Highest score', worstScore: 'Lowest score',
      gamesShort: 'Games', tilesShort: 'Tiles', bestScoreShort: 'Highest', worstScoreShort: 'Lowest', fieldShort: 'Field',
      resetStats: 'Reset stats',
      sound: 'Sound', music: 'Music', sfx: 'Sound effects', amb: 'Ambience', muted: 'Sound is currently muted in YouTube.',
      fieldSize: 'Field size', sizeNote: 'Each size keeps its own records, stats and saved game.',
      language: 'Language',
      g_aboutH: 'What is it about?',
      g_about: [
        'Drag pieces from the basket onto the garden bed. Pieces can’t be rotated.',
        'Fill a whole row or column and it clears – that makes room for more pieces.',
        'Every cleared line grows a plant in your garden. When all 5 bloom, the next garden begins with a new kind of flower.',
        'The game ends when none of your pieces fits anymore. “Undo move” takes moves back – even after game over.',
        'Choose the field size (6×6, 8×8, 10×10) in the settings. Each size keeps its own records and stats.',
      ],
      g_scoreH: 'How your score is formed',
      g_score: [
        ['Each cell of a placed piece', '+1'], ['1 line', '+10'], ['2 lines at once', '+30'],
        ['3 lines at once', '+60'], ['4 lines at once', '+100'], ['Whole bed cleared (fresh soil)', '+300'],
      ],
      g_combo: 'Combo: clear lines in consecutive moves to build a combo. Each step adds 50 % to the line points: combo 2 = ×1.5, combo 3 = ×2, combo 4 = ×2.5 … The combo survives up to 2 moves without a clear.',
      g_example: 'Example: a 4-cell piece clears 2 lines during combo 3: 4 + 30 × 2 = 64 points.',
      g_biomesH: 'The biomes',
      g_biomes: 'Pick a biome in the menu. It stays for the whole game and brings its own look, music, garden and 3 special pieces. All other pieces appear everywhere, and the special pieces have the same sizes in every biome – no biome is easier.',
      g_bio_meadow: 'Wooden frame, gentle kalimba music and birdsong. Your garden grows poppies, sunflowers, lavender, bellflowers and daisies.',
      g_bio_pond: 'Stone frame, floating bell tones, dripping water and frogs. Your garden grows water lilies, lotus, yellow iris, cattails and pickerelweed.',
      g_bio_tropics: 'Bamboo frame, upbeat marimba, exotic birds and cicadas. Your garden grows hibiscus, bird of paradise, orchids, frangipani and torch ginger.',
      g_controlsH: 'Controls',
      g_controls: [
        'Touch / mouse: drag a piece onto the bed',
        'Keyboard: 1–3 select a piece, arrow keys move, Enter places, Esc cancels',
        'Z or Backspace: undo · M or Esc: menu',
      ],
    },

    zh: {
      best: '最高分', combo: '连击', hint: '把方块拖到花圃上', over: '花园休息了', again: '重新种植',
      newBest: '新纪录！', bloom: '花园开花了！', fresh: '全新土壤！', garden: '花园', undo: '撤销一步',
      resetTitle: '重置花园？', resetText: '这个生物群系的所有植物和花园都将重新开始。', resetYes: '重置', resetNo: '取消',
      name_meadow: '草地', name_pond: '池塘', name_tropics: '热带',
      title: 'Cozy Garden', choose: '选择你的生物群系', play: '开始', cont: '继续', newGame: '新游戏', sure: '确定吗？再点一次',
      field: '棋盘', guide: '玩法说明', stats: '统计', settings: '设置', back: '返回',
      desc_meadow: '蘑菇、花朵和郁金香', desc_pond: '睡莲、芦苇和香蒲', desc_tropics: '扶桑花、竹子和芭蕉叶',
      total: '所有生物群系', sum: '合计', games: '游戏局数', tiles: '已放置方块', bestScore: '最高分', worstScore: '最低分',
      gamesShort: '局数', tilesShort: '方块', bestScoreShort: '最高', worstScoreShort: '最低', fieldShort: '棋盘',
      resetStats: '重置统计',
      sound: '声音', music: '音乐', sfx: '音效', amb: '环境音', muted: 'YouTube 当前处于静音状态。',
      fieldSize: '棋盘大小', sizeNote: '每种大小都有独立的纪录、统计和存档。',
      language: '语言',
      g_aboutH: '游戏玩法',
      g_about: [
        '把篮子里的方块拖到花圃上。方块不能旋转。',
        '填满一整行或一整列，它就会消除，腾出新的空间。',
        '每消除一行，你的花园里就会长出一株植物。5 株全部开花后，下一个花园开始，并换上新的花种。',
        '当所有方块都放不下时，游戏结束。用“撤销一步”可以收回操作——游戏结束后也可以。',
        '棋盘大小（6×6、8×8、10×10）可以在设置中调整。每种大小都有独立的纪录和统计。',
      ],
      g_scoreH: '分数怎么算',
      g_score: [
        ['放置方块的每一格', '+1'], ['消除 1 行', '+10'], ['同时消除 2 行', '+30'],
        ['同时消除 3 行', '+60'], ['同时消除 4 行', '+100'], ['清空整个花圃（全新土壤）', '+300'],
      ],
      g_combo: '连击：连续几步都有消除，连击数就会上升。每级连击让消除得分增加 50%：连击 2 = ×1.5，连击 3 = ×2，连击 4 = ×2.5……中间最多可以有 2 步没有消除，连击不会中断。',
      g_example: '例子：一个 4 格的方块在连击 3 时同时消除 2 行：4 + 30 × 2 = 64 分。',
      g_biomesH: '生物群系',
      g_biomes: '在菜单中选择一个生物群系。它在整局游戏中保持不变，并带来独特的外观、音乐、花园和 3 种专属方块。其他方块在所有群系中都会出现，而专属方块在每个群系中大小相同——没有哪个群系更简单。',
      g_bio_meadow: '木质边框，轻柔的卡林巴琴和鸟鸣。花园里生长着虞美人、向日葵、薰衣草、风铃草和雏菊。',
      g_bio_pond: '石质边框，悠扬的钟声、滴水声和蛙鸣。花园里生长着睡莲、荷花、黄菖蒲、香蒲和梭鱼草。',
      g_bio_tropics: '竹子边框，欢快的马林巴琴、异域鸟鸣和蝉声。花园里生长着扶桑花、天堂鸟、兰花、鸡蛋花和火炬姜。',
      g_controlsH: '操作',
      g_controls: [
        '触屏 / 鼠标：把方块拖到花圃上',
        '键盘：1–3 选择方块，方向键移动，Enter 放置，Esc 取消',
        'Z 或退格键：撤销 · M 或 Esc：菜单',
      ],
    },
  };

  const LANGS = ['de', 'en', 'zh'];
  // Name jeder Sprache in sich selbst (für die Sprachauswahl)
  const NATIVE = { de: 'Deutsch', en: 'English', zh: '中文' };
  // HTML-lang-Attribut
  const HTML_LANG = { de: 'de', en: 'en', zh: 'zh-CN' };

  // Sprachcode von YouTube/Browser (z. B. „de-AT“, „zh-Hans-CN“) → unterstützte Sprache
  function pick(code) {
    const c = String(code || '').toLowerCase();
    if (c.startsWith('de')) return 'de';
    if (c.startsWith('zh')) return 'zh';
    return 'en';
  }

  return { STR, LANGS, NATIVE, HTML_LANG, pick };
});
