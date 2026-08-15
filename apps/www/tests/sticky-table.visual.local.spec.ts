import { expect, test, type Locator, type Page } from '@playwright/test';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

const openFixtureSection = async (
  page: Page,
  testId: string,
): Promise<Locator> => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const section = page.getByTestId(testId);
  await expect(section.locator('[data-ui-sticky-table-shell]')).toBeVisible();

  return section;
};

const scrollTableHeaderIntoStickyState = async (
  tableShell: Locator,
): Promise<void> => {
  await tableShell.evaluate((shell) => {
    const rect = shell.getBoundingClientRect();

    window.scrollTo({
      top: window.scrollY + rect.top + 180,
      behavior: 'instant',
    });
  });
};

const expectStickyState = async (tableShell: Locator): Promise<void> => {
  await expect
    .poll(() =>
      tableShell.evaluate((shell) =>
        shell.hasAttribute('data-ui-sticky-table-stuck'),
      ),
    )
    .toBe(true);
};

test.describe('Shared sticky table visual', () => {
  test('places sticky table headers below the desktop site header', async ({
    page,
  }) => {
    const section = await openFixtureSection(page, 'sticky-table-wide-section');
    const headerCell = section.locator('thead th').first();

    await page.locator('body').evaluate((body) => {
      body.classList.add('site-has-header');
    });

    await expect
      .poll(() => headerCell.evaluate((cell) => getComputedStyle(cell).top))
      .toBe('57px');

    await page.setViewportSize({ width: 390, height: 844 });

    await expect
      .poll(() => headerCell.evaluate((cell) => getComputedStyle(cell).top))
      .toBe('0px');
  });

  test('renders a wide table before vertical sticking', async ({ page }) => {
    const section = await openFixtureSection(page, 'sticky-table-wide-section');
    const tableShell = section.locator('[data-ui-sticky-table-shell]');

    await expect(tableShell).not.toHaveAttribute('data-ui-sticky-table-stuck');

    await expect(tableShell).toHaveScreenshot(
      'sticky-table-wide-default.png',
      screenshot,
    );
  });

  test('keeps a wide table horizontally scrollable at 320px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });

    const section = await openFixtureSection(page, 'sticky-table-wide-section');
    const tableShell = section.locator('[data-ui-sticky-table-shell]');

    await expect
      .poll(() =>
        tableShell.evaluate((shell) => shell.scrollWidth > shell.clientWidth),
      )
      .toBe(true);

    await expect(tableShell).toHaveScreenshot(
      'sticky-table-wide-mobile-320.png',
      screenshot,
    );
  });

  test('keeps a wide table horizontally scrollable at 390px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const section = await openFixtureSection(page, 'sticky-table-wide-section');
    const tableShell = section.locator('[data-ui-sticky-table-shell]');

    await expect
      .poll(() =>
        tableShell.evaluate((shell) => shell.scrollWidth > shell.clientWidth),
      )
      .toBe(true);

    await expect(tableShell).toHaveScreenshot(
      'sticky-table-wide-mobile-390.png',
      screenshot,
    );
  });

  test('keeps a wide table header sticky while scrolling rows', async ({
    page,
  }) => {
    const section = await openFixtureSection(page, 'sticky-table-wide-section');
    const tableShell = section.locator('[data-ui-sticky-table-shell]');

    await scrollTableHeaderIntoStickyState(tableShell);
    await expectStickyState(tableShell);

    await expect(page).toHaveScreenshot(
      'sticky-table-wide-sticky.png',
      screenshot,
    );
  });

  test('keeps a comparison table header sticky while scrolling rows', async ({
    page,
  }) => {
    const section = await openFixtureSection(
      page,
      'sticky-table-compare-section',
    );
    const tableShell = section.locator('[data-ui-sticky-table-shell]');

    await scrollTableHeaderIntoStickyState(tableShell);
    await expectStickyState(tableShell);

    await expect(page).toHaveScreenshot(
      'sticky-table-comparison-sticky.png',
      screenshot,
    );
  });
});
