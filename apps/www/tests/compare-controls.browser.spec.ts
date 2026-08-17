import { expect, test } from '@playwright/test';

test('keeps every tariff filter visible beside the map button at 390px', async ({
  page,
}) => {
  await page.goto('/815/compare/', { waitUntil: 'networkidle' });

  const controls = page.getByTestId('explorer-controls');
  const expensiveInput = controls.getByTestId('price-more');
  const expensiveLabel = controls.locator('[data-testid="price-more"] + label');
  const mapButton = controls.getByTestId('map-toggle');

  await expect(expensiveLabel).toBeVisible();
  await expect(mapButton).toBeVisible();
  await expensiveLabel.click();
  await expect(expensiveInput).toBeChecked();

  const geometry = await controls.evaluate((root) => {
    const filterGroup = root.querySelector(
      '[data-testid="price-filter-group"]',
    );
    const allLabel = root
      .querySelector<HTMLInputElement>('[data-testid="price-all"]')
      ?.labels?.item(0);
    const expensiveFilterLabel = root
      .querySelector<HTMLInputElement>('[data-testid="price-more"]')
      ?.labels?.item(0);
    const mapToggle = root.querySelector('[data-testid="map-toggle"]');

    if (!filterGroup || !allLabel || !expensiveFilterLabel || !mapToggle) {
      throw new Error('Не удалось измерить элементы фильтра тарифов');
    }

    const filterRect = filterGroup.getBoundingClientRect();
    const allRect = allLabel.getBoundingClientRect();
    const expensiveRect = expensiveFilterLabel.getBoundingClientRect();
    const mapRect = mapToggle.getBoundingClientRect();
    const filterLabels = filterGroup.querySelectorAll('label');

    return {
      allFiltersInsideGroup: [...filterLabels].every((label) => {
        const rect = label.getBoundingClientRect();

        return rect.left >= filterRect.left && rect.right <= filterRect.right;
      }),
      expensiveFilterWrapped: expensiveRect.top > allRect.top,
      expensiveFilterOverlapsMap:
        expensiveRect.left < mapRect.right &&
        expensiveRect.right > mapRect.left &&
        expensiveRect.top < mapRect.bottom &&
        expensiveRect.bottom > mapRect.top,
    };
  });

  expect(geometry).toEqual({
    allFiltersInsideGroup: true,
    expensiveFilterWrapped: true,
    expensiveFilterOverlapsMap: false,
  });
});
