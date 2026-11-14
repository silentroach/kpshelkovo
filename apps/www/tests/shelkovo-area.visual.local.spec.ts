import { expect, test } from '@playwright/test';

import { waitForVisualPaint } from './config/visual-content';

test('all four real area components', async ({ page }) => {
  await page.goto('/');
  await waitForVisualPaint(page);
  await expect(page.locator('.shelkovo-area')).toHaveText(['Парк', 'Ривер', 'Форест', 'Вилладж']);
  await expect(page).toHaveScreenshot('all-areas.png');
});

for (const width of [320, 390]) {
  for (const textScale of [100, 200]) {
    test(`whole pairs at ${width}px and ${textScale}% text`, async ({ page }) => {
      await page.setViewportSize({ width, height: 360 });
      await page.goto('/');
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${scale}%`;
      }, textScale);
      await waitForVisualPaint(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const pairs = page.locator('.shelkovo-area');
      await expect(pairs).toHaveCount(4);
      for (const pair of await pairs.all()) {
        await expect(pair).toBeVisible();
        const layout = await pair.evaluate((element) => {
          const svg = element.querySelector('svg');
          const text = element.querySelector('span');
          if (!svg || !text) {
            throw new Error('Area must contain an icon and a visible label');
          }
          const icon = svg.getBoundingClientRect();
          const label = text.getBoundingClientRect();
          const rect = element.getBoundingClientRect();
          return {
            labelAfterIcon: label.left >= icon.right,
            sameLine: label.top < icon.bottom && icon.top < label.bottom,
            withinViewport: rect.left >= 0 && rect.right <= window.innerWidth,
            uncutLabel: label.width <= rect.width
          };
        });
        expect(layout).toEqual({
          labelAfterIcon: true,
          sameLine: true,
          withinViewport: true,
          uncutLabel: true
        });
      }
      await expect(page).toHaveScreenshot(`areas-${width}-text-${textScale}.png`);
    });
  }
}
