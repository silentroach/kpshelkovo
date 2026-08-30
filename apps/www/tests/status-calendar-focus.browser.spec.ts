import { expect, type Page, test } from '@playwright/test';

const dayId = '2026-08-26';
const monthPath = '/status/calendar/2026/08/';
const dayPath = `${monthPath}#${dayId}`;
const yearPath = '/status/calendar/2026/';

const calendarListenerWork = (page: Page) =>
  page.evaluate(() => {
    const querySelector = document.querySelector.bind(document);
    let navigationQueries = 0;

    document.querySelector = ((selector: string) => {
      if (selector === '[data-status-calendar-year]') {
        navigationQueries += 1;
      }

      return querySelector(selector);
    }) as typeof document.querySelector;
    document.dispatchEvent(new Event('astro:page-load'));
    document.querySelector = querySelector;

    const link = document.querySelector('[data-status-calendar-day-link]');
    const root = link?.closest('[data-status-calendar-tooltip-root]');
    const tooltip = root?.querySelector<HTMLElement>(
      '[data-status-calendar-tooltip]',
    );
    if (!(link instanceof HTMLElement) || !root || !tooltip) {
      throw new Error('Expected an interactive year calendar day');
    }

    let positionCalls = 0;
    tooltip.getBoundingClientRect = () => {
      positionCalls += 1;

      return { left: 20, right: 200 } as DOMRect;
    };
    link.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );

    return {
      navigationQueries,
      opened: root.hasAttribute('data-status-calendar-tooltip-open'),
      positionCalls,
    };
  });

const calendarWorkOutsideRoute = (page: Page) =>
  page.evaluate(() => {
    const root = document.createElement('span');
    const button = document.createElement('button');

    root.dataset.statusCalendarTooltipRoot = '';
    root.dataset.statusCalendarTooltipSummary = 'Обычная страница';
    root.innerHTML = `
      <span aria-hidden="true" data-status-calendar-tooltip>
        <span data-status-calendar-tooltip-text>Fallback</span>
      </span>
    `;
    button.type = 'button';
    root.prepend(button);
    document.body.append(root);

    const querySelector = document.querySelector.bind(document);
    let navigationQueries = 0;

    document.querySelector = ((selector: string) => {
      if (selector === '[data-status-calendar-year]') {
        navigationQueries += 1;
      }

      return querySelector(selector);
    }) as typeof document.querySelector;

    try {
      button.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      );
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      const openedByPointerOrFocus = root.hasAttribute(
        'data-status-calendar-tooltip-open',
      );

      root.setAttribute('data-status-calendar-tooltip-open', '');
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      );
      document.dispatchEvent(new Event('astro:page-load'));

      return {
        navigationQueries,
        interactions: {
          keptOpenAfterEscape: root.hasAttribute(
            'data-status-calendar-tooltip-open',
          ),
          openedByPointerOrFocus,
        },
      };
    } finally {
      document.querySelector = querySelector;
    }
  });

const expectCalendarLifecycle = async (page: Page): Promise<void> => {
  await expect(page.locator('status-year-calendar-lifecycle')).toHaveCount(1);
  await expect(
    page.locator('[data-status-calendar-year] [data-status-calendar-today]'),
  ).toHaveCount(1);
  expect(await calendarListenerWork(page)).toEqual({
    navigationQueries: 0,
    opened: true,
    positionCalls: 1,
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

test('scopes year calendar work to its custom element lifecycle', async ({
  page,
}) => {
  await page.goto('/status/', { waitUntil: 'networkidle' });
  await page
    .locator(`[data-status-calendar-entry][href="${yearPath}"]`)
    .click();
  await page.waitForURL(yearPath);

  await expectCalendarLifecycle(page);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await page.waitForURL('/');

  expect(await calendarWorkOutsideRoute(page)).toEqual({
    navigationQueries: 0,
    interactions: {
      keptOpenAfterEscape: true,
      openedByPointerOrFocus: false,
    },
  });

  await page.goBack();
  await page.waitForURL(yearPath);
  await expectCalendarLifecycle(page);

  await page.reload({ waitUntil: 'networkidle' });
  await expectCalendarLifecycle(page);
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
