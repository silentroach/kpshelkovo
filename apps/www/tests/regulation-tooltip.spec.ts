import { expect, test, type Locator, type Page } from '@playwright/test';

const missingBaseCount = 6;
const mobileWidths = [320, 390] as const;

const tooltipClippingIssues = (tooltip: HTMLElement): readonly string[] => {
  const rect = tooltip.getBoundingClientRect();
  const issues: string[] = [];
  const tolerance = 0.5;

  if (rect.left < -tolerance)
    issues.push(`viewport left: ${rect.left.toFixed(2)}`);
  if (rect.right > window.innerWidth + tolerance)
    issues.push(`viewport right: ${rect.right.toFixed(2)}`);
  if (rect.top < -tolerance)
    issues.push(`viewport top: ${rect.top.toFixed(2)}`);
  if (rect.bottom > window.innerHeight + tolerance)
    issues.push(`viewport bottom: ${rect.bottom.toFixed(2)}`);

  let ancestor = tooltip.parentElement;

  while (ancestor) {
    const style = getComputedStyle(ancestor);
    const ancestorRect = ancestor.getBoundingClientRect();
    const name = ancestor.hasAttribute('data-ui-sticky-table-shell')
      ? 'table shell'
      : ancestor.tagName.toLowerCase();

    if (style.overflowX !== 'visible') {
      if (rect.left < ancestorRect.left - tolerance)
        issues.push(`${name} left: ${rect.left.toFixed(2)}`);
      if (rect.right > ancestorRect.right + tolerance)
        issues.push(`${name} right: ${rect.right.toFixed(2)}`);
    }

    if (style.overflowY !== 'visible') {
      if (rect.top < ancestorRect.top - tolerance)
        issues.push(`${name} top: ${rect.top.toFixed(2)}`);
      if (rect.bottom > ancestorRect.bottom + tolerance)
        issues.push(`${name} bottom: ${rect.bottom.toFixed(2)}`);
    }

    ancestor = ancestor.parentElement;
  }

  if (tooltip.scrollWidth > tooltip.clientWidth) issues.push('horizontal text');
  if (tooltip.scrollHeight > tooltip.clientHeight) issues.push('vertical text');

  return issues;
};

const openRegulation = async (
  page: Page,
  viewport: { readonly width: number; readonly height: number },
): Promise<Locator> => {
  await page.setViewportSize(viewport);
  await page.goto('/815/regulation/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const helps = page.locator('[data-reglament-missing-field="base"]');
  await expect(helps).toHaveCount(missingBaseCount);

  return helps;
};

const triggerFor = (help: Locator): Locator =>
  help.getByRole('button', { name: 'Почему здесь нет поля ввода' });

const tooltipFor = (help: Locator): Locator => help.getByRole('tooltip');

const placeTriggerAtShellEdge = async (
  trigger: Locator,
  edge: 'left' | 'right',
): Promise<void> => {
  await trigger.evaluate((element, targetEdge) => {
    const shell = element.closest<HTMLElement>('[data-ui-sticky-table-shell]');

    if (!shell) throw new Error('Missing table shell');

    const shellRect = shell.getBoundingClientRect();
    const triggerRect = element.getBoundingClientRect();
    const contentLeft = triggerRect.left - shellRect.left + shell.scrollLeft;
    const edgeInset = 4;

    shell.scrollLeft =
      targetEdge === 'left'
        ? contentLeft - edgeInset
        : contentLeft + triggerRect.width - shell.clientWidth + edgeInset;
  }, edge);

  await expect
    .poll(() =>
      trigger.evaluate((element, targetEdge) => {
        const shell = element.closest<HTMLElement>(
          '[data-ui-sticky-table-shell]',
        );

        if (!shell) return false;

        const shellRect = shell.getBoundingClientRect();
        const triggerRect = element.getBoundingClientRect();

        return targetEdge === 'left'
          ? triggerRect.left <= shellRect.left + 5
          : triggerRect.right >= shellRect.right - 5;
      }, edge),
    )
    .toBe(true);
};

const placeTriggerVertically = async (
  trigger: Locator,
  position: 'center' | 'bottom',
): Promise<void> => {
  await trigger.evaluate((element, targetPosition) => {
    const rect = element.getBoundingClientRect();
    const target =
      targetPosition === 'center'
        ? window.innerHeight / 2
        : window.innerHeight - 8;
    const current =
      targetPosition === 'center' ? rect.top + rect.height / 2 : rect.bottom;

    window.scrollTo({
      top: window.scrollY + current - target,
      behavior: 'instant',
    });
  }, position);
};

const expectFullyReadable = async (tooltip: Locator): Promise<void> => {
  await expect.poll(() => tooltip.evaluate(tooltipClippingIssues)).toEqual([]);
};

const expectTooltipAboveTrigger = async (
  trigger: Locator,
  tooltip: Locator,
): Promise<void> => {
  await expect
    .poll(async () => {
      const triggerRect = await trigger.boundingBox();
      const tooltipRect = await tooltip.boundingBox();

      if (!triggerRect || !tooltipRect) return false;

      return tooltipRect.y + tooltipRect.height <= triggerRect.y;
    })
    .toBe(true);
};

for (const width of mobileWidths) {
  test(`keeps all missing-base tooltips readable at ${String(width)}px across horizontal scroll`, async ({
    page,
  }) => {
    const helps = await openRegulation(page, { width, height: 844 });

    for (let index = 0; index < missingBaseCount; index += 1) {
      const help = helps.nth(index);
      const trigger = triggerFor(help);
      const tooltip = tooltipFor(help);

      for (const edge of ['right', 'left'] as const) {
        await placeTriggerAtShellEdge(trigger, edge);
        await placeTriggerVertically(trigger, 'center');
        await trigger.focus();
        await expect(tooltip).toBeVisible();
        await expectFullyReadable(tooltip);
        await trigger.blur();
        await expect(tooltip).toBeHidden();
      }
    }
  });

  test(`places the last missing-base tooltip above the trigger near the ${String(width)}px viewport bottom`, async ({
    page,
  }) => {
    const helps = await openRegulation(page, { width, height: 844 });
    const help = helps.nth(missingBaseCount - 1);
    const trigger = triggerFor(help);
    const tooltip = tooltipFor(help);

    await placeTriggerAtShellEdge(trigger, 'left');
    await placeTriggerVertically(trigger, 'bottom');
    await trigger.focus();
    await expect(tooltip).toBeVisible();
    await expectFullyReadable(tooltip);
    await expectTooltipAboveTrigger(trigger, tooltip);
  });
}

test('keeps all missing-base tooltips readable on desktop', async ({
  page,
}) => {
  const helps = await openRegulation(page, { width: 1280, height: 900 });

  for (let index = 0; index < missingBaseCount; index += 1) {
    const help = helps.nth(index);
    const trigger = triggerFor(help);
    const tooltip = tooltipFor(help);

    await placeTriggerVertically(trigger, 'center');
    await trigger.focus();
    await expect(tooltip).toBeVisible();
    await expectFullyReadable(tooltip);
    await trigger.blur();
  }
});

test('preserves pointer and keyboard behavior after horizontal scrolling', async ({
  page,
}) => {
  const helps = await openRegulation(page, { width: 390, height: 844 });
  const help = helps.nth(2);
  const trigger = triggerFor(help);
  const tooltip = tooltipFor(help);

  await placeTriggerAtShellEdge(trigger, 'left');
  await placeTriggerVertically(trigger, 'center');
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await expectFullyReadable(tooltip);

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await expectFullyReadable(tooltip);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('opens a readable tooltip after a tap', async ({ page }) => {
    const helps = await openRegulation(page, { width: 390, height: 844 });
    const help = helps.nth(4);
    const trigger = triggerFor(help);
    const tooltip = tooltipFor(help);

    await placeTriggerAtShellEdge(trigger, 'left');
    await placeTriggerVertically(trigger, 'center');
    await trigger.tap();
    await expect(tooltip).toBeVisible();
    await expectFullyReadable(tooltip);
  });
});
