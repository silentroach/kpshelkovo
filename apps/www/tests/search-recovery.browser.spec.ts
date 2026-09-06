import { expect, test } from '@playwright/test';

const SEARCH_DIALOG_CHUNK_URL = /\/static\/SearchDialog[^/]*\.js(?:\?.*)?$/u;
const QUERY = 'вода';

test('loads an independent component chunk when retrying', async ({ page }) => {
  const requestedChunkUrls: string[] = [];
  let allowRetryChunk = (): void => {
    throw new Error('Expected a pending retry chunk');
  };
  const retryChunkBlocked = new Promise<void>((resolve) => {
    allowRetryChunk = resolve;
  });

  await page.route(SEARCH_DIALOG_CHUNK_URL, async (route) => {
    requestedChunkUrls.push(route.request().url());
    if (requestedChunkUrls.length === 1) {
      await route.abort('failed');
      return;
    }

    await retryChunkBlocked;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(requestedChunkUrls).toHaveLength(0);

  await page.getByRole('button', { name: 'Поиск', exact: true }).click();
  const root = page.locator('[data-search-dialog-root]');
  const input = page.getByRole('searchbox', { name: 'Что найти на сайте' });
  const loadMessage = page.locator('[data-search-load-message]');
  await input.fill(QUERY);
  await expect(loadMessage).toHaveText('Не удалось загрузить поиск');

  await page.getByRole('button', { name: 'Повторить', exact: true }).click();

  await expect.poll(() => requestedChunkUrls.length).toBe(2);
  expect(requestedChunkUrls[1]).not.toBe(requestedChunkUrls[0]);
  await expect(loadMessage).toHaveText('Пробуем загрузить поиск ещё раз…');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(QUERY);

  allowRetryChunk();
  await expect(root).toHaveAttribute('data-search-dialog-hydrated', '');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(QUERY);
});

test('uses a third fresh URL after two component graph failures', async ({
  page,
}) => {
  const requestedChunkUrls: string[] = [];

  await page.route(SEARCH_DIALOG_CHUNK_URL, async (route) => {
    requestedChunkUrls.push(route.request().url());
    if (requestedChunkUrls.length <= 2) {
      await route.abort('failed');
      return;
    }

    await route.continue();
  });
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Поиск', exact: true }).click();
  const input = page.getByRole('searchbox', { name: 'Что найти на сайте' });
  const loadMessage = page.locator('[data-search-load-message]');
  await input.fill(QUERY);
  await expect(loadMessage).toHaveText('Не удалось загрузить поиск');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();

  await expect(loadMessage).toHaveText('Не удалось загрузить поиск');
  expect(requestedChunkUrls).toHaveLength(2);
  expect(requestedChunkUrls[1]).not.toBe(requestedChunkUrls[0]);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(QUERY);

  await page.getByRole('button', { name: 'Повторить', exact: true }).click();

  await expect.poll(() => requestedChunkUrls.length).toBe(3);
  expect(new Set(requestedChunkUrls).size).toBe(3);
  await expect(page.locator('[data-search-dialog-root]')).toHaveAttribute(
    'data-search-dialog-hydrated',
    '',
  );
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(QUERY);
});
