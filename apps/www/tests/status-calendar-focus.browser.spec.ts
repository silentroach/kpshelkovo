import { expect, type Page, test } from '@playwright/test';

const dayId = '2026-08-26';
const monthPath = '/status/calendar/2026/08/';
const dayPath = `${monthPath}#${dayId}`;
const yearPath = '/status/calendar/2026/';

const trackCalendarMinuteTimers = (page: Page): Promise<void> =>
  page.addInitScript(() => {
    const minuteTimers = new Set<number>();
    const setInterval = window.setInterval.bind(window);
    const clearInterval = window.clearInterval.bind(window);

    window.setInterval = ((
      handler: TimerHandler,
      timeout?: number,
      ...arguments_: readonly unknown[]
    ): number => {
      const timer = setInterval(handler, timeout, ...arguments_);

      if (timeout === 60_000) {
        minuteTimers.add(timer);
      }

      return timer;
    }) as typeof window.setInterval;
    window.clearInterval = ((timer?: number): void => {
      if (timer !== undefined) {
        minuteTimers.delete(timer);
      }

      clearInterval(timer);
    }) as typeof window.clearInterval;
    Object.defineProperty(window, '__statusCalendarLifecycleTest', {
      value: {
        activeMinuteTimerCount: (): number => minuteTimers.size,
      },
    });
  });

const activeMinuteTimerCount = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      (
        window as Window & {
          readonly __statusCalendarLifecycleTest?: {
            readonly activeMinuteTimerCount: () => number;
          };
        }
      ).__statusCalendarLifecycleTest?.activeMinuteTimerCount() ?? -1,
  );

const calendarListenerWork = (
  page: Page,
): Promise<{
  readonly escapeQueries: number;
  readonly tooltipLookups: number;
}> =>
  page.evaluate(() => {
    const tooltipRootSelector = '[data-status-calendar-tooltip-root]';
    const openTooltipSelector = `${tooltipRootSelector}[data-status-calendar-tooltip-open]`;
    const closest = Element.prototype.closest;
    const querySelectorAll = document.querySelectorAll.bind(document);
    let escapeQueries = 0;
    let tooltipLookups = 0;

    Element.prototype.closest = function (selector: string): Element | null {
      if (selector === tooltipRootSelector) {
        tooltipLookups += 1;
      }

      return closest.call(this, selector);
    };
    document.querySelectorAll = ((selector: string) => {
      if (selector === openTooltipSelector) {
        escapeQueries += 1;
      }

      return querySelectorAll(selector);
    }) as typeof document.querySelectorAll;

    try {
      const target =
        document.querySelector('[data-status-calendar-day-link]') ??
        document.body;
      target.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      );
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      );

      return { escapeQueries, tooltipLookups };
    } finally {
      Element.prototype.closest = closest;
      document.querySelectorAll = querySelectorAll;
    }
  });

const expectCalendarLifecycle = async (
  page: Page,
  expectedWorkCount: number,
): Promise<void> => {
  await expect.poll(() => activeMinuteTimerCount(page)).toBe(expectedWorkCount);
  expect(await calendarListenerWork(page)).toEqual({
    escapeQueries: expectedWorkCount,
    tooltipLookups: expectedWorkCount,
  });
};

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`opens a calendar day and returns to status on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/status/', { waitUntil: 'networkidle' });

    const entry = page.locator('[data-status-calendar-entry]');
    const entryHref = await entry.getAttribute('href');
    if (!entryHref) {
      throw new Error('Expected status calendar entry URL');
    }
    const calendarYear = new URL(entryHref, page.url()).pathname.match(
      /^\/status\/calendar\/(\d{4})\/$/,
    )?.[1];
    if (!calendarYear) {
      throw new Error('Expected a year status calendar entry URL');
    }
    const calendarHeading = `Проблемы и плановые работы за ${calendarYear} год`;

    await expect(entry).toHaveAccessibleName(calendarHeading);

    await entry.click();
    await page.waitForURL(entryHref);

    let dayLink = page.locator('[data-status-calendar-day-link]').first();
    if ((await dayLink.count()) === 0) {
      await page.locator('a[data-status-calendar-previous]').click();
      dayLink = page.locator('[data-status-calendar-day-link]').first();
    }

    const href = await dayLink.getAttribute('href');
    if (!href) {
      throw new Error('Expected an affected calendar day URL');
    }
    const targetId = new URL(href, page.url()).hash.slice(1);

    await dayLink.click();
    await page.waitForURL(href);
    await expect(page.locator(`h2[id="${targetId}"]`)).toBeFocused();

    await page
      .getByRole('navigation', { name: 'Хлебные крошки' })
      .getByRole('link', { name: 'Статус', exact: true })
      .click();
    await page.waitForURL('/status/');

    const calendarView = page.locator('[data-status-calendar-entry]');
    await expect(calendarView).toHaveAccessibleName(calendarHeading);
    await expect(calendarView).toHaveAttribute('href', entryHref);
    await calendarView.click();
    await page.waitForURL(entryHref);
  });
}

const trackCalendarFocus = (page: Page): Promise<void> =>
  page.addInitScript(() => {
    const focus = HTMLElement.prototype.focus;

    HTMLElement.prototype.focus = function (options?: FocusOptions): void {
      if (this.matches('[data-status-calendar-day] > h2')) {
        document.documentElement.dataset.statusCalendarFocusOptions =
          JSON.stringify(options ?? {});
      }

      focus.call(this, options);
    };
  });

const expectFocusedDay = async (page: Page): Promise<void> => {
  await expect(page.locator(`[id="${dayId}"]`)).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute(
    'data-status-calendar-focus-options',
    '{"preventScroll":true}',
  );
};

test('focuses an initial day deep link without hiding it under the sticky header', async ({
  page,
}) => {
  await trackCalendarFocus(page);
  await page.goto(dayPath, { waitUntil: 'networkidle' });

  await expectFocusedDay(page);

  const day = page.locator(`[data-status-calendar-day="${dayId}"]`);
  const targetPresentation = await day.evaluate((section) => {
    const heading = section.querySelector('h2');
    const header = document.querySelector('.site-header');
    const firstDay = document.querySelector('[data-status-calendar-day]');
    const style = getComputedStyle(section);

    if (!heading || !header || !firstDay) {
      throw new Error('Expected calendar days and site header');
    }

    const headingStyle = getComputedStyle(heading);
    const dayDividerWidths = [
      ...document.querySelectorAll(
        '[data-status-calendar-day]:not(:first-child)',
      ),
    ].map((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopWidth),
    );
    const recordDividerWidths = [
      ...document.querySelectorAll('.status-calendar-day-records > article'),
    ].map((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopWidth),
    );

    return {
      headingTop: heading.getBoundingClientRect().top,
      headingWidth: heading.getBoundingClientRect().width,
      headerBottom: header.getBoundingClientRect().bottom,
      sectionWidth: section.getBoundingClientRect().width,
      sectionOutlineStyle: style.outlineStyle,
      headingOutlineStyle: headingStyle.outlineStyle,
      headingOutlineWidth: Number.parseFloat(headingStyle.outlineWidth),
      firstDayBorderTopWidth: Number.parseFloat(
        getComputedStyle(firstDay).borderTopWidth,
      ),
      dayDividerWidths,
      recordDividerWidths,
    };
  });

  expect(targetPresentation.headingTop).toBeGreaterThan(
    targetPresentation.headerBottom,
  );
  expect(targetPresentation.sectionOutlineStyle).toBe('none');
  expect(targetPresentation.headingOutlineStyle).not.toBe('none');
  expect(targetPresentation.headingOutlineWidth).toBeGreaterThanOrEqual(2);
  expect(targetPresentation.headingWidth).toBeLessThan(
    targetPresentation.sectionWidth,
  );
  expect(targetPresentation.firstDayBorderTopWidth).toBe(0);
  expect(new Set(targetPresentation.dayDividerWidths)).toEqual(new Set([1]));
  expect(new Set(targetPresentation.recordDividerWidths)).toEqual(new Set([0]));
});

test('restores day focus after a client transition, Back, and Forward', async ({
  page,
}) => {
  await trackCalendarFocus(page);
  await page.goto(yearPath, { waitUntil: 'networkidle' });
  const initialHistoryLength = await page.evaluate(() => history.length);

  const dayLink = page.locator(`[data-status-calendar-day-link="${dayId}"]`);
  await dayLink.focus();
  await expect(dayLink).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(dayPath);
  await expectFocusedDay(page);
  expect(await page.evaluate(() => history.length)).toBe(
    initialHistoryLength + 1,
  );

  const scrollPosition = await page.evaluate((targetId) => {
    const brand = document.querySelector<HTMLElement>('.site-header-brand');

    if (!brand) {
      throw new Error('Expected site brand');
    }

    brand.focus({ preventScroll: true });
    window.scrollTo(0, document.body.scrollHeight);
    const before = window.scrollY;
    document.dispatchEvent(new Event('astro:page-load'));

    return {
      before,
      after: window.scrollY,
      targetFocused: document.activeElement?.id === targetId,
    };
  }, dayId);

  expect(scrollPosition.after).toBe(scrollPosition.before);
  expect(scrollPosition.targetFocused).toBe(true);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await page.waitForURL('/');

  await page.goBack();
  await page.waitForURL(dayPath);
  await expectFocusedDay(page);

  await page.goBack();
  await page.waitForURL(yearPath);
  await page.goForward();
  await page.waitForURL(dayPath);
  await expectFocusedDay(page);
});

test('scopes year calendar listeners and timer to client route lifecycle', async ({
  page,
}) => {
  await trackCalendarMinuteTimers(page);
  await page.goto(yearPath, { waitUntil: 'networkidle' });

  await expectCalendarLifecycle(page, 1);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await page.waitForURL('/');

  await expectCalendarLifecycle(page, 0);

  await page.goBack();
  await page.waitForURL(yearPath);

  await expectCalendarLifecycle(page, 1);
});

test('does not intercept focus for absent, malformed, or missing day hashes', async ({
  page,
}) => {
  await trackCalendarFocus(page);

  for (const hash of ['', '#not-a-day', '#2099-12-31']) {
    await page.goto(yearPath, { waitUntil: 'networkidle' });
    await page.evaluate(
      ({ href, marker }) => {
        const link = document.createElement('a');
        link.href = href;
        link.dataset.invalidCalendarLink = marker;
        link.textContent = 'Test link';
        document.body.append(link);
      },
      { href: `${monthPath}${hash}`, marker: hash || 'absent' },
    );

    await page.locator('[data-invalid-calendar-link]').click();
    await page.waitForURL(`${monthPath}${hash}`);

    expect(
      await page.evaluate(
        () =>
          document.activeElement?.matches('[data-status-calendar-day] > h2') ??
          false,
      ),
    ).toBe(false);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-status-calendar-focus-options',
    );
  }
});

test('keeps native anchor navigation and target presentation without JavaScript', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(yearPath, { waitUntil: 'networkidle' });
    await page.locator(`[data-status-calendar-day-link="${dayId}"]`).click();
    await page.waitForURL(dayPath);

    const heading = page.locator(`[id="${dayId}"]`);
    const day = page.locator(`[data-status-calendar-day="${dayId}"]`);
    await expect(heading).toBeVisible();
    await expect(day).toBeVisible();

    const position = await heading.evaluate((element) => ({
      top: element.getBoundingClientRect().top,
      headerBottom:
        document.querySelector('.site-header')?.getBoundingClientRect()
          .bottom ?? 0,
    }));
    const targetPresentation = await day.evaluate((element) => {
      const style = getComputedStyle(element);
      const nextDay = element.nextElementSibling;

      return {
        background: style.backgroundColor,
        nextDayBackground: nextDay
          ? getComputedStyle(nextDay).backgroundColor
          : undefined,
        outlineStyle: style.outlineStyle,
      };
    });

    expect(position.top).toBeGreaterThan(position.headerBottom);
    expect(targetPresentation.background).not.toBe(
      targetPresentation.nextDayBackground,
    );
    expect(targetPresentation.outlineStyle).toBe('none');
  } finally {
    await context.close();
  }
});
