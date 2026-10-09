import { expect, test, type Locator } from '@playwright/test';

const shellSelector = '[data-ui-sticky-table-shell]';

// Hit-test the rendered text, not only its box: overflow clipping can leave
// getBoundingClientRect() unchanged while hiding the explanation.
const expectReadableExplanation = async (tooltip: Locator): Promise<void> => {
  await expect(tooltip).toHaveCSS('opacity', '1');
  expect(
    await tooltip.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const lines = [...range.getClientRects()];
      const previousPointerEvents = element.style.pointerEvents;
      element.style.pointerEvents = 'auto';
      const textPainted = lines.every((line) =>
        [line.left + 1, line.right - 1].every((x) => {
          const y = line.top + line.height / 2;
          const hit = document.elementFromPoint(x, y);
          return x >= 0 && x < innerWidth && !!hit && element.contains(hit);
        })
      );
      element.style.pointerEvents = previousPointerEvents;
      const checks = {
        textPainted,
        wraps: lines.length > 1,
        noInternalOverflow: element.scrollWidth <= element.clientWidth,
        noDocumentOverflow: document.documentElement.scrollWidth <= innerWidth,
        describedByButton: !!document.querySelector(
          `.reglament-missing-help-button[aria-describedby="${element.id}"]`
        )
      };
      return Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => check);
    })
  ).toEqual([]);
};

const placeButtonAtEdge = async (button: Locator, edge: 'left' | 'right'): Promise<void> => {
  const failures = await button.evaluate((element, desiredEdge) => {
    const shell = element.closest<HTMLElement>('[data-ui-sticky-table-shell]');
    if (!shell) throw new Error('Missing calculator scroll container');
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const rect = shell.getBoundingClientRect();
    const target = desiredEdge === 'left' ? rect.left + 24 : rect.right - 40;
    const beforeLeft = element.getBoundingClientRect().left;
    const beforeScroll = shell.scrollLeft;
    const expectedScroll = Math.max(
      0,
      Math.min(beforeScroll + beforeLeft - target, shell.scrollWidth - shell.clientWidth)
    );
    shell.scrollLeft = expectedScroll;
    const actual = element.getBoundingClientRect();
    const checks = {
      scrollReached: Math.abs(shell.scrollLeft - expectedScroll) <= 1,
      buttonReached: Math.abs(actual.left - (beforeLeft + beforeScroll - expectedScroll)) <= 1,
      buttonVisible: actual.left >= rect.left && actual.right <= rect.right
    };
    return Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => check);
  }, edge);
  expect(failures).toEqual([]);
};

test.describe('regulation explanations on narrow screens', () => {
  test.use({ hasTouch: true });

  for (const width of [320, 390]) {
    test(`keeps all missing-value explanations readable while scrolling at ${width}px`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/815/regulation/');

      for (const field of ['base', 'price']) {
        await expect(page.locator(`[id^="reglament-missing-${field}-"]`)).not.toHaveCount(0);
      }

      for (const field of ['base', 'frequency', 'price']) {
        const tooltips = await page.locator(`[id^="reglament-missing-${field}-"]`).all();
        for (const [index, tooltip] of tooltips.entries()) {
          const id = await tooltip.getAttribute('id');
          if (!id) throw new Error('Missing explanation ID');
          const button = page.locator(`[aria-describedby="${id}"]`);
          const shell = button.locator(`xpath=ancestor::*[@data-ui-sticky-table-shell]`);
          await expect
            .poll(() => shell.evaluate((element) => element.scrollWidth > element.clientWidth))
            .toBe(true);

          await placeButtonAtEdge(button, 'right');
          await button.tap();
          await expectReadableExplanation(tooltip);
          const topBeforeScroll = await tooltip.evaluate(
            (element) => element.getBoundingClientRect().top
          );

          await placeButtonAtEdge(button, 'left');
          await expectReadableExplanation(tooltip);
          expect(
            await tooltip.evaluate((element) => element.getBoundingClientRect().top)
          ).toBeCloseTo(topBeforeScroll, 0);
          if (index === 0)
            await test.info().attach(`${field}-${width}`, {
              body: await page.screenshot({
                path: test.info().outputPath(`${field}-${width}.png`)
              }),
              contentType: 'image/png'
            });
        }
      }
    });
  }

  test('keeps the last security row readable with keyboard focus and JavaScript disabled', async ({
    browser,
    baseURL,
    browserName
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 }
    });
    try {
      const page = await context.newPage();
      await page.goto('/815/regulation/');
      const shell = page.locator('section[aria-labelledby="security"]').locator(shellSelector);
      const tooltip = shell.locator('[id^="reglament-missing-base-"]').last();
      const id = await tooltip.getAttribute('id');
      if (!id) throw new Error('Missing explanation ID');
      const button = page.locator(`[aria-describedby="${id}"]`);
      await placeButtonAtEdge(button, 'right');
      await button.locator('xpath=ancestor::tr').locator('input[type="checkbox"]').focus();
      // Safari's default macOS keyboard navigation includes buttons with Option+Tab.
      await page.keyboard.press(
        browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
      );
      await expect(button).toBeFocused();
      await expectReadableExplanation(tooltip);
      await test.info().attach('last-security-row-no-js', {
        body: await page.screenshot({
          path: test.info().outputPath('last-security-row-no-js.png')
        }),
        contentType: 'image/png'
      });
    } finally {
      await context.close();
    }
  });
});
