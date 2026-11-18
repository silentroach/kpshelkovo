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

      const expectContentsScreenshot = async (name: string): Promise<void> => {
        await expect
          .poll(() => toc.evaluate((element) => element.getAnimations({ subtree: true }).length))
          .toBe(0);
        const clip = await toc.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const y = Math.max(0, Math.floor(rect.top + window.scrollY) - 16);
          return {
            x: 0,
            y,
            width: window.innerWidth,
            height: Math.ceil(rect.bottom + window.scrollY) + 16 - y
          };
        });
        // Full-page coordinates retain real gutters and the focus outside the TOC.
        await expect(page).toHaveScreenshot(name, { fullPage: true, clip });
      };

      if (width < 768) {
        const summary = toc.locator('summary');
        await expect(toc.getByRole('link').first()).not.toBeVisible();
        await expect(summary).toHaveAccessibleName('Содержание Показать');
        await expectContentsScreenshot(`${name}-${width}-closed.png`);
        await summary.focus();
        await page.keyboard.press('Enter');
        await expect(summary).toHaveAccessibleName('Содержание Скрыть');
      } else {
        await expect(toc.locator('summary')).not.toBeVisible();
      }

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

      await expectContentsScreenshot(`${name}-${width}.png`);

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

test('ordinary contents opens, survives resizing and closes without JavaScript', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/kb/services/gas/');
  const toc = page.getByRole('navigation', { name: 'Содержание', exact: true });
  const summary = toc.locator('summary');
  const links = toc.getByRole('link');
  await expect(links.first()).not.toBeVisible();
  await summary.click();
  await expect(links.first()).toBeVisible();
  const hrefs = await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(summary).not.toBeVisible();
  await expect(links.first()).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(summary).toHaveAccessibleName('Содержание Скрыть');
  await summary.focus();
  await page.keyboard.press('Space');
  await expect(links.first()).not.toBeVisible();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(links.first()).toBeVisible();
  expect(
    await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))
  ).toEqual(hrefs);
});

test.describe('contents motion', () => {
  test.use({ javaScriptEnabled: true });

  test('can reverse and respects reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/kb/ok/offer/shelkovo-park/');
    const toc = page.getByRole('navigation', { name: 'Содержание', exact: true });
    const summary = toc.locator('summary');
    const sampled = await toc.locator('details').evaluate(async (details) => {
      if (!(details instanceof HTMLDetailsElement)) throw new Error('Expected native disclosure');
      details.open = true;
      details.getBoundingClientRect();
      const fullHeight = details
        .querySelector('.ui-markdown-toc__inner')
        ?.getBoundingClientRect().height;
      const animations = details.getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
      await Promise.all(animations.map((animation) => animation.ready));
      for (const animation of animations) animation.currentTime = 50;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      return {
        height:
          details.getBoundingClientRect().height -
          (details.querySelector('summary')?.getBoundingClientRect().height ?? 0),
        fullHeight,
        animated: animations.length > 0
      };
    });
    expect(sampled.animated).toBe(true);
    expect(sampled.height).toBeGreaterThan(0);
    expect(sampled.height).toBeLessThan(sampled.fullHeight ?? 0);
    await summary.click();
    await toc.locator('details').evaluate((details) => {
      for (const animation of details.getAnimations({ subtree: true })) animation.finish();
    });
    await expect(toc.getByRole('link').first()).not.toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await summary.click();
    await expect(toc.getByRole('link').first()).toBeVisible();
    expect(
      await toc
        .locator('details')
        .evaluate((details) => details.getAnimations({ subtree: true }).length)
    ).toBe(0);
    await summary.click();
    await expect(toc.getByRole('link').first()).not.toBeVisible();
  });
});
