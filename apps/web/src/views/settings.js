// Globale Einstellungen: Gesamtlautstärke und Sprache. Gelten für alle Spiele.
import { LANGS, NATIVE, HTML_LANG, FLAGS } from '@spielesammlung/i18n';
import { el, header, link } from '../dom.js';
import GLOBE from '../assets/globe.svg?raw';   // Sprachwahl „Automatisch“

export function settingsView(app, { settings, S }) {
  const page = el('main', 'page');
  page.append(header(S.settings, null, link('#/', 'pill ghost', S.back)));

  // Ton
  const sound = el('section', 'card');
  sound.append(el('h2', null, S.sound));
  const row = el('label', 'setting');
  const input = el('input');
  Object.assign(input, { type: 'range', min: 0, max: 100, step: 5, id: 'volume' });
  const out = el('output');
  const show = () => {
    const v = Math.round(settings.get().volume * 100);
    input.value = v;
    out.textContent = v + ' %';
  };
  input.addEventListener('input', () => {
    settings.set({ volume: input.value / 100 });
    out.textContent = input.value + ' %';
  });
  row.append(el('span', null, S.volume), input, out);
  sound.append(row, el('p', 'note', S.volumeNote));
  show();

  // Sprache
  const language = el('section', 'card');
  language.append(el('h2', null, S.language));
  const seg = el('div', 'seg-row langs');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', S.language);
  // Gewählt ist „Automatisch“ (null = Browsersprache) oder eine feste Sprache
  const chosen = settings.get().lang;
  const option = (value, content, langAttr) => {
    const b = el('button', 'seg lang' + (value === chosen ? ' on' : ''));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(value === chosen));
    if (langAttr) b.setAttribute('lang', langAttr);
    b.dataset.lang = value || 'auto';
    b.append(...content);
    b.addEventListener('click', () => settings.set({ lang: value }));   // die Hülle baut die Seite in der neuen Sprache neu auf
    seg.append(b);
  };
  const globe = el('span', 'flag auto');
  globe.innerHTML = GLOBE;
  option(null, [globe, el('span', null, S.auto)]);
  for (const l of LANGS) {
    const flag = el('span', 'flag');
    flag.innerHTML = FLAGS[l];
    option(l, [flag, el('span', null, NATIVE[l])], HTML_LANG[l]);
  }
  language.append(seg, el('p', 'note', S.langNote));

  page.append(sound, language);
  app.append(page);
  return { cleanup() {} };
}
