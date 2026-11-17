import { expect, test } from '@playwright/test';

const pages = [
  { name: 'offer', path: '/kb/ok/offer/shelkovo-park/' },
  { name: 'development-plan', path: '/kb/ok/development-plan-2026/' }
] as const;

for (const { name, path } of pages) {
  for (const width of [320, 390, 768, 1440]) {
    test(`${name} contents at ${width}px without JavaScript`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(path);
      await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');

      const toc = page.getByRole('navigation', { name: 'Содержание', exact: true });
      await expect(toc).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      if (name === 'offer') {
        const gaps = await toc.locator('.ui-markdown-toc__group > ul > li').evaluateAll((items) =>
          items.flatMap((item) => {
            const previous = item.previousElementSibling;
            return previous
              ? [item.getBoundingClientRect().top - previous.getBoundingClientRect().bottom]
              : [];
          })
        );
        expect(gaps.length).toBeGreaterThan(0);
        expect(
          Math.max(...gaps),
          'Flat contents must not have section-sized gaps'
        ).toBeLessThanOrEqual(8);
      }

      await expect(toc).toHaveScreenshot(`${name}-${width}.png`);

      const link = toc.getByRole('link').last();
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^#.+/u);
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL((url) => decodeURIComponent(url.hash) === href);
      await expect(page.locator(':target')).toBeInViewport();
    });
  }
}
