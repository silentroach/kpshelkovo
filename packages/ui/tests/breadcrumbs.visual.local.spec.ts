import { expect, test } from '@playwright/test';

test.describe('Breadcrumbs visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('renders a section trail with a current page item', async ({ page }) => {
    const target = page.getByTestId('breadcrumbs-section');
    const list = target.locator('ol');

    await expect(list).toHaveAttribute(
      'itemtype',
      'https://schema.org/BreadcrumbList',
    );
    const schemaItems = list.locator('[itemprop="itemListElement"]');
    await expect(schemaItems).toHaveCount(2);
    await expect(schemaItems.first()).toHaveAttribute(
      'itemtype',
      'https://schema.org/ListItem',
    );
    await expect(
      schemaItems.first().locator('[itemprop="position"]'),
    ).toHaveAttribute('content', '1');
    await expect(
      schemaItems.last().locator('[itemprop="position"]'),
    ).toHaveAttribute('content', '2');
    await expect(target.getByRole('link', { name: 'Главная' })).toBeVisible();
    await expect(target.locator('[aria-current="page"]')).toHaveText('Новости');
    await expect(list).toHaveCSS('display', 'flex');

    await expect(target).toHaveScreenshot('breadcrumbs-section.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
  });

  test('hides a section trail on narrow screens when only home would remain', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const target = page.getByTestId('breadcrumbs-section');

    await expect(
      target.locator('nav[aria-label="Хлебные крошки"]'),
    ).toBeHidden();
  });

  test('renders a long trail when the last item stays linked', async ({
    page,
  }) => {
    const target = page.getByTestId('breadcrumbs-article');
    const list = target.locator('ol');

    await expect(
      target.getByRole('link', { name: 'Запуск уличного освещения' }),
    ).toBeVisible();
    await expect(target.locator('[aria-current="page"]')).toHaveCount(0);
    await expect(list).toHaveCSS('display', 'flex');

    await expect(target).toHaveScreenshot('breadcrumbs-article.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    });
  });

  test('omits unlinked intermediate labels from structured data', async ({
    page,
  }) => {
    const target = page.getByTestId('breadcrumbs-unlinked-section');
    const items = target.locator('li');
    const schemaItems = target.locator('[itemprop="itemListElement"]');

    await expect(items).toHaveCount(3);
    await expect(items.nth(1)).not.toHaveAttribute('itemscope', '');
    await expect(schemaItems).toHaveCount(2);
    await expect(
      schemaItems.last().locator('[itemprop="position"]'),
    ).toHaveAttribute('content', '2');
  });
});
