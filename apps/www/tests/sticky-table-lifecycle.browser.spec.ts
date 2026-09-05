import { expect, test, type Locator, type Page } from '@playwright/test';

const stickyTableSelector = '[data-ui-sticky-table-shell]';
const browserSessionKey = '__stickyTableBrowserSession';
const scrollListenerCountKey = '__stickyTableScrollListenerCount';
const resizeListenerCountKey = '__stickyTableResizeListenerCount';
const stickyRoutes = [
  '/815/regulation/',
  '/815/regulation/services/',
  '/815/regulation/assets/',
  '/815/compare/settlements/shelkovo/',
] as const;

const installWindowListenerTracker = (page: Page): Promise<void> =>
  page.addInitScript(
    ({ resizeCountKey, scrollCountKey, sessionKey }) => {
      const trackedListeners = new Map<
        string,
        Set<EventListenerOrEventListenerObject>
      >([
        ['scroll', new Set()],
        ['resize', new Set()],
      ]);
      const addEventListener = EventTarget.prototype.addEventListener;
      const removeEventListener = EventTarget.prototype.removeEventListener;
      const publishCounts = (): void => {
        Reflect.set(
          window,
          scrollCountKey,
          trackedListeners.get('scroll')?.size ?? 0,
        );
        Reflect.set(
          window,
          resizeCountKey,
          trackedListeners.get('resize')?.size ?? 0,
        );
      };

      Reflect.set(window, sessionKey, Math.random().toString(36));
      publishCounts();
      EventTarget.prototype.addEventListener = function (
        type,
        listener,
        options,
      ): void {
        if (this === window && listener) {
          trackedListeners.get(type)?.add(listener);
          publishCounts();
        }

        addEventListener.call(this, type, listener, options);
      };
      EventTarget.prototype.removeEventListener = function (
        type,
        listener,
        options,
      ): void {
        removeEventListener.call(this, type, listener, options);
        if (this === window && listener) {
          trackedListeners.get(type)?.delete(listener);
          publishCounts();
        }
      };
    },
    {
      resizeCountKey: resizeListenerCountKey,
      scrollCountKey: scrollListenerCountKey,
      sessionKey: browserSessionKey,
    },
  );

const getBrowserSession = (page: Page): Promise<string> =>
  page.evaluate((key) => String(Reflect.get(window, key)), browserSessionKey);

const getWindowListenerCounts = (page: Page) =>
  page.evaluate(
    ({ resizeCountKey, scrollCountKey }) => ({
      resize: Number(Reflect.get(window, resizeCountKey)),
      scroll: Number(Reflect.get(window, scrollCountKey)),
    }),
    {
      resizeCountKey: resizeListenerCountKey,
      scrollCountKey: scrollListenerCountKey,
    },
  );

const scrollIntoStickyState = async (shell: Locator): Promise<void> => {
  await shell.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    window.scrollTo({
      top: window.scrollY + rect.top + 180,
      behavior: 'instant',
    });
  });
  await expect(shell).toHaveAttribute('data-ui-sticky-table-stuck');
};

const countStickyUpdatesOnPageLoad = (shell: Locator): Promise<number> =>
  shell.evaluate((element) => {
    const getBoundingClientRect = element.getBoundingClientRect.bind(element);
    let updates = 0;

    element.getBoundingClientRect = () => {
      updates += 1;
      return getBoundingClientRect();
    };
    document.dispatchEvent(new Event('astro:page-load'));

    return updates;
  });

const navigateWithClientRouter = async (
  page: Page,
  pathname: string,
): Promise<void> => {
  await page.evaluate((href) => {
    const link = document.createElement('a');

    link.href = href;
    link.textContent = 'Navigate';
    link.setAttribute('data-sticky-lifecycle-navigation', '');
    document.body.append(link);
  }, pathname);
  await page.locator('[data-sticky-lifecycle-navigation]').click();
  await page.waitForURL(pathname);
};

test('keeps one sticky lifecycle across every sticky route and releases it after leaving', async ({
  page,
}) => {
  await installWindowListenerTracker(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  const browserSession = await getBrowserSession(page);
  const baseline = await getWindowListenerCounts(page);
  const active = {
    resize: baseline.resize + 1,
    scroll: baseline.scroll + 1,
  };

  for (const pathname of [...stickyRoutes, ...stickyRoutes]) {
    await navigateWithClientRouter(page, pathname);

    await expect(page.locator(stickyTableSelector).first()).toBeVisible();
    expect(await getWindowListenerCounts(page)).toEqual(active);
    expect(await getBrowserSession(page)).toBe(browserSession);
  }

  expect(
    await countStickyUpdatesOnPageLoad(
      page.locator(stickyTableSelector).first(),
    ),
  ).toBe(1);

  await navigateWithClientRouter(page, '/');
  await expect(page.locator(stickyTableSelector)).toHaveCount(0);
  expect(await getWindowListenerCounts(page)).toEqual(baseline);
  expect(await getBrowserSession(page)).toBe(browserSession);
});

test('updates sticky state on direct load and a fresh client destination', async ({
  page,
}) => {
  await installWindowListenerTracker(page);
  await page.goto('/815/regulation/services/', { waitUntil: 'networkidle' });
  const browserSession = await getBrowserSession(page);

  await scrollIntoStickyState(page.locator(stickyTableSelector).first());
  await navigateWithClientRouter(page, '/');
  const baseline = await getWindowListenerCounts(page);

  await navigateWithClientRouter(page, '/815/regulation/');

  const shell = page.locator(stickyTableSelector).first();
  await expect(shell).toBeVisible();
  expect(await getWindowListenerCounts(page)).toEqual({
    resize: baseline.resize + 1,
    scroll: baseline.scroll + 1,
  });
  expect(await getBrowserSession(page)).toBe(browserSession);
  await scrollIntoStickyState(shell);
});
