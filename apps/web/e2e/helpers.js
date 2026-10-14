// Gemeinsame Hilfen der Browser-Tests

// Leerer Speicher (oder vorgegebene Einträge) für den Origin, bevor die Spielesammlung startet
export async function freshStorage(page, entries = {}) {
  await page.addInitScript(e => {
    if (sessionStorage.getItem('__e2e-init')) return;   // nur beim ersten Laden des Tests
    sessionStorage.setItem('__e2e-init', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
  }, entries);
}

// Spiel öffnen (mit ?debug, damit window.__dbg verfügbar ist) und warten, bis es bereit ist
export async function openGame(page, id, query = 'debug') {
  await page.goto(`./?${query}#/play/${id}`);
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready());
}

export const dbg = (page, expr) => page.evaluate(expr);
