import { expect, test, type Locator, type Page } from '@playwright/test';

const stickyTableSelector = '[data-ui-sticky-table-shell]';
const stickyQueryCountKey = '__stickyTableQueryCount';
const browserSessionKey = '__stickyTableBrowserSession';

const installStickyQueryCounter = (page: Page): Promise<void> =>
  page.addInitScript(
    ({ queryCountKey, sessionKey, tableSelector }) => {
      const querySelectorAll = document.querySelectorAll.bind(document);

      Reflect.set(window, queryCountKey, 0);
      Reflect.set(window, sessionKey, Math.random().toString(36));
      document.querySelectorAll = ((selectors: string) => {
        if (selectors === tableSelector) {
          const count = Number(Reflect.get(window, queryCountKey));

          Reflect.set(window, queryCountKey, count + 1);
        }

        return querySelectorAll(selectors);
      }) as typeof document.querySelectorAll;
    },
    {
      queryCountKey: stickyQueryCountKey,
      sessionKey: browserSessionKey,
      tableSelector: stickyTableSelector,
    },
  );

const getBrowserSession = (page: Page): Promise<string> =>
  page.evaluate((key) => String(Reflect.get(window, key)), browserSessionKey);

const resetStickyQueryCount = (page: Page): Promise<void> =>
  page.evaluate((key) => {
    Reflect.set(window, key, 0);
  }, stickyQueryCountKey);

const getStickyQueryCount = (page: Page): Promise<number> =>
  page.evaluate((key) => Number(Reflect.get(window, key)), stickyQueryCountKey);

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

const expectNoStickyWorkOnWindowEvents = async (page: Page): Promise<void> => {
  await resetStickyQueryCount(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  expect(await getStickyQueryCount(page)).toBe(0);
};

test('scopes sticky table work to pages that contain sticky tables', async ({
  page,
}) => {
  await installStickyQueryCounter(page);
  await page.goto('/815/regulation/services/', { waitUntil: 'networkidle' });

  const browserSession = await getBrowserSession(page);
  let shell = page.locator(stickyTableSelector).first();

  await expect(shell).toBeVisible();
  await scrollIntoStickyState(shell);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await page.waitForURL('/');
  await expect(page.locator(stickyTableSelector)).toHaveCount(0);
  expect(await getBrowserSession(page)).toBe(browserSession);
  await expectNoStickyWorkOnWindowEvents(page);

  await page.goBack();
  await page.waitForURL('/815/regulation/services/');
  shell = page.locator(stickyTableSelector).first();
  await expect(shell).toBeVisible();
  await scrollIntoStickyState(shell);
  expect(await getBrowserSession(page)).toBe(browserSession);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await page.waitForURL('/');
  await expect(page.locator(stickyTableSelector)).toHaveCount(0);
  await expectNoStickyWorkOnWindowEvents(page);
});
