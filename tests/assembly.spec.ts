import { test, expect, type Page } from '@playwright/test';

const stageCount = (page: Page) => page.locator('[data-stage]').count();

/**
 * Measured at the moment of scrolling: sections above the assembly (the
 * pinned gallery) settle their height once fonts and images are in.
 */
const scrollToStage = async (page: Page, index: number, line: number) => {
  const vh = page.viewportSize()!.height;
  await page.evaluate(
    ([i, offset]) => {
      const stage = document.querySelectorAll('[data-stage]')[i]!;
      window.scrollTo(0, stage.getBoundingClientRect().top + window.scrollY - offset);
    },
    [index, vh * line - 40] as const,
  );
};

test('members are placed stage by stage and the mark completes', async ({ page, isMobile }) => {
  const line = isMobile ? 0.7 : 0.5;
  await page.goto('/');
  const count = await stageCount(page);
  const frame = page.locator('[data-frame]');

  for (let i = 0; i < count; i++) {
    await scrollToStage(page, i, line);
    await expect(frame).toHaveAttribute('data-step', String(i + 1));
    await expect(page.locator('[data-member].is-placed')).toHaveCount(i + 1);
  }
  await expect(frame).toHaveAttribute('data-complete', '');
});

test('jumping away and back resets the assembly', async ({ page, isMobile }) => {
  const line = isMobile ? 0.7 : 0.5;
  await page.goto('/');
  await scrollToStage(page, (await stageCount(page)) - 1, line);
  await expect(page.locator('[data-frame]')).toHaveAttribute('data-step', '5');

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('[data-frame]')).toHaveAttribute('data-step', '0');
  await expect(page.locator('[data-frame]')).not.toHaveAttribute('data-complete', '');
});

test('with reduced motion, members never travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const translates = await page.$$eval('[data-member], [data-member] > div', (els) =>
    els.map((el) => getComputedStyle(el).translate),
  );
  expect(translates.every((t) => t === 'none' || t === '0px' || t === '0px 0px')).toBe(true);
});

test('without JavaScript the structure is shown assembled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const opacity = await page.$eval('.member__solid', (el) => getComputedStyle(el).opacity);
  expect(opacity).toBe('1');
  await context.close();
});
