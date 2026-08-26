import { expect, type Locator, test } from '@playwright/test';

const hasNonColorFocusIndicator = (locator: Locator): Promise<boolean> =>
  locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const hasOutline =
      style.outlineStyle !== 'none' &&
      Number.parseFloat(style.outlineWidth) >= 2 &&
      style.outlineColor !== 'rgba(0, 0, 0, 0)';

    return hasOutline || style.boxShadow !== 'none';
  });

test('removes the closed tariff submenu from desktop keyboard flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/rules/', { waitUntil: 'networkidle' });

  const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
  const menu = page.locator('[data-site-nav-dropdown-menu]');
  const compareLink = page.getByRole('link', { name: 'Сравнение тарифов' });

  await expect(menu).toHaveAttribute('hidden', '');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(tariffButton).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(tariffButton).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).not.toHaveAttribute('hidden', '');
  await page.keyboard.press('Tab');
  await expect(compareLink).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(tariffButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('hidden', '');
  await expect(tariffButton).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Карта', exact: true }),
  ).toBeFocused();
});

test('toggles the hovered tariff submenu and closes it from outside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/', { waitUntil: 'networkidle' });

  const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
  const menu = page.locator('[data-site-nav-dropdown-menu]');

  await tariffButton.hover();
  await expect(menu).toBeVisible();

  await tariffButton.click();
  await expect(menu).toHaveAttribute('hidden', '');

  await tariffButton.click();
  await expect(menu).toBeVisible();
  await tariffButton.click();
  await expect(menu).toHaveAttribute('hidden', '');

  await page.getByRole('link', { name: 'Шелково Онлайн' }).hover();
  await tariffButton.hover();
  await expect(menu).toBeVisible();
  await page.locator('.site-page-content').click({ position: { x: 2, y: 2 } });
  await expect(menu).toHaveAttribute('hidden', '');
});

test('toggles the tariff submenu with touch activation', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    viewport: { width: 1024, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
    const menu = page.locator('[data-site-nav-dropdown-menu]');

    await tariffButton.tap();
    await expect(menu).toBeVisible();
    await tariffButton.tap();
    await expect(menu).toHaveAttribute('hidden', '');
  } finally {
    await context.close();
  }
});

test('keeps tariff links available without JavaScript', async ({
  baseURL,
  browser,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
    const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
    const menu = page.locator('[data-site-nav-dropdown-menu]');
    const compareLink = page.getByRole('link', { name: 'Сравнение тарифов' });

    await expect(menu).not.toHaveAttribute('hidden', '');
    await expect(menu).toBeHidden();
    await tariffButton.hover();
    await expect(menu).toBeVisible();
    await brand.hover();
    await expect(menu).toBeHidden();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(tariffButton).toBeFocused();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(compareLink).toBeFocused();
  } finally {
    await context.close();
  }
});

test('shows non-color keyboard focus on the brand at desktop and mobile sizes', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
    await page.keyboard.press('Tab');

    await expect(brand).toBeFocused();
    expect(await hasNonColorFocusIndicator(brand)).toBe(true);
  }
});

test('shows keyboard-only focus on the mobile menu button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reviews/', { waitUntil: 'networkidle' });

  const menuButton = page.locator('summary[aria-label="Меню"]');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menuButton).toBeFocused();
  expect(await hasNonColorFocusIndicator(menuButton)).toBe(true);

  await page.reload({ waitUntil: 'networkidle' });
  await menuButton.click();
  await expect(page.locator('details.site-header-menu')).toHaveAttribute(
    'open',
    '',
  );
  expect(await hasNonColorFocusIndicator(menuButton)).toBe(false);
});
