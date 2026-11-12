import { expect, test } from '@playwright/test';

import { waitForVisualPaint } from './config/visual-content';

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`heading variants on a ${width}px canvas`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await waitForVisualPaint(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.getByTestId('title-only').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('three-actions').getByRole('link')).toHaveCount(3);
    await expect(page.getByTestId('paragraphs').locator('.page-heading-subtitle > p')).toHaveCount(
      2
    );
    await expect(page).toHaveScreenshot(`canvas-${width}.png`, { fullPage: true });
  });
}

for (const width of [320, 390]) {
  test(`headings and action groups at ${width}px and 200% text size`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await waitForVisualPaint(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page).toHaveScreenshot(`canvas-${width}-text-200.png`, { fullPage: true });
  });
}
