import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  expectPaintedContent,
  waitForVisualPaint,
} from './config/visual-content';

const desktopViewport = { width: 1440, height: 1200 } as const;

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

const openFixture = async (page: Page): Promise<void> => {
  await page.setViewportSize(desktopViewport);
  expect(page.viewportSize()).toEqual(desktopViewport);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('status-timeline-visual')).toBeVisible();
  await waitForVisualPaint(page);
};

const openTimelineTooltip = async (
  page: Page,
  target: Locator,
  incidentId: string,
): Promise<void> => {
  await target.locator(`[data-incident-id="${incidentId}"]`).hover();

  const tooltip = target.locator('[data-status-timeline-tooltip]');

  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  await expect(
    target.locator('[data-status-timeline][data-status-tooltip-open="true"]'),
  ).toHaveCount(1);
  await waitForVisualPaint(page);
  await expectPaintedContent(
    tooltip.locator('.status-service-timeline__tooltip-title:visible').first(),
  );
  await expectPaintedContent(
    tooltip.locator('.status-service-timeline__tooltip-row:visible').first(),
  );
};

test.describe('StatusServiceTimeline visual', () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test('keeps problem segments touch-friendly while the visible marker stays compact', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-dense-problems');

    const metrics = await target
      .locator('[data-status-problem]')
      .evaluateAll((segments) =>
        segments.map((segment) => {
          const root = segment.closest('[data-status-timeline]');
          const track = root?.querySelector('[data-status-timeline-track]');
          const rect = segment.getBoundingClientRect();
          const marker = segment
            .querySelector('.status-service-timeline__segment-marker')
            ?.getBoundingClientRect();
          const trackWidth = track?.getBoundingClientRect().width ?? 0;
          const rangeDays = Number(
            root instanceof HTMLElement ? root.dataset.rangeDays : '',
          );

          return {
            dayWidth: rangeDays > 0 ? trackWidth / rangeDays : 0,
            height: rect.height,
            markerHeight: marker?.height ?? 0,
            markerWidth: marker?.width ?? 0,
            width: rect.width,
          };
        }),
      );

    expect(metrics).not.toHaveLength(0);
    for (const metric of metrics) {
      expect(metric.width).toBeGreaterThanOrEqual(23.9);
      expect(metric.height).toBeGreaterThanOrEqual(23.9);
      expect(metric.markerHeight).toBeLessThanOrEqual(12);
      expect(metric.markerWidth).toBeGreaterThanOrEqual(10);
      expect(metric.markerWidth).toBeLessThanOrEqual(metric.dayWidth * 1.05);
    }

    const shortActiveMetric = await page
      .getByTestId('status-timeline-active-edge')
      .locator('[data-status-problem]')
      .evaluate((segment) => {
        const root = segment.closest('[data-status-timeline]');
        const track = root?.querySelector('[data-status-timeline-track]');
        const rect = segment.getBoundingClientRect();
        const marker = segment
          .querySelector('.status-service-timeline__segment-marker')
          ?.getBoundingClientRect();
        const trackWidth = track?.getBoundingClientRect().width ?? 0;
        const rangeDays = Number(
          root instanceof HTMLElement ? root.dataset.rangeDays : '',
        );

        return {
          dayWidth: rangeDays > 0 ? trackWidth / rangeDays : 0,
          markerWidth: marker?.width ?? 0,
          width: rect.width,
        };
      });

    expect(shortActiveMetric.width).toBeGreaterThanOrEqual(23.9);
    expect(shortActiveMetric.markerWidth).toBeGreaterThanOrEqual(10);
    expect(shortActiveMetric.markerWidth).toBeLessThanOrEqual(
      shortActiveMetric.dayWidth * 1.05,
    );
  });

  test('renders mixed timeline with hydrated green gaps and open tooltip', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-mixed');

    await openTimelineTooltip(page, target, 'mixed-incident');

    await expect(target.locator('[data-status-segment="green"]')).toHaveCount(
      3,
    );

    await expect(target).toHaveScreenshot(
      'status-timeline-mixed-tooltip.png',
      screenshot,
    );
  });

  test('renders a full green bar when there are no incidents', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-empty');

    await expect(target.locator('[data-status-problem]')).toHaveCount(0);

    await expect(target).toHaveScreenshot(
      'status-timeline-empty.png',
      screenshot,
    );
  });

  test('keeps a short active incident fully visible at the right edge', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-active-edge');

    await expect(target.locator('[data-status-problem]')).toHaveCount(1);

    await expect(target).toHaveScreenshot(
      'status-timeline-active-edge.png',
      screenshot,
    );
  });

  test('groups dense problem segments near the right edge', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-dense-problems');

    await expect(target.locator('[data-status-problem]')).toHaveCount(1);

    await expect(target).toHaveScreenshot(
      'status-timeline-dense-problems.png',
      screenshot,
    );
  });

  test('renders grouped tooltip rows with the same typography pattern', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-dense-problems');

    await openTimelineTooltip(page, target, 'dense-incident-1');
    await expectPaintedContent(
      target
        .locator('.status-service-timeline__tooltip-title')
        .filter({ hasText: 'Текущее отключение' }),
    );

    await expect(target).toHaveScreenshot(
      'status-timeline-dense-problems-tooltip.png',
      screenshot,
    );
  });
});
