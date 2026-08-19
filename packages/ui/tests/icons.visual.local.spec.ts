import { expect, test } from '@playwright/test';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

test.describe('Icons visual', () => {
  test('renders all shared icons in one catalog', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const target = page.getByTestId('icons-catalog');

    await expect(
      target.getByRole('heading', { name: 'Каталог иконок' }),
    ).toBeVisible();
    await expect(target.locator('[data-icon-item]')).toHaveCount(20);
    await expect(target.locator('[data-marker-item]')).toHaveCount(3);

    await expect(target).toHaveScreenshot('icons-catalog.png', screenshot);
  });
});
