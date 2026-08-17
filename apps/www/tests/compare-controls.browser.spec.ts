import { expect, test } from '@playwright/test';

const mobileViewports = [
  { width: 320, height: 760 },
  { width: 390, height: 844 },
] as const;

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
        await expect(label).toBeVisible();
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
        const mapRect = mapToggle.getBoundingClientRect();
        const controlRects = [...filterRects, mapRect];

        return {
          controlsAreClipped:
            controlRects.some(
              (rect) => rect.left < 0 || rect.right > window.innerWidth,
            ) ||
            filterRects.some(
              (rect) =>
                rect.left < filterGroupRect.left ||
                rect.right > filterGroupRect.right ||
                rect.top < filterGroupRect.top ||
                rect.bottom > filterGroupRect.bottom,
            ),
          filtersOverlapMap: filterRects.some(
            (rect) =>
              rect.left < mapRect.right &&
              rect.right > mapRect.left &&
              rect.top < mapRect.bottom &&
              rect.bottom > mapRect.top,
          ),
        };
      });

      expect(geometry).toEqual({
        controlsAreClipped: false,
        filtersOverlapMap: false,
      });
    });
  }
});
