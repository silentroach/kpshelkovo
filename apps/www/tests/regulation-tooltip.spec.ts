import { expect, test, type Locator, type Page } from '@playwright/test';

const tooltipClippingIssues = (tooltip: HTMLElement): readonly string[] => {
  const rect = tooltip.getBoundingClientRect();
  const shell = tooltip.closest<HTMLElement>('[data-ui-sticky-table-shell]');
  const shellRect = shell?.getBoundingClientRect();
  const visibleLeft = Math.max(0, shellRect?.left ?? 0);
  const visibleRight = Math.min(
    window.innerWidth,
    shellRect?.right ?? Infinity,
  );
  const issues: string[] = [];

  if (rect.left < visibleLeft)
    issues.push(
      `left edge: ${rect.left.toFixed(2)} < ${visibleLeft.toFixed(2)}`,
    );
  if (rect.right > visibleRight)
    issues.push(
      `right edge: ${rect.right.toFixed(2)} > ${visibleRight.toFixed(2)}`,
    );
  if (rect.top < 0) issues.push(`top edge: ${rect.top.toFixed(2)} < 0`);
  if (rect.bottom > window.innerHeight)
    issues.push(
      `bottom edge: ${rect.bottom.toFixed(2)} > ${String(window.innerHeight)}`,
    );
  if (tooltip.scrollWidth > tooltip.clientWidth) issues.push('horizontal text');
  if (tooltip.scrollHeight > tooltip.clientHeight) issues.push('vertical text');

  return issues;
};

const openRegulationTooltip = async (
  page: Page,
): Promise<{ readonly trigger: Locator; readonly tooltip: Locator }> => {
  await page.goto('/815/regulation/', { waitUntil: 'networkidle' });

  const missingBase = page
    .getByText('нет единой базы', { exact: true })
    .first();
  const field = missingBase.locator('..');
  const trigger = field.getByRole('button', {
    name: 'Почему здесь нет поля ввода',
  });
  const tooltip = field.getByRole('tooltip');

  await trigger.evaluate((element) => {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const rect = element.getBoundingClientRect();

    window.scrollTo({
      top: window.scrollY + rect.top - window.innerHeight / 2,
      behavior: 'instant',
    });
  });

  return { trigger, tooltip };
};

const expectFullyReadable = async (tooltip: Locator): Promise<void> => {
  await expect.poll(() => tooltip.evaluate(tooltipClippingIssues)).toEqual([]);
};

test('keeps the missing-base tooltip readable on mobile for pointer and keyboard', async ({
  page,
}) => {
  const { trigger, tooltip } = await openRegulationTooltip(page);

  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await expectFullyReadable(tooltip);

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await expectFullyReadable(tooltip);
});

test('keeps the missing-base tooltip readable on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { trigger, tooltip } = await openRegulationTooltip(page);

  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await expectFullyReadable(tooltip);
});
