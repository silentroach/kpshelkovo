import { expect, test } from '@playwright/test';

import { waitForVisualPaint } from './config/visual-content';

const variants = [
  'daily',
  'middle-day-off',
  'differing-weekend-hours',
  'split-intervals-description',
  'no-hours'
] as const;

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1100 }],
  ['mobile', { width: 390, height: 900 }]
] as const) {
  test.describe(`PlaceOpeningHours ${device}`, () => {
    // Deliberately different from Moscow: Tuesday 13:30 there, 03:30 here.
    test.use({ viewport, timezoneId: 'America/Los_Angeles' });

    test.beforeEach(async ({ page, javaScriptEnabled }) => {
      if (javaScriptEnabled) {
        await page.clock.setFixedTime(new Date('2026-09-15T10:30:00Z'));
      }
      await page.goto('/');
      if (javaScriptEnabled) await waitForVisualPaint(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });

    for (const variant of variants) {
      test(`renders ${variant}`, async ({ page }) => {
        const target = page.getByTestId(variant);
        const status = target.locator('[data-place-opening-status]');

        if (variant === 'no-hours') {
          await expect(target.locator('dt')).toHaveCount(1);
          await expect(target.locator('.place-opening-hours-row')).toHaveCount(0);
          await expect(status).toHaveCount(0);
        } else {
          await expect(target.getByRole('list')).toBeVisible();
          await expect(status).toHaveAttribute(
            'data-open',
            String(variant === 'daily' || variant === 'differing-weekend-hours')
          );
          await expect(status).toBeVisible();
        }

        await expect(target).toHaveScreenshot(`place-opening-hours-${variant}-${device}.png`, {
          animations: 'disabled',
          caret: 'hide',
          scale: 'device'
        });
      });
    }

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('keeps the full schedule and description readable without a live status', async ({
        page
      }) => {
        for (const [variant, rowCount] of [
          ['daily', 1],
          ['middle-day-off', 4],
          ['differing-weekend-hours', 3],
          ['split-intervals-description', 2]
        ] as const) {
          const target = page.getByTestId(variant);
          const rows = target.getByRole('listitem');
          await expect(rows).toHaveCount(rowCount);
          for (const row of await rows.all()) await expect(row).toBeVisible();
          await expect(target.locator('[data-place-opening-status]')).toBeHidden();
        }

        const split = page.getByTestId('split-intervals-description');
        await expect(split.getByRole('listitem').first()).toContainText('09:00–13:00, 14:00–18:00');
        const description = split.locator('.place-opening-hours-description');
        await expect(description).toBeVisible();
        const weekBox = await split.getByRole('list').boundingBox();
        const descriptionBox = await description.boundingBox();
        if (!weekBox || !descriptionBox)
          throw new Error('Schedule or description has no layout box');
        expect(descriptionBox.y).toBeGreaterThanOrEqual(weekBox.y + weekBox.height);
        expect(await split.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true
        );
        await expect(page.getByTestId('no-hours').locator('dt')).toHaveCount(1);
        await expect(page.getByTestId('no-hours').locator('.place-opening-hours-row')).toHaveCount(
          0
        );
      });
    });
  });
}
