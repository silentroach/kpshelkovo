import { expect, test, type Locator, type Page } from '@playwright/test';

const desktopViewport = { width: 1440, height: 1200 } as const;
const mobileViewport = { width: 320, height: 900 } as const;
const viewportCases = [
  ['mobile', mobileViewport],
  ['desktop', desktopViewport],
] as const;
const denseDateTargets = [
  {
    id: 'electricity-outage-2026-08-06',
    path: '/status/incidents/2026/08/electricity-outage-2026-08-06/',
  },
  {
    id: 'electricity-river-outage-2026-08-10',
    path: '/status/incidents/2026/08/electricity-river-outage-2026-08-10/',
  },
  {
    id: 'electricity-outage-2026-08-11',
    path: '/status/incidents/2026/08/electricity-outage-2026-08-11/',
  },
] as const;
const denseDateSsrLayout = {
  offsets: [
    { id: denseDateTargets[0].id, offset: '-24px' },
    { id: denseDateTargets[1].id, offset: '0px' },
    { id: denseDateTargets[2].id, offset: '24px' },
  ],
  space: '24px',
} as const;
const denseDateDesktopLayout = {
  offsets: [
    { id: denseDateTargets[0].id, offset: '' },
    { id: denseDateTargets[1].id, offset: '-12px' },
    { id: denseDateTargets[2].id, offset: '12px' },
  ],
  space: '12px',
} as const;

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

const fixtureUrl = 'http://127.0.0.1:4324/';

const openFixture = async (page: Page): Promise<void> => {
  await page.setViewportSize(desktopViewport);
  expect(page.viewportSize()).toEqual(desktopViewport);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('status-timeline-visual')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.locator('[data-status-problem]').first().hover();
  await expect(
    page.locator('[data-status-problem][data-status-tooltip-bound="true"]'),
  ).toHaveCount(7);
  await page.mouse.move(0, 0);
};

const openTimelineTooltip = async (
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
};

const openDenseDateTimeline = async (
  page: Page,
  hydrate: boolean,
): Promise<Locator> => {
  await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
  const target = page.getByTestId('status-timeline-dense-dates');

  await expect(target).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  if (hydrate) {
    await target.locator('[data-status-problem]').first().hover();
    await expect(
      target.locator('[data-status-problem][data-status-tooltip-bound="true"]'),
    ).toHaveCount(denseDateTargets.length);
    await page.mouse.move(0, 0);
  }

  return target;
};

const readDenseDateLayout = async (target: Locator) =>
  target.locator('[data-status-timeline]').evaluate((root) => {
    if (!(root instanceof HTMLElement)) {
      throw new Error('Dense timeline root must be an HTML element');
    }

    return {
      offsets: Array.from(
        root.querySelectorAll<HTMLElement>(
          '[data-status-problem]:not([hidden])',
        ),
      ).map((segment) => ({
        id: segment.dataset.incidentId,
        offset: segment.style.getPropertyValue('--segment-lane-offset'),
      })),
      space: root.style.getPropertyValue('--timeline-lane-space'),
    };
  });

const assertDenseDateHitAreas = async (target: Locator): Promise<void> => {
  await target.scrollIntoViewIfNeeded();
  const track = target.locator('[data-status-timeline-track]');
  const trackBox = await track.boundingBox();

  if (!trackBox) {
    throw new Error('Dense timeline track must be visible');
  }

  expect(trackBox.width).toBeGreaterThanOrEqual(255.9);

  const metrics = await target
    .locator('[data-status-problem]:visible')
    .evaluateAll((segments) =>
      segments.map((segment) => {
        const rect = segment.getBoundingClientRect();
        const centerTarget = document
          .elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          )
          ?.closest('[data-status-problem]');

        return {
          centerId:
            centerTarget instanceof HTMLElement
              ? centerTarget.dataset.incidentId
              : undefined,
          height: rect.height,
          href: segment.getAttribute('href'),
          id:
            segment instanceof HTMLElement
              ? segment.dataset.incidentId
              : undefined,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      }),
    );

  expect(metrics).toHaveLength(denseDateTargets.length);

  metrics.forEach((metric, index) => {
    const expected = denseDateTargets[index];

    expect(metric.id).toBe(expected.id);
    expect(metric.href).toBe(expected.path);
    expect(metric.centerId).toBe(expected.id);
    expect(metric.width).toBeGreaterThanOrEqual(23.9);
    expect(metric.height).toBeGreaterThanOrEqual(23.9);
  });

  metrics.forEach((first, firstIndex) => {
    metrics.slice(firstIndex + 1).forEach((second) => {
      const overlaps =
        first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y;

      expect(overlaps, `${first.id} overlaps ${second.id}`).toBe(false);
    });
  });
};

const clickDenseDateTargetCenters = async (
  page: Page,
  hydrate: boolean,
): Promise<void> => {
  for (const expected of denseDateTargets) {
    const target = await openDenseDateTimeline(page, hydrate);
    const segment = target.locator(`[data-incident-id="${expected.id}"]`);
    const box = await segment.boundingBox();

    if (!box) {
      throw new Error(`Timeline marker ${expected.id} must be visible`);
    }

    await segment.click({
      position: { x: box.width / 2, y: box.height / 2 },
    });
    expect(new URL(page.url()).pathname).toBe(expected.path);
  }
};

for (const [name, viewport] of viewportCases) {
  test(`keeps dense SSR targets separate on ${name}`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport,
    });
    const page = await context.newPage();

    try {
      const target = await openDenseDateTimeline(page, false);

      await assertDenseDateHitAreas(target);
      await clickDenseDateTargetCenters(page, false);
    } finally {
      await context.close();
    }
  });

  test(`keeps dense hydrated targets separate on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const target = await openDenseDateTimeline(page, true);

    await assertDenseDateHitAreas(target);
    await clickDenseDateTargetCenters(page, true);
  });

  test(`uses measured lanes after first hydration on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const target = await openDenseDateTimeline(page, false);

    expect(await readDenseDateLayout(target)).toEqual(denseDateSsrLayout);

    await target.locator('[data-status-problem]').first().hover();
    await expect(
      target.locator('[data-status-problem][data-status-tooltip-bound="true"]'),
    ).toHaveCount(denseDateTargets.length);

    expect(await readDenseDateLayout(target)).toEqual(
      name === 'desktop' ? denseDateDesktopLayout : denseDateSsrLayout,
    );
  });
}

test('reflows dense hydrated targets after resize', async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  let target = await openDenseDateTimeline(page, true);

  expect(await readDenseDateLayout(target)).toEqual(denseDateDesktopLayout);
  await assertDenseDateHitAreas(target);
  await page.setViewportSize(mobileViewport);
  target = page.getByTestId('status-timeline-dense-dates');
  await expect
    .poll(() =>
      target.locator('[data-status-problem]:visible').evaluateAll((segments) =>
        segments.flatMap((first, firstIndex) => {
          const firstRect = first.getBoundingClientRect();

          return segments.slice(firstIndex + 1).flatMap((second) => {
            const secondRect = second.getBoundingClientRect();
            const overlaps =
              firstRect.left < secondRect.right &&
              firstRect.right > secondRect.left &&
              firstRect.top < secondRect.bottom &&
              firstRect.bottom > secondRect.top;

            return overlaps ? ['overlap'] : [];
          });
        }),
      ),
    )
    .toEqual([]);
  await expect
    .poll(() => readDenseDateLayout(target))
    .toEqual(denseDateSsrLayout);
  await assertDenseDateHitAreas(target);
});

test('repositions an open tooltip after desktop-to-mobile resize', async ({
  page,
}) => {
  await page.setViewportSize(desktopViewport);
  const target = await openDenseDateTimeline(page, true);
  const timeline = target.locator('[data-status-timeline]');
  const trigger = target.locator(
    '[data-incident-id="electricity-outage-2026-08-11"]',
  );
  const tooltip = target.locator('[data-status-timeline-tooltip]');

  await trigger.focus();
  await expect(tooltip).toBeVisible();
  const desktopPosition = await tooltip.evaluate((element) =>
    element instanceof HTMLElement ? element.style.left : '',
  );

  await page.setViewportSize(mobileViewport);
  await expect
    .poll(() =>
      tooltip.evaluate((element) =>
        element instanceof HTMLElement ? element.style.left : '',
      ),
    )
    .not.toBe(desktopPosition);
  await expect
    .poll(async () => {
      const box = await tooltip.boundingBox();

      if (!box) {
        return undefined;
      }

      return {
        anchored:
          (await trigger.getAttribute('aria-describedby')) ===
          (await tooltip.getAttribute('id')),
        open:
          (await timeline.getAttribute('data-status-tooltip-open')) === 'true',
        withinViewport:
          box.x >= -0.1 && box.x + box.width <= mobileViewport.width + 0.1,
      };
    })
    .toEqual({ anchored: true, open: true, withinViewport: true });
});

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

    await expect(target.locator('[data-status-segment="green"]')).toHaveCount(
      3,
    );

    await openTimelineTooltip(target, 'mixed-incident');

    await expect(target).toHaveScreenshot(
      'status-timeline-mixed-tooltip.png',
      screenshot,
    );
  });

  test('renders a full green bar when there are no incidents', async ({
    page,
  }) => {
    const target = page.getByTestId('status-timeline-empty');

    await expect(target.locator('[data-status-segment="green"]')).toHaveCount(
      1,
    );
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

    await openTimelineTooltip(target, 'dense-incident-1');

    await expect(target).toHaveScreenshot(
      'status-timeline-dense-problems-tooltip.png',
      screenshot,
    );
  });
});
