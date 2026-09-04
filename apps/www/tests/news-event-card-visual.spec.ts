import { expect, test, type Page } from '@playwright/test';
import {
  expectPaintedContent,
  waitForVisualPaint,
} from './config/visual-content';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

const openFixture = async (
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<void> => {
  await page.setViewportSize(viewport);
  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForVisualPaint(page);
};

test.describe('NewsEventCard visual', () => {
  test('renders desktop coordinates state with map pin', async ({ page }) => {
    await openFixture(page, { width: 1440, height: 1100 });

    const target = page.getByTestId('news-event-card-coordinates');

    await expect(
      target.getByRole('heading', { name: 'Встреча по регламенту' }),
    ).toBeVisible();
    await expect(target.locator('.news-event-map-layer--located')).toHaveCount(
      1,
    );
    await expect(target.locator('.news-event-map-pin')).toHaveCount(1);
    const calendarLink = target.getByRole('link', {
      name: 'Добавить в календарь',
    });

    await expect(calendarLink).toHaveAttribute(
      'href',
      '/news/2026/05/reglament/event.ics',
    );
    await expectPaintedContent(calendarLink);
    await expectPaintedContent(
      target.getByRole('link', { name: 'Открыть на Яндекс Картах' }),
    );

    await expect(target).toHaveScreenshot(
      'news-event-card-coordinates-desktop.png',
      screenshot,
    );
  });

  test('renders desktop location-only fallback state', async ({ page }) => {
    await openFixture(page, { width: 1440, height: 1100 });

    const target = page.getByTestId('news-event-card-location-only');

    await expect(
      target.getByRole('heading', {
        name: 'Обсуждение благоустройства въезда',
      }),
    ).toBeVisible();
    await expect(
      target.locator('.news-event-map-layer--placeholder'),
    ).toHaveCount(1);
    await expect(target.locator('.news-event-map-pin')).toHaveCount(0);
    await expect(
      target.getByRole('link', { name: 'Открыть на Яндекс Картах' }),
    ).toBeVisible();

    await expect(target).toHaveScreenshot(
      'news-event-card-location-only-desktop.png',
      screenshot,
    );
  });

  test('renders mobile coordinates state with map pin', async ({ page }) => {
    await openFixture(page, { width: 390, height: 900 });

    const target = page.getByTestId('news-event-card-coordinates');

    await expect(
      target.getByRole('heading', { name: 'Встреча по регламенту' }),
    ).toBeVisible();
    await expect(target.locator('.news-event-map-layer--located')).toHaveCount(
      1,
    );
    await expect(target.locator('.news-event-map-pin')).toHaveCount(1);
    await expectPaintedContent(
      target.getByRole('link', { name: 'Добавить в календарь' }),
    );
    await expectPaintedContent(
      target.getByRole('link', { name: 'Открыть на Яндекс Картах' }),
    );

    await expect(target).toHaveScreenshot(
      'news-event-card-coordinates-mobile.png',
      screenshot,
    );
  });

  test('renders mobile location-only fallback state', async ({ page }) => {
    await openFixture(page, { width: 390, height: 900 });

    const target = page.getByTestId('news-event-card-location-only');

    await expect(
      target.getByRole('heading', {
        name: 'Обсуждение благоустройства въезда',
      }),
    ).toBeVisible();
    await expect(
      target.locator('.news-event-map-layer--placeholder'),
    ).toHaveCount(1);
    await expect(target.locator('.news-event-map-pin')).toHaveCount(0);

    await expect(target).toHaveScreenshot(
      'news-event-card-location-only-mobile.png',
      screenshot,
    );
  });
});
