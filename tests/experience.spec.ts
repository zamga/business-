import { expect, test, type Page } from '@playwright/test';

/** The lazily loaded three.js chunk for the live hero. */
const heroChunk = /\/_astro\/hero\.[^/]+\.js$/;

const watchHeroChunk = (page: Page) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (heroChunk.test(request.url())) requested.push(request.url());
  });
  return requested;
};

test.describe('intro', () => {
  test('plays on the first page of a visit, then gets out of the way', async ({ page }) => {
    await page.goto('/');
    const intro = page.locator('[data-intro]');
    await expect(page.locator('html')).toHaveClass(/is-intro/);
    await expect(intro).toBeHidden({ timeout: 8000 });
    await page.goto('/approach/');
    await expect(page.locator('html')).not.toHaveClass(/is-intro/);
    await expect(page.locator('[data-intro]')).toBeHidden();
  });

  test('any key opens it at once', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('[data-intro]')).toBeHidden({ timeout: 3000 });
  });

  test('never plays with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/is-intro/);
    await expect(page.locator('[data-intro]')).toBeHidden();
    await context.close();
  });
});

test.describe('hero', () => {
  test('the poster paints first and the model is decorative', async ({ page }) => {
    await page.goto('/');
    const poster = page.locator('.hero__poster img');
    await expect(poster).toHaveAttribute('alt', '');
    await expect(poster).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('[data-hero-stage]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Strategic decisions.');
  });

  test('with reduced motion the poster stays: no 3D scene, no film', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const requested = watchHeroChunk(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    expect(requested).toHaveLength(0);
    await expect(page.locator('[data-hero]')).not.toHaveClass(/is-live|is-filming/);
    await context.close();
  });

  test('phones never download the 3D scene', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones only');
    const requested = watchHeroChunk(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    expect(requested).toHaveLength(0);
  });
});

test.describe('model film', () => {
  test('has a labelled pause control and does not autoplay with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const figure = page.locator('[data-film]');
    await figure.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const video = page.locator('[data-film-video]');
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    const toggle = page.locator('[data-film-toggle]');
    await expect(toggle).toHaveAttribute('aria-label', 'Play the model film');
    // The poster shows the finished structure, so every stage reads as placed.
    await expect(page.locator('[data-film-stage].is-locked')).toHaveCount(5);
    await context.close();
  });
});

test.describe('mandates gallery', () => {
  test('pins on large screens and follows the native scroll', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Large screens only');
    await page.goto('/');
    const gallery = page.locator('[data-gallery]');
    await expect(gallery).toHaveClass(/is-pinned/);
    const track = page.locator('[data-gallery-track]');
    const top = await gallery.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(200);
    const before = await track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(300);
    const after = await track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(after).toBeLessThan(before - 100);
  });

  test('keyboard focus brings an off-screen mandate into view', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Large screens only');
    await page.goto('/');
    const last = page.locator('.xp__link').last();
    await last.focus();
    await page.waitForTimeout(400);
    const box = await last.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  });

  test('is a plain list with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('[data-gallery]')).not.toHaveClass(/is-pinned/);
    await expect(page.locator('.xp__card')).toHaveCount(5);
    await context.close();
  });
});

test('the drafting cursor keeps the caret in text fields', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse only');
  await page.goto('/contact/');
  await page.mouse.move(400, 300);
  await page.mouse.move(420, 320);
  await expect(page.locator('html')).toHaveClass(/has-cursor/);
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).cursor)).toBe('none');
  const field = page.locator('input[type="email"]');
  expect(await field.evaluate((el) => getComputedStyle(el).cursor)).toBe('auto');
});
