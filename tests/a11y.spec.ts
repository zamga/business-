import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  '/',
  '/expertise/',
  '/expertise/sell-side/',
  '/expertise/buy-side/',
  '/expertise/valuation/',
  '/expertise/strategic-alternatives/',
  '/expertise/transaction-structuring/',
  '/approach/',
  '/firm/',
  '/contact/',
  '/legal/',
  '/privacy/',
];

test.use({ colorScheme: 'light' });

for (const path of pages) {
  test(`no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    // Evaluate content in its final, revealed state.
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed')));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('every page has exactly one h1 and a skip link', async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator('h1'), path).toHaveCount(1);
    await expect(page.locator('a.skip-link'), path).toHaveAttribute('href', '#main');
  }
});
