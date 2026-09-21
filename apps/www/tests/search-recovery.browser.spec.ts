import { expect, test } from '@playwright/test';

const searchChunk = /\/static\/lazy\.[^/]+\.js(?:\?.*)?$/u;

test('recovers a failed lazy import only after a browser reload', async ({ page }) => {
  let blocked = true;
  const requests: string[] = [];
  let documents = 0;
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1;
  });
  await page.route(searchChunk, async (route) => {
    requests.push(route.request().url());
    if (blocked) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(requests).toHaveLength(0);
  const opener = page.getByRole('button', { name: 'Поиск', exact: true });
  const dialog = page.locator('[data-search-dialog]');
  const input = page.getByRole('searchbox', { name: 'Что найти на сайте' });

  for (const documentCount of [1, 2]) {
    await opener.click();
    await input.fill('вода');
    await expect(page.locator('[data-search-load-message]')).toContainText('обновить страницу');
    await expect(page.locator('[data-search-load-announcement]')).toContainText(
      'обновить страницу'
    );
    await expect(dialog.getByRole('button')).toHaveCount(1); // Only Close, no recovery action.
    await expect(input).toBeFocused();
    await page.waitForTimeout(500); // Observe a persistent failure without an automatic reload loop.
    expect(documents).toBe(documentCount);
    expect(requests.length).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: 'Закрыть' }).click();
    await expect(opener).toBeFocused();
    if (documentCount === 1) await page.reload({ waitUntil: 'networkidle' });
  }

  blocked = false;
  await page.reload({ waitUntil: 'networkidle' });
  await expect(dialog).not.toBeVisible();
  await opener.click();
  await expect(page.locator('[data-search-dialog-root]')).toHaveAttribute(
    'data-search-dialog-hydrated',
    ''
  );
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  expect(documents).toBe(3);
  expect(new Set(requests).size).toBe(1); // No cache-busting URLs.
});
