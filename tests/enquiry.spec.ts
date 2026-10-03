import { test, expect } from '@playwright/test';

test('topic is prefilled from the link', async ({ page }) => {
  await page.goto('/contact/?topic=valuation');
  await expect(page.locator('#f-topic-valuation')).toBeChecked();
});

test('empty submission shows a focused error summary and inline errors', async ({ page }) => {
  await page.goto('/contact/?topic=sell-side');
  await page.locator('[data-submit]').click();
  const summary = page.locator('[data-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  await expect(page.locator('#err-name')).toHaveText('Enter your name.');
  await expect(page.locator('#f-name')).toHaveAttribute('aria-invalid', 'true');
});

test('invalid email is explained', async ({ page }) => {
  await page.goto('/contact/');
  await page.locator('#f-email').fill('name@company');
  await page.locator('#f-email').blur();
  await expect(page.locator('#err-email')).toContainText('name@company.com');
});

test('never claims success without a connected endpoint', async ({ page }) => {
  await page.goto('/contact/?topic=buy-side');
  const endpoint = await page.locator('[data-enquiry]').getAttribute('data-endpoint');
  test.skip(Boolean(endpoint), 'An endpoint is configured for this build.');

  await page.locator('label:has(#f-client-acquirer)').click();
  await page.locator('#f-name').fill('Alex Morgan');
  await page.locator('#f-email').fill('alex@example.com');
  await page.locator('label:has(#f-consent)').click();
  await page.locator('[data-submit]').click();

  const result = page.locator('[data-result]');
  await expect(result).toBeVisible();
  await expect(result).toBeFocused();
  await expect(page.locator('[data-result-label]')).toHaveText('Not sent');
  await expect(result).not.toContainText('Thank you');

  await page.getByRole('button', { name: 'Return to the form' }).click();
  await expect(page.locator('#f-name')).toHaveValue('Alex Morgan');
});
