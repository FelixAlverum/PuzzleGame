// Sprachen der Spielesammlung. Die Hülle wählt die Sprache (Einstellungen oder Browser), die Spiele bekommen sie
// über platform.language() und bringen ihre eigenen Texte mit – nur diese Liste und die Sprachwahl sind gemeinsam.

export const LANGS = ['de', 'en', 'fr', 'es', 'ru', 'zh'];
// Name jeder Sprache in sich selbst (für die Sprachauswahl)
export const NATIVE = { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', ru: 'Русский', zh: '中文' };
// HTML-lang-Attribut
export const HTML_LANG = { de: 'de', en: 'en', fr: 'fr', es: 'es', ru: 'ru', zh: 'zh-CN' };

// Sprachcode von Einstellung/Browser (z. B. „de-AT“, „zh-Hans-CN“) → unterstützte Sprache, sonst Englisch
export function pick(code) {
  const c = String(code || '').toLowerCase().slice(0, 2);
  return LANGS.includes(c) ? c : 'en';
}

// Text in der gewünschten Sprache aus { de: …, en: … }, sonst Englisch, sonst der erste vorhandene
export function localized(texts, lang) {
  if (!texts) return '';
  return texts[lang] ?? texts.en ?? Object.values(texts)[0] ?? '';
}

// Flaggen als kleines Inline-SVG (Emoji-Flaggen zeigt Windows nur als Buchstaben an)
function star(cx, cy, r, a) {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.382 : r, t = a + k * Math.PI / 5;
    pts.push(`${(cx + Math.cos(t) * rr).toFixed(2)},${(cy + Math.sin(t) * rr).toFixed(2)}`);
  }
  return `<polygon fill="#ffde00" points="${pts.join(' ')}"/>`;
}
const smallStar = (x, y) => star(x, y, 1, Math.atan2(5 - y, 5 - x));   // Spitze zeigt zum großen Stern

export const FLAGS = {
  de: '<svg viewBox="0 0 5 3" preserveAspectRatio="none"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#dd0000"/><rect y="2" width="5" height="1" fill="#ffce00"/></svg>',
  en: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><clipPath id="uk-clip"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath>' +
    '<path d="M0,0v30h60v-30z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/>' +
    '<path d="M0,0L60,30M60,0L0,30" clip-path="url(#uk-clip)" stroke="#c8102e" stroke-width="4"/>' +
    '<path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>',
  fr: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ed2939"/></svg>',
  es: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="3" height="2" fill="#aa151b"/><rect y="0.5" width="3" height="1" fill="#f1bf00"/></svg>',
  ru: '<svg viewBox="0 0 3 2" preserveAspectRatio="none"><rect width="3" height="0.667" fill="#fff"/><rect y="0.667" width="3" height="0.667" fill="#0039a6"/><rect y="1.333" width="3" height="0.667" fill="#d52b1e"/></svg>',
  zh: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ee1c25"/>' + star(5, 5, 3, -Math.PI / 2) +
    smallStar(10, 2) + smallStar(12, 4) + smallStar(12, 7) + smallStar(10, 9) + '</svg>',
};
