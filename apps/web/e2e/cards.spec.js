// Solitaire und Spider in der Hülle: Austeilen, Ziehen mit der Maus, Antippen, Rückgängig, Sieg, Fortsetzen, Handy
import { test, expect } from '@playwright/test';
import { freshStorage, openGame } from './helpers.js';

// Solitaire: id = Farbe * 13 + Wert - 1 (Farbe 0 ♠, 1 ♥, 2 ♦, 3 ♣)
const sid = (suit, rank) => suit * 13 + rank - 1;
const pile = (page, p) => page.evaluate(name => __dbg.game().piles[name].slice(), p);

// Mit der Maus von der Mitte einer Karte zur Mitte eines Platzes ziehen
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);                      // Karten gleiten an ihren Platz
}

// Fast fertig: je Farbe Ass bis 9 abgelegt, 10 bis König liegen offen in vier Spalten
function nearlyWon() {
  const piles = {}, up = [];
  for (let s = 0; s < 4; s++) piles['f' + s] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(r => sid(s, r));
  piles.t0 = [sid(0, 13), sid(1, 12), sid(0, 11), sid(1, 10)];
  piles.t1 = [sid(1, 13), sid(0, 12), sid(1, 11), sid(0, 10)];
  piles.t2 = [sid(2, 13), sid(3, 12), sid(2, 11), sid(3, 10)];
  piles.t3 = [sid(3, 13), sid(2, 12), sid(3, 11), sid(2, 10)];
  for (const p of Object.values(piles)) up.push(...p);
  return { piles, up };
}

test.describe('Solitaire', () => {
  test.beforeEach(async ({ page }) => {
    await freshStorage(page);
    await openGame(page, 'solitaire');
  });

  test('Austeilen, Stapel antippen zieht eine Karte, Rückgängig legt sie zurück', async ({ page }) => {
    await expect(page.locator('.solitaire .pcard')).toHaveCount(52);
    expect((await pile(page, 't6')).length).toBe(7);
    await page.waitForTimeout(1200);                   // Austeil-Animation
    await page.locator('.ptable .slot[data-pile="stock"]').click({ force: true, position: { x: 10, y: 10 } });
    await expect.poll(async () => (await pile(page, 'waste')).length).toBe(1);
    await expect(page.locator('.counter.moves b')).toHaveText('1');
    await page.locator('[data-act="undo"]').click();
    await expect.poll(async () => (await pile(page, 'waste')).length).toBe(0);
    await expect(page.locator('.counter.moves b')).toHaveText('0');
    await expect(page.locator('[data-act="undo"]')).toBeDisabled();
  });

  test('Karte mit der Maus ziehen: passende Stelle nimmt sie, falsche schickt sie zurück', async ({ page }) => {
    await page.evaluate(p => __dbg.setPiles(p.piles, p.up), {
      piles: { t0: [sid(0, 13)], t1: [sid(1, 12)], t2: [sid(2, 12)], stock: [sid(3, 2)] },
      up: [sid(0, 13), sid(1, 12), sid(2, 12)],
    });
    // Herz-Dame auf die leere Spalte t3: geht nicht (nur Könige) – bleibt liegen
    await drag(page, await page.evaluate(i => __dbg.cardCenter(i), sid(1, 12)), await page.evaluate(() => __dbg.slotCenter('t3')));
    expect(await pile(page, 't1')).toEqual([sid(1, 12)]);
    // Herz-Dame auf Pik-König: passt
    await drag(page, await page.evaluate(i => __dbg.cardCenter(i), sid(1, 12)), await page.evaluate(i => __dbg.cardCenter(i), sid(0, 13)));
    expect(await pile(page, 't0')).toEqual([sid(0, 13), sid(1, 12)]);
    expect(await pile(page, 't1')).toEqual([]);
  });

  test('Sieg: der Rest spielt sich von selbst, Karten springen, Meldung, Rekord in der Bibliothek', async ({ page }) => {
    await page.evaluate(p => __dbg.setPiles(p.piles, p.up), nearlyWon());
    await expect.poll(() => page.evaluate(() => __dbg.game().won), { timeout: 6000 }).toBe(true);
    await expect(page.locator('.game-result h2')).toHaveText('Gewonnen!', { timeout: 6000 });
    expect(await page.evaluate(() => __dbg.stats().draw1)).toMatchObject({ played: 1, won: 1 });
    await page.locator('[data-act="exit"]').click();
    await expect(page.locator('.game[data-game="solitaire"] .meta')).toContainText('Rekord (1 Karte ziehen)');
  });

  test('Tipp markiert einen Zug, „Neues Spiel“ fragt nach, laufendes Spiel übersteht das Verlassen', async ({ page }) => {
    await page.waitForTimeout(1200);
    await page.locator('[data-act="hint"]').click();
    await expect(page.locator('.ptable .hint').first()).toBeVisible();
    await page.evaluate(() => __dbg.move(['d']));
    const before = await page.evaluate(() => ({ seed: __dbg.game().seed, moves: __dbg.game().moves.length }));
    const btn = page.locator('[data-act="new"]');
    await btn.click();
    await expect(btn).toHaveText('Wirklich neu?');
    await page.locator('[data-act="exit"]').click();
    await page.evaluate(() => { location.hash = '#/play/solitaire'; });
    await page.waitForFunction(() => window.__dbg && window.__dbg.ready());
    expect(await page.evaluate(() => ({ seed: __dbg.game().seed, moves: __dbg.game().moves.length }))).toEqual(before);
    await page.locator('[data-act="new"]').click();
    await page.locator('[data-act="new"]').click();
    expect(await page.evaluate(() => __dbg.game().moves.length)).toBe(0);
    expect(await page.evaluate(() => __dbg.stats().draw1.played)).toBe(1);   // aufgegeben zählt als Spiel
  });

  test('Tastatur: D zieht, U nimmt zurück, Pfeile und Enter spielen eine Karte', async ({ page }) => {
    await page.evaluate(p => __dbg.setPiles(p.piles, p.up), {
      piles: { t0: [sid(2, 1)], stock: [sid(3, 9)] }, up: [sid(2, 1)],
    });
    await page.keyboard.press('d');
    expect((await pile(page, 'waste')).length).toBe(1);
    await page.keyboard.press('u');
    expect((await pile(page, 'waste')).length).toBe(0);
    await page.keyboard.press('ArrowRight');          // Cursor erscheint auf dem ersten Stapel mit Karten
    for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('.ptable .cursor')).toHaveCount(1);
    await page.keyboard.press('Enter');
    expect(await pile(page, 'f0')).toEqual([sid(2, 1)]);
  });
});

test.describe('Spider', () => {
  test.beforeEach(async ({ page }) => {
    await freshStorage(page);
    await openGame(page, 'spider');
  });

  test('Stapel antippen teilt eine Reihe aus; mit leerer Spalte geht das nicht', async ({ page }) => {
    await expect(page.locator('.spider .pcard')).toHaveCount(104);
    await page.waitForTimeout(2200);
    const top = await page.evaluate(() => { const s = __dbg.game().piles.stock; return s[s.length - 1]; });
    const at = await page.evaluate(i => __dbg.cardCenter(i), top);
    await page.mouse.click(at.x, at.y);
    await expect.poll(async () => (await pile(page, 'stock')).length).toBe(40);
    expect((await pile(page, 't9')).length).toBe(6);
    // Spalte leeren (Lage vorgeben) → Austeilen gesperrt, Hinweis erscheint
    await page.evaluate(() => {
      const g = __dbg.game(), piles = { ...g.piles, t0: [] };
      __dbg.setPiles(piles, g.up.flatMap((u, id) => (u ? [id] : [])));
    });
    await page.keyboard.press('d');
    await expect(page.locator('.note-line')).toHaveText('Erst jede Spalte belegen, dann neu austeilen.');
  });

  test('Gezogene Karten liegen über allen Spalten, auch über denen weiter rechts', async ({ page }) => {
    await page.waitForTimeout(2500);                   // Austeilen abwarten
    const g = await page.evaluate(() => __dbg.game());
    const id = g.piles.t0.at(-1);
    const from = await page.evaluate(i => __dbg.cardCenter(i), id);
    const over = await page.evaluate(i => __dbg.cardCenter(i), g.piles.t9.at(-2));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
    await page.mouse.move(over.x, over.y + 10, { steps: 10 });
    const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y).closest('.pcard').dataset.id, [over.x, over.y + 20]);
    expect(Number(onTop)).toBe(id);
    await page.mouse.up();
  });

  test('Varianten behalten ihren eigenen Lauf; König bis Ass wird abgeräumt und gewinnt', async ({ page }) => {
    await page.evaluate(() => __dbg.move(['d']));
    await page.locator('.game-variants .seg[data-variant="s2"]').click();
    expect(await page.evaluate(() => __dbg.variant())).toBe('s2');
    expect(await page.evaluate(() => __dbg.game().moves.length)).toBe(0);
    await page.locator('.game-variants .seg[data-variant="s1"]').click();
    expect(await page.evaluate(() => __dbg.game().moves.length)).toBe(1);
    // Sieben Folgen fertig, die achte fehlt nur noch das Ass
    await page.evaluate(() => {
      const seq = k => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => k * 13 + r - 1);
      const piles = {};
      for (let k = 0; k < 7; k++) piles['f' + k] = seq(k);
      const last = seq(7);
      piles.t0 = last.slice(0, 12);
      piles.t5 = last.slice(12);
      __dbg.setPiles(piles, last);
    });
    const ace = await page.evaluate(() => __dbg.game().piles.t5[0]);
    await drag(page, await page.evaluate(i => __dbg.cardCenter(i), ace), await page.evaluate(() => __dbg.slotCenter('t0')));
    await expect.poll(() => page.evaluate(() => __dbg.game().won)).toBe(true);
    expect((await pile(page, 'f7')).length).toBe(13);
    await expect(page.locator('.game-result h2')).toHaveText('Gewonnen!', { timeout: 6000 });
  });
});

test('@handy Solitaire: Antippen legt das Ass ab, kein waagrechtes Scrollen', async ({ page }) => {
  await freshStorage(page);
  await openGame(page, 'solitaire');
  await page.evaluate(() => __dbg.setPiles({ t3: [0], t4: [14] }, [0, 14]));
  const c = await page.evaluate(() => __dbg.cardCenter(0));
  await page.touchscreen.tap(c.x, c.y);
  await expect.poll(async () => (await pile(page, 'f0'))).toEqual([0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const fits = await page.evaluate(() => {
    const t = document.querySelector('.ptable').getBoundingClientRect();
    return [...document.querySelectorAll('.ptable .slot')].every(s => s.getBoundingClientRect().right <= t.right + 1);
  });
  expect(fits).toBe(true);
});
