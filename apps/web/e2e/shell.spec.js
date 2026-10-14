// Plattform-Hülle: Bibliothek, Einstellungen, Übernahme alter Spielstände, Auf- und Abbau der Spiele
import { test, expect } from '@playwright/test';
import { freshStorage, openGame } from './helpers.js';

test('Bibliothek: spielbare Spiele mit Cover, geplante als „Bald verfügbar“', async ({ page }) => {
  await freshStorage(page);
  await page.goto('./#/');
  await expect(page.locator('h1')).toHaveText('Spielesammlung');
  await expect(page.locator('.game:not(.soon)')).toHaveCount(2);
  await expect(page.locator('.game.soon')).toHaveCount(2);
  for (const img of await page.locator('.game img').all()) {
    expect(await img.evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  }
});

test('Alter Spielstand von Cozy Garden wird übernommen, der alte Schlüssel gelöscht', async ({ page }) => {
  const old = {
    v: 3, settings: { music: 0.25, sfx: 1, amb: 1, size: 8, diff: 'normal', biome: 'pond' }, hintDone: true,
    gardens: {}, stats: { 'meadow-8-normal': { games: 4, tiles: 50, best: 777, worst: 10 } }, unlocked: 1, runs: {},
  };
  await freshStorage(page, { 'puzzlegame-save': JSON.stringify(old) });
  await openGame(page, 'cozy-garden');
  expect(await page.evaluate(() => __dbg.settings().music)).toBe(0.25);
  expect(await page.evaluate(() => __dbg.unlocked())).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('puzzlegame-save'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('lib:save:cozy-garden:default'))).not.toBeNull();
  await page.locator('#to-library').click();
  await expect(page.locator('.game[data-game="cozy-garden"] .meta')).toContainText('777');
});

test('Spiel verlassen baut es vollständig ab, Wiederkommen baut es neu auf', async ({ page }) => {
  await freshStorage(page);
  await openGame(page, 'cozy-garden');
  await page.evaluate(() => __dbg.enterGame('meadow'));
  await page.evaluate(() => { location.hash = '#/'; });
  await expect(page.locator('.cozy-garden')).toHaveCount(0);
  expect(await page.evaluate(() => typeof window.__dbg)).toBe('undefined');
  expect(await page.evaluate(() => document.body.classList.contains('playing'))).toBe(false);
  await page.keyboard.press('m');                // Tastendruck nach dem Abbau darf nichts auslösen
  await page.evaluate(() => { location.hash = '#/play/cozy-garden'; });
  await page.waitForFunction(() => window.__dbg && window.__dbg.ready());
  await expect(page.locator('.cozy-garden')).toHaveCount(1);
});

test('Einstellungen: Sprache wechseln und zurück auf „Automatisch“, Lautstärke 0 kommt im Spiel an', async ({ page }) => {
  await freshStorage(page);
  await page.goto('./#/settings');
  await expect(page.locator('.seg.lang[data-lang="auto"]')).toHaveClass(/on/);
  await page.locator('.seg.lang[data-lang="fr"]').click();
  await expect(page.locator('h1')).toHaveText('Paramètres');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.locator('#volume').fill('0');
  await page.locator('.seg.lang[data-lang="auto"]').click();
  await expect(page.locator('h1')).toHaveText('Einstellungen');   // Browsersprache des Tests: Deutsch
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('lib:settings')))).toEqual({ lang: null, volume: 0 });

  await openGame(page, 'cozy-garden');
  await page.evaluate(() => __dbg.showMenu('settings'));
  await expect(page.locator('#muted-note')).toBeVisible();
  await expect(page.locator('.cozy-garden .lang')).toHaveCount(0);   // keine Sprachwahl mehr im Spiel
});

test('Cozy Garden: „← Spielesammlung“ steht vorne, in Holzfarbe; Esc im Hauptmenü führt zurück', async ({ page }) => {
  await freshStorage(page);
  await openGame(page, 'cozy-garden');
  const back = page.locator('#to-library');
  await expect(back).toHaveText('← Spielesammlung');
  expect(await back.evaluate(b => b === b.parentElement.firstElementChild)).toBe(true);
  await expect(back).toHaveCSS('background-color', 'rgb(168, 116, 63)');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/$/);
});

test('Laufende Runde von Cozy Garden übersteht Verlassen und Neuladen', async ({ page }) => {
  await freshStorage(page);
  await openGame(page, 'cozy-garden');
  await page.evaluate(() => __dbg.enterGame('tropics', true));
  const before = await page.evaluate(() => {
    for (let k = 0; k < 4; k++) {
      let done = false;
      for (let s = 0; s < 3 && !done; s++) for (let r = 0; r < 8 && !done; r++) for (let c = 0; c < 8 && !done; c++) done = __dbg.place(s, r, c);
    }
    return { score: __dbg.game().score, cells: __dbg.game().board.filter(Boolean).length, over: __dbg.game().over };
  });
  test.skip(before.over, 'Zufällig Game Over – dann startet die Runde absichtlich neu');
  await page.evaluate(() => { location.hash = '#/'; });
  await page.reload();
  await openGame(page, 'cozy-garden');
  await page.evaluate(() => __dbg.enterGame('tropics'));
  const after = await page.evaluate(() => ({ score: __dbg.game().score, cells: __dbg.game().board.filter(Boolean).length }));
  expect(after).toEqual({ score: before.score, cells: before.cells });
});

test('@handy Bibliothek ohne waagrechtes Scrollen', async ({ page }) => {
  await freshStorage(page);
  await page.goto('./#/');
  await expect(page.locator('.game')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
