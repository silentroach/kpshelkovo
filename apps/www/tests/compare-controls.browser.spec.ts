import { expect, test } from '@playwright/test';

const mobileViewports = [
  { width: 320, height: 760 },
  { width: 390, height: 844 },
] as const;
const desktopViewport = { width: 1440, height: 900 } as const;
const breadcrumbViewports = [
  { name: 'mobile', viewport: { width: 640, height: 844 } },
  { name: 'desktop', viewport: desktopViewport },
] as const;
const explorerControlSelector =
  '[data-testid="explorer-controls"] input, [data-testid="explorer-controls"] button, [data-testid="sort-select"]';
const explorerGraphPattern =
  /\/static\/SettlementsExplorerClient\.[^/]+\.js(?:\?.*)?$/u;
const yandexMapsReadyScript = `
  class YMap {
    constructor(_container, options) {
      this.zoom = options.location.zoom ?? 9;
    }
    addChild() {}
    removeChild() {}
    update() {}
    destroy() {}
  }
  window.ymaps3 = {
    ready: Promise.resolve(),
    YMap,
    YMapDefaultSchemeLayer: class {},
    YMapDefaultFeaturesLayer: class {},
    YMapMarker: class { update() {} },
  };
`;

test.beforeEach(async ({ page }) => {
  await page.route('https://api-maps.yandex.ru/**', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: yandexMapsReadyScript,
    });
  });
});

test('aligns settlement breadcrumbs with the compare index', async ({
  page,
}) => {
  for (const { name, viewport } of breadcrumbViewports) {
    await test.step(name, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/815/compare/', { waitUntil: 'domcontentloaded' });

      const indexBreadcrumbs = page.getByRole('navigation', {
        name: 'Хлебные крошки',
      });
      await expect(indexBreadcrumbs).toBeVisible();
      const indexTop = await indexBreadcrumbs.evaluate(
        (element) => element.getBoundingClientRect().top,
      );

      await page.goto('/815/compare/settlements/shelkovo/', {
        waitUntil: 'domcontentloaded',
      });

      const settlementBreadcrumbs = page.getByRole('navigation', {
        name: 'Хлебные крошки',
      });
      await expect(settlementBreadcrumbs).toBeVisible();
      const settlementTop = await settlementBreadcrumbs.evaluate(
        (element) => element.getBoundingClientRect().top,
      );

      expect(settlementTop).toBeCloseTo(indexTop, 0);
    });
  }
});

test('keeps one settlement list before and after hydration', async ({
  baseURL,
  browser,
  page,
  request,
}) => {
  const noJavaScriptDataRequests: string[] = [];
  const explorerDataRequests: string[] = [];
  const explorerGraphRequests: string[] = [];
  const yandexMapRequests: string[] = [];
  const hydrationMessages: string[] = [];
  const dataResponse = await request.get('/815/compare/data/explorer.json');
  expect(dataResponse.ok()).toBe(true);
  const payload = (await dataResponse.json()) as {
    readonly settlements: readonly unknown[];
  };
  const expectedCount = payload.settlements.length;
  const noJavaScriptContext = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: mobileViewports[1],
  });
  const noJavaScriptPage = await noJavaScriptContext.newPage();
  noJavaScriptPage.on('request', (pageRequest) => {
    if (pageRequest.url().endsWith('/815/compare/data/explorer.json')) {
      noJavaScriptDataRequests.push(pageRequest.url());
    }
  });

  try {
    await noJavaScriptPage.goto('/815/compare/', {
      waitUntil: 'networkidle',
    });

    await expect(noJavaScriptPage.getByTestId('settlement-card')).toHaveCount(
      expectedCount,
    );
    await expect(noJavaScriptPage.locator('#settlements-static')).toHaveCount(
      0,
    );

    const controls = noJavaScriptPage.getByTestId('explorer-controls');
    await expect(controls).toBeVisible();
    const controlElements = noJavaScriptPage.locator(explorerControlSelector);
    await expect(controlElements).toHaveCount(5);
    for (const control of await controlElements.all()) {
      await expect(control).toBeDisabled();
    }
    expect(noJavaScriptDataRequests).toHaveLength(0);
  } finally {
    await noJavaScriptContext.close();
  }

  await page.setViewportSize(mobileViewports[1]);
  page.on('request', (pageRequest) => {
    const url = pageRequest.url();
    if (url.endsWith('/815/compare/data/explorer.json')) {
      explorerDataRequests.push(url);
    }
    if (explorerGraphPattern.test(url)) {
      explorerGraphRequests.push(url);
    }
    if (url.includes('api-maps.yandex.ru')) {
      yandexMapRequests.push(url);
    }
  });
  page.on('console', (message) => {
    if (/hydration|mismatch/iu.test(message.text())) {
      hydrationMessages.push(message.text());
    }
  });
  await page.goto('/815/compare/', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('settlement-card')).toHaveCount(expectedCount);
  const controlElements = page.locator(explorerControlSelector);
  await expect(controlElements).toHaveCount(5);
  for (const control of await controlElements.all()) {
    await expect(control).toBeEnabled();
  }
  expect(explorerDataRequests).toHaveLength(1);
  expect(explorerGraphRequests).toHaveLength(1);
  expect(yandexMapRequests).toHaveLength(0);
  expect(hydrationMessages).toHaveLength(0);
  await expect(
    page.locator('link[rel="preconnect"][href*="api-maps.yandex.ru"]'),
  ).toHaveCount(0);

  await page.getByTestId('map-toggle').click();
  await expect(page.getByTestId('settlement-map')).toBeVisible();
  await expect.poll(() => yandexMapRequests.length).toBe(1);
});

test('keeps SSR cards and retries explorer hydration after a data failure', async ({
  page,
}) => {
  let dataRequests = 0;
  const graphRequests: string[] = [];
  await page.setViewportSize(mobileViewports[1]);
  await page.route('**/815/compare/data/explorer.json', async (route) => {
    dataRequests += 1;
    if (dataRequests === 1) {
      await route.abort('failed');
      return;
    }

    await route.continue();
  });
  page.on('request', (request) => {
    const url = request.url();
    if (explorerGraphPattern.test(url)) graphRequests.push(url);
  });

  await page.goto('/815/compare/', { waitUntil: 'domcontentloaded' });

  expect(await page.getByTestId('settlement-card').count()).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toBeVisible();
  for (const control of await page.locator(explorerControlSelector).all()) {
    await expect(control).toBeDisabled();
  }
  expect(dataRequests).toBe(1);
  await expect.poll(() => graphRequests.length).toBe(1);

  await page.getByRole('button', { name: 'Попробовать снова' }).click();

  for (const control of await page.locator(explorerControlSelector).all()) {
    await expect(control).toBeEnabled();
  }
  await expect(page.getByRole('alert')).toBeHidden();
  expect(dataRequests).toBe(2);
  expect(graphRequests).toHaveLength(1);
});

test('retries repeated production component graph failures with fresh URLs', async ({
  page,
}) => {
  const graphRequests: string[] = [];
  const explorerDataRequests: string[] = [];
  await page.setViewportSize(mobileViewports[1]);
  await page.route(explorerGraphPattern, async (route) => {
    graphRequests.push(route.request().url());
    if (graphRequests.length <= 2) {
      await route.abort('failed');
      return;
    }

    await route.continue();
  });
  page.on('request', (request) => {
    const url = request.url();
    if (url.endsWith('/815/compare/data/explorer.json')) {
      explorerDataRequests.push(url);
    }
  });

  await page.goto('/815/compare/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.getByTestId('settlement-card').count()).toBeGreaterThan(0);
  expect(graphRequests).toHaveLength(1);
  expect(explorerDataRequests).toHaveLength(1);

  await page.getByRole('button', { name: 'Попробовать снова' }).click();

  await expect.poll(() => explorerDataRequests.length).toBe(2);
  await expect.poll(() => graphRequests.length).toBe(2);
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByRole('button', { name: 'Попробовать снова' }).click();

  await expect.poll(() => explorerDataRequests.length).toBe(3);
  await expect.poll(() => graphRequests.length).toBe(3);
  expect(new Set(graphRequests).size).toBe(3);
  expect(
    graphRequests.map(
      (url) => new URL(url).searchParams.get('explorer-retry') ?? 'initial',
    ),
  ).toEqual(['initial', '1', '2']);
  for (const control of await page.locator(explorerControlSelector).all()) {
    await expect(control).toBeEnabled();
  }
  await expect(page.getByRole('alert')).toBeHidden();
});

test('reloads Yandex Maps after its ready promise rejects', async ({
  page,
}) => {
  const componentRequests: string[] = [];
  const explorerDataRequests: string[] = [];
  const yandexMapRequests: string[] = [];
  await page.unroute('https://api-maps.yandex.ru/**');
  await page.route('https://api-maps.yandex.ru/**', async (route) => {
    yandexMapRequests.push(route.request().url());
    await route.fulfill({
      contentType: 'application/javascript',
      body:
        yandexMapRequests.length === 1
          ? `
              const ready = Promise.reject(new Error('Yandex Maps initialization failed'));
              ready.catch(() => {});
              window.ymaps3 = { ready };
            `
          : yandexMapsReadyScript,
    });
  });
  page.on('request', (request) => {
    const url = request.url();
    if (explorerGraphPattern.test(url)) {
      componentRequests.push(url);
    }
    if (url.endsWith('/815/compare/data/explorer.json')) {
      explorerDataRequests.push(url);
    }
  });
  await page.setViewportSize(mobileViewports[1]);

  await page.goto('/815/compare/', { waitUntil: 'networkidle' });

  expect(componentRequests).toHaveLength(1);
  expect(explorerDataRequests).toHaveLength(1);
  expect(yandexMapRequests).toHaveLength(0);

  await page.getByTestId('map-toggle').click();

  await expect(
    page.getByRole('button', { name: 'Попробовать снова' }),
  ).toBeVisible();
  expect(yandexMapRequests).toHaveLength(1);
  expect(componentRequests).toHaveLength(1);
  expect(explorerDataRequests).toHaveLength(1);

  await page.getByRole('button', { name: 'Попробовать снова' }).click();

  await expect.poll(() => yandexMapRequests.length).toBe(2);
  await expect(
    page.getByRole('button', { name: 'Попробовать снова' }),
  ).toHaveCount(0);
  await expect(page.getByText('Загрузка карты...')).toHaveCount(0);
  expect(componentRequests).toHaveLength(1);
  expect(explorerDataRequests).toHaveLength(1);
});

test('hydrates filters and sorting from the shared URL', async ({
  page,
  request,
}) => {
  const dataResponse = await request.get('/815/compare/data/explorer.json');
  const payload = (await dataResponse.json()) as {
    readonly stats: { readonly cheaperCount: number };
  };

  await page.setViewportSize(mobileViewports[1]);
  await page.goto('/815/compare/?sort=tariff_asc&price=cheaper', {
    waitUntil: 'networkidle',
  });

  await expect(page.getByTestId('price-cheaper')).toBeChecked();
  await expect(page.getByTestId('sort-select')).toHaveValue('tariff_asc');
  await expect(page.getByTestId('settlement-card')).toHaveCount(
    payload.stats.cheaperCount,
  );
});

test('keeps the desktop list position through hydration', async ({
  baseURL,
  browser,
  page,
}) => {
  const noJavaScriptContext = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: desktopViewport,
  });
  const noJavaScriptPage = await noJavaScriptContext.newPage();
  let serverListTop: number;

  try {
    await noJavaScriptPage.goto('/815/compare/', {
      waitUntil: 'networkidle',
    });
    serverListTop = await noJavaScriptPage
      .getByTestId('explorer-summary-row')
      .evaluate((element) => element.getBoundingClientRect().top);
  } finally {
    await noJavaScriptContext.close();
  }

  await page.setViewportSize(desktopViewport);
  await page.goto('/815/compare/', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('filtered-map')).toBeVisible();
  const hydratedListTop = await page
    .getByTestId('explorer-summary-row')
    .evaluate((element) => element.getBoundingClientRect().top);

  expect(hydratedListTop).toBeCloseTo(serverListTop, 0);
});

test('keeps every tariff filter usable beside the map button on mobile', async ({
  page,
}) => {
  for (const viewport of mobileViewports) {
    await test.step(`${viewport.width}px`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/815/compare/', { waitUntil: 'networkidle' });

      const controls = page.getByTestId('explorer-controls');
      const filterGroup = controls.getByTestId('price-filter-group');
      const radioControls = [
        [
          controls.getByRole('radio', { name: 'Все', exact: true }),
          controls.locator('[data-testid="price-all"] + label'),
        ],
        [
          controls.getByRole('radio', { name: /^Дешевле/ }),
          controls.locator('[data-testid="price-cheaper"] + label'),
        ],
        [
          controls.getByRole('radio', { name: /^Дороже/ }),
          controls.locator('[data-testid="price-more"] + label'),
        ],
      ] as const;
      const mapButton = controls.getByRole('button', {
        name: 'Показать карту',
      });

      await expect(controls).toBeVisible();
      await expect(filterGroup.locator('label')).toHaveCount(3);
      for (const [radio, label] of radioControls) {
        await expect(radio).toBeEnabled();
        await label.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            label.evaluate((element) => {
              const scroller = element.closest<HTMLElement>(
                '[data-testid="price-filter-group"]',
              );

              if (!scroller) return false;

              const scrollerRect = scroller.getBoundingClientRect();
              const labelRect = element.getBoundingClientRect();
              const tolerance = 1;

              return (
                labelRect.left >= scrollerRect.left - tolerance &&
                labelRect.right <= scrollerRect.right + tolerance
              );
            }),
          )
          .toBe(true);
        await label.click();
        await expect(radio).toBeChecked();
      }
      await expect(mapButton).toBeVisible();
      await expect(mapButton).toBeEnabled();

      const geometry = await controls.evaluate((root) => {
        const tariffFilters = root.querySelector(
          '[data-testid="price-filter-group"]',
        );
        const mapToggle = root.querySelector('[data-testid="map-toggle"]');

        if (!tariffFilters || !mapToggle) {
          throw new Error('Не удалось измерить элементы фильтра тарифов');
        }

        const filterGroupRect = tariffFilters.getBoundingClientRect();
        const filterRects = [...tariffFilters.querySelectorAll('label')].map(
          (label) => label.getBoundingClientRect(),
        );
        const firstFilterRect = filterRects[0];

        if (!firstFilterRect) {
          throw new Error('Не удалось измерить кнопки фильтра тарифов');
        }

        const mapRect = mapToggle.getBoundingClientRect();
        const filterStyle = getComputedStyle(tariffFilters);
        const tolerance = 1;

        return {
          filtersUseHorizontalOverflow:
            filterStyle.overflowX === 'auto' &&
            tariffFilters.scrollWidth > tariffFilters.clientWidth,
          filtersStayOnOneRow: filterRects.every(
            (rect) => Math.abs(rect.top - firstFilterRect.top) <= tolerance,
          ),
          controlsStayOnOneRow:
            Math.abs(filterGroupRect.top - mapRect.top) <= tolerance,
          filterViewportOverlapsMap:
            filterGroupRect.right > mapRect.left + tolerance,
          mapOutsideViewport:
            mapRect.left < -tolerance ||
            mapRect.right > window.innerWidth + tolerance,
          pageHasHorizontalOverflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + tolerance,
        };
      });

      expect(geometry).toEqual({
        filtersUseHorizontalOverflow: true,
        filtersStayOnOneRow: true,
        controlsStayOnOneRow: true,
        filterViewportOverlapsMap: false,
        mapOutsideViewport: false,
        pageHasHorizontalOverflow: false,
      });
    });
  }
});
