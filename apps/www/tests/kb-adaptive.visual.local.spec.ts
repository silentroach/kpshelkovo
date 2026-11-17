import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

for (const width of [320, 390, 639, 640, 768, 1440]) {
  test(`adaptive block at ${width}px without JavaScript`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');

    const block = page.getByTestId('adaptive');
    const mobile = block.locator('.ui-adaptive__mobile');
    const wide = block.locator('.ui-adaptive__wide');
    await expect(mobile).toBeVisible({ visible: width < 640 });
    await expect(wide).toBeVisible({ visible: width >= 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(block).toHaveScreenshot(`block-${width}.png`);
  });
}
