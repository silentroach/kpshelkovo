import { expect, test, type Locator, type Page } from '@playwright/test';

import { expectPaintedContent, waitForVisualPaint } from './config/visual-content';

const desktopViewport = { width: 1440, height: 1200 } as const;

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device'
} as const;

const openTimelineDay = async (page: Page, target: Locator, date: string): Promise<Locator> => {
  await expect(target.getByRole('slider')).toBeVisible();
  const cell = target.locator(`[data-timeline-view="desktop"] [data-day="${date}"]`);
  await cell.scrollIntoViewIfNeeded();
  const rect = await cell.boundingBox();
  if (!rect) throw new Error(`Day ${date} is not visible`);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(cell).toHaveAttribute('data-selected', '');
  const balloon = target.getByRole('dialog');
  await expect(balloon).toBeVisible();
  await waitForVisualPaint(page);
  await expect(balloon.locator('[data-timeline-balloon-title]')).toBeVisible();
  return balloon;
};

test.describe('StatusServiceTimeline visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('status-timeline-visual')).toBeVisible();
    await waitForVisualPaint(page);
  });

  test('selects adjacent days independently by pointer and keyboard', async ({ page }) => {
    const target = page.getByTestId('status-timeline-mixed');
    for (const date of ['2026-05-05', '2026-05-06', '2026-05-07']) {
      const balloon = await openTimelineDay(page, target, date);
      await expect(balloon.getByRole('link')).toHaveCount(date === '2026-05-06' ? 1 : 0);
    }
    const control = target.getByRole('slider');
    await control.press('ArrowLeft');
    await expect(target.locator('[data-selected]')).toHaveAttribute('data-day', '2026-05-06');
    await expect(target.getByRole('dialog').getByRole('link')).toHaveAttribute(
      'href',
      '/status/water/#mixed-incident'
    );
    await control.press('Escape');
    await expect(target.getByRole('dialog')).toHaveCount(0);
  });

  test('renders 90 daily cells with incident and maintenance days and their balloon', async ({
    page
  }) => {
    const target = page.getByTestId('status-timeline-mixed');
    const days = target.locator('[data-timeline-view="desktop"] [data-day]');
    await expect(days).toHaveCount(90);
    await expect(target.locator('[data-timeline-view="desktop"] [data-tone="green"]')).toHaveCount(
      88
    );
    await expect(
      target.locator('[data-timeline-view="desktop"] [data-day="2026-05-02"]')
    ).toHaveAttribute('data-tone', 'amber');
    await expect(
      target.locator('[data-timeline-view="desktop"] [data-day="2026-05-06"]')
    ).toHaveAttribute('data-tone', 'red');
    await expect(target).toHaveScreenshot('status-timeline-mixed.png', screenshot);

    const balloon = await openTimelineDay(page, target, '2026-05-06');
    await expectPaintedContent(balloon.getByRole('link'));
    await expect(balloon).toHaveScreenshot('status-timeline-mixed-balloon.png', screenshot);
  });

  test('renders a full green daily grid when there are no incidents', async ({ page }) => {
    const target = page.getByTestId('status-timeline-empty');
    await expect(target.locator('[data-timeline-view="desktop"] [data-tone="green"]')).toHaveCount(
      90
    );
    await expect(target).toHaveScreenshot('status-timeline-empty.png', screenshot);
  });

  test('keeps a short active incident in the last day', async ({ page }) => {
    const target = page.getByTestId('status-timeline-active-edge');
    await expect(target.locator('[data-timeline-view="desktop"] [data-tone="red"]')).toHaveCount(1);
    const lastDay = target.locator('[data-timeline-view="desktop"] [data-day]').last();
    await expect(lastDay).toHaveAttribute('data-day', '2026-05-10');
    await expect(lastDay).toHaveAttribute('data-tone', 'red');
    await expect(target).toHaveScreenshot('status-timeline-active-edge.png', screenshot);
  });

  test('groups same-day events in a 30-day summary and shows every link', async ({ page }) => {
    const target = page.getByTestId('status-timeline-dense-problems');
    await expect(target.locator('[data-timeline-view="desktop"] [data-day]')).toHaveCount(30);
    await expect(target.locator('[data-timeline-view="desktop"] [data-tone="red"]')).toHaveCount(1);
    await expect(target).toHaveScreenshot('status-timeline-dense-problems.png', screenshot);

    const balloon = await openTimelineDay(page, target, '2026-05-10');
    await expect(balloon.getByRole('link')).toHaveCount(4);
    await expectPaintedContent(balloon.getByRole('link', { name: 'Текущее отключение' }));
    await expect(balloon).toHaveScreenshot(
      'status-timeline-dense-problems-balloon.png',
      screenshot
    );
    await balloon.getByRole('button').click();
    await expect(target.getByRole('slider')).toBeFocused();
  });

  test('shows a passive 30-day grid on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const target = page.getByTestId('status-timeline-mixed');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390
    );
    await expect(target.getByRole('slider')).toHaveCount(0);
    await expect(target.locator('[data-timeline-view="mobile"] [data-day]')).toHaveCount(30);
    await target.locator('[data-timeline-view="mobile"] [data-day="2026-05-06"]').click();
    await expect(target.getByRole('dialog')).toHaveCount(0);
    await expect(target).toHaveScreenshot('status-timeline-mobile.png', screenshot);
  });
});
