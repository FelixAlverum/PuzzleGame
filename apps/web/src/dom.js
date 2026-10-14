// Kleine DOM-Helfer für die Ansichten der Hülle

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Kopfzeile einer Seite: Titel (und Untertitel) links, Knöpfe rechts
export function header(title, subtitle, ...buttons) {
  const top = el('div', 'top');
  const brand = el('div', 'brand');
  brand.append(el('h1', null, title));
  if (subtitle) brand.append(el('p', null, subtitle));
  const row = el('div', 'row');
  row.append(...buttons);
  top.append(brand, row);
  return top;
}

export function link(href, cls, text) {
  const a = el('a', cls, text);
  a.href = href;
  return a;
}
