// Minesweeper in der Hülle: Bedienung, Sieg, Niederlage mit Kettenreaktion, Fortsetzen, Handy
import { test, expect } from '@playwright/test';
import { freshStorage, openGame } from './helpers.js';

const cell = (page, i) => page.locator(`.minesweeper .c[data-i="${i}"]`);
const firstHidden = page => page.evaluate(() => __dbg.game().open.findIndex((v, i) => !v && !__dbg.game().flag[i]));
const firstMine = page => page.evaluate(() => __dbg.game().mine.findIndex((m, i) => m && !__dbg.game().open[i]));
const winNow = page => page.evaluate(() => {
  const g = __dbg.game();
  for (let i = 0; i < g.mine.length; i++) {
    if (g.flag[i] && !g.mine[i]) __dbg.flag(i);
    if (!g.mine[i] && !g.open[i]) __dbg.reveal(i);
  }
});

test.beforeEach(async ({ page }) => {
  await freshStorage(page);
  await openGame(page, 'minesweeper');
});

test('Klick deckt eine Fläche auf, Rechtsklick setzt eine Flagge, die Zeit läuft', async ({ page }) => {
  await cell(page, 40).click();
  expect(await page.evaluate(() => __dbg.game().opened)).toBeGreaterThan(1);
  const i = await firstHidden(page);
  await cell(page, i).click({ button: 'right' });
  await expect(cell(page, i)).toHaveClass(/flag/);
  await expect(page.locator('.mines b')).toHaveText('9');
  await expect(page.locator('.time b')).not.toHaveText('0', { timeout: 2500 });
});

test('Sieg: Meldung, Statistik und Bestzeit in der Bibliothek', async ({ page }) => {
  await cell(page, 40).click();
  await winNow(page);
  await expect(page.locator('.result h2')).toHaveText('Geschafft!');
  expect(await page.evaluate(() => __dbg.stats().beginner.won)).toBe(1);
  await page.locator('[data-act="exit"]').click();
  await expect(page.locator('.game[data-game="minesweeper"] .meta')).toContainText('Rekord (Anfänger)');
});

test('Niederlage: Kette mit Wackeln, Menü erst danach, alle Minen explodieren', async ({ page }) => {
  await cell(page, 40).click();
  await cell(page, await firstMine(page)).click();
  expect(await page.evaluate(() => __dbg.blasting())).toBe(true);     // der treffende Klick überspringt nicht
  await expect(page.locator('.result')).toBeHidden();
  expect(await page.evaluate(() => document.querySelector('.minesweeper').getAnimations().length)).toBeGreaterThan(0);
  await expect(page.locator('.result')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.result h2')).toHaveText('Boom! Mine erwischt.');
  expect(await page.evaluate(() => __dbg.burst())).toBe(10);
  await expect(page.locator('.minesweeper .c.mine')).toHaveCount(10);
});

test('Niederlage: Klick überspringt die Kette und öffnet sofort das Menü', async ({ page }) => {
  await cell(page, 40).click();
  await cell(page, await firstMine(page)).click();
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => __dbg.blasting())).toBe(true);
  await page.locator('.minesweeper .title').click();
  await expect(page.locator('.result')).toBeVisible();
  expect(await page.evaluate(() => __dbg.blasting())).toBe(false);
  await expect(page.locator('.minesweeper .c.mine')).toHaveCount(10);
});

test('Profi: Kettenreaktion mit 99 Minen dauert höchstens etwa 3,5 s', async ({ page }) => {
  await page.evaluate(() => { __dbg.setLevel('expert'); __dbg.reveal(240); });
  const start = Date.now();
  await page.evaluate(() => { const g = __dbg.game(); __dbg.reveal(g.mine.findIndex((m, i) => m && !g.open[i])); });
  await expect(page.locator('.result')).toBeVisible({ timeout: 6000 });
  expect(Date.now() - start).toBeLessThan(4200);
});

test('Flaggen-Modus: Tippen setzt Flaggen, auf offenen Zahlen werden die Nachbarn aufgedeckt', async ({ page }) => {
  await cell(page, 40).click();
  // Zahl suchen, deren einzige verdeckte Mine bekannt ist, und sie per Flaggen-Modus markieren
  const target = await page.evaluate(() => {
    const g = __dbg.game();
    for (let i = 0; i < g.mine.length; i++) {
      if (!g.open[i] || g.mine[i]) continue;
      const n = [];
      const r = Math.floor(i / g.w), c = i % g.w;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if ((dr || dc) && rr >= 0 && rr < g.h && cc >= 0 && cc < g.w) n.push(rr * g.w + cc);
      }
      const mines = n.filter(j => g.mine[j]), hidden = n.filter(j => !g.open[j]);
      if (mines.length === 1 && hidden.length > 1) return { number: i, mine: mines[0], hidden };
    }
    return null;
  });
  test.skip(!target, 'Kein passendes Feld in dieser Partie');
  await page.locator('.flag-mode').click();
  await cell(page, target.mine).click();
  await expect(cell(page, target.mine)).toHaveClass(/flag/);
  await cell(page, target.number).click();
  const opened = await page.evaluate(t => t.hidden.filter(j => j !== t.mine && __dbg.game().open[j]).length, target);
  expect(opened).toBe(target.hidden.length - 1);
});

test('Tastatur funktioniert auch nach einem Mausklick auf „Neues Spiel“', async ({ page }) => {
  await page.locator('[data-act="new"]').click();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.minesweeper .c.cursor')).toHaveCount(1);
  const seedBefore = await page.evaluate(() => __dbg.game().seed);
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => __dbg.game().seed)).toBe(seedBefore);   // kein zweites „Neues Spiel“
  expect(await page.evaluate(() => __dbg.game().opened)).toBeGreaterThan(0);
});

test('Laufende Stufe übersteht Verlassen; die Zeit läuft draußen nicht weiter', async ({ page }) => {
  await page.evaluate(() => { __dbg.setLevel('intermediate'); __dbg.reveal(120); });
  await page.waitForTimeout(1000);
  await page.locator('[data-act="exit"]').click();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('lib:save:minesweeper:default')).runs.intermediate);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { location.hash = '#/play/minesweeper'; });
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready());
  const after = await page.evaluate(() => ({ level: __dbg.level(), opened: __dbg.game().opened, elapsed: __dbg.game().elapsed }));
  expect(after.level).toBe('intermediate');
  expect(after.opened).toBe(before.opened);
  expect(after.elapsed - before.elapsed).toBeLessThan(500);
});

test('@handy Profi-Feld wird gedreht und passt; Tippen deckt auf, lang drücken setzt eine Flagge', async ({ page }) => {
  await page.evaluate(() => __dbg.setLevel('expert'));
  expect(await page.evaluate(() => __dbg.turned())).toBe(true);
  const fits = await page.evaluate(() => {
    const f = document.querySelector('.minesweeper .field');
    return f.scrollWidth <= f.clientWidth && document.querySelector('.minesweeper .board').getBoundingClientRect().width <= innerWidth;
  });
  expect(fits).toBe(true);
  await cell(page, 200).tap();
  expect(await page.evaluate(() => __dbg.game().opened)).toBeGreaterThan(1);
  const i = await firstHidden(page);
  const box = await cell(page, i).boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(550);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(cell(page, i)).toHaveClass(/flag/);
});
