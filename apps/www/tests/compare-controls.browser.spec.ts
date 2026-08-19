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
