import { fileURLToPath } from 'node:url';

import { expect, test, type Locator } from '@playwright/test';

import { expectPaintedContent, waitForVisualPaint } from './config/visual-content';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device'
} as const;

const expectActions = async (target: Locator, icsUrl: string, mapUrl: string): Promise<void> => {
  const calendarLink = target.getByRole('link', { name: 'Добавить в календарь' });
  const mapLink = target.getByRole('link', { name: 'Открыть на Яндекс Картах' });

  await expect(calendarLink).toHaveAttribute('href', icsUrl);
  await expect(calendarLink).toHaveAttribute('download', /.+\.ics$/);
  await expectPaintedContent(calendarLink);
  await expect(mapLink).toHaveAttribute('href', mapUrl);
  await expectPaintedContent(mapLink);
};

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1100 }],
  ['mobile', { width: 390, height: 900 }]
] as const) {
  test.describe(`NewsEventCard compact ${device}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      // Isolate Yandex's document/tiles, keeping our iframe, map layer and pin intact.
      await page.route('https://yandex.ru/map-widget/v1/**', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          path: fileURLToPath(
            new URL('./news-event-card-visual/map-background.svg', import.meta.url)
          )
        })
      );
      await page.goto('/');
      await waitForVisualPaint(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });

    test('renders coordinates with background map, pin and actions', async ({ page }) => {
      const target = page.getByTestId('news-event-card-coordinates');

      await expect(target.getByRole('complementary')).toBeVisible();
      await expect(target.getByRole('heading')).toBeVisible();
      const map = target.locator('iframe');
      await expect(map).toHaveAttribute(
        'src',
        /^https:\/\/yandex\.ru\/map-widget\/v1\/\?ll=38\.654321%2C55\.\d+&z=16&l=map$/
      );
      await expect(map).toHaveAttribute('tabindex', '-1');
      await expect(target.frameLocator('iframe').locator('svg')).toBeVisible();
      await expect(target.locator('.news-event-compact-map-pin')).toBeVisible();
      await expectActions(
        target,
        '/news/2026/05/reglament/event.ics',
        'https://yandex.ru/maps/?pt=38.654321,55.123456&z=16&l=map'
      );

      await expect(target).toHaveScreenshot(
        `news-event-card-coordinates-${device}.png`,
        screenshot
      );
    });

    test('renders a text location with map search and no background map or pin', async ({
      page
    }) => {
      const target = page.getByTestId('news-event-card-location-only');

      await expect(target.getByRole('complementary')).toBeVisible();
      await expect(target.getByRole('heading')).toBeVisible();
      await expect(target.locator('iframe')).toHaveCount(0);
      await expect(target.locator('.news-event-compact-map-pin')).toHaveCount(0);
      await expectActions(
        target,
        '/news/2026/06/entrance/event.ics',
        `https://yandex.ru/maps/?text=${encodeURIComponent('КП Шелково, главный въезд')}&z=16&l=map`
      );

      await expect(target).toHaveScreenshot(
        `news-event-card-location-only-${device}.png`,
        screenshot
      );
    });
  });
}
