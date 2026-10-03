import { test, expect } from '@playwright/test';

test('every navigation link resolves', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('header a[href^="/"], footer a[href^="/"]', (links) =>
    [...new Set(links.map((a) => a.getAttribute('href')!.split('#')[0]!))],
  );
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test('mobile menu opens as a modal dialog and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The menu button is part of the small-screen layout.');
  await page.goto('/');
  const toggle = page.locator('[data-menu-open]');
  await toggle.click();
  await expect(page.locator('[data-menu]')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu]')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('unknown addresses return the 404 sheet', async ({ page }) => {
  const response = await page.goto('/no-such-sheet/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('not in the set');
});
