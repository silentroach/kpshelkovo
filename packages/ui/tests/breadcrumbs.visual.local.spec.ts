import { expect, test } from '@playwright/test';

test.describe('Breadcrumbs visual', () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('renders a section trail with a current page item', async ({ page }) => {
    const target = page.getByTestId('breadcrumbs-section');
    const list = target.locator('ol');

    await expect(list).toHaveAttribute('itemtype', 'https://schema.org/BreadcrumbList');
    const schemaItems = list.locator('[itemprop="itemListElement"]');
    await expect(schemaItems).toHaveCount(2);
    await expect(schemaItems.first()).toHaveAttribute('itemtype', 'https://schema.org/ListItem');
    await expect(schemaItems.first().locator('[itemprop="position"]')).toHaveAttribute(
      'content',
      '1'
    );
    await expect(schemaItems.last().locator('[itemprop="position"]')).toHaveAttribute(
      'content',
      '2'
    );
    await expect(target.getByRole('link', { name: 'Главная' })).toBeVisible();
    await expect(target.locator('[aria-current="page"]')).toHaveText('Новости');
    await expect(list).toHaveCSS('display', 'flex');

    await expect(target).toHaveScreenshot('breadcrumbs-section.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device'
    });
  });

  test('hides a section trail on narrow screens when only home would remain', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const target = page.getByTestId('breadcrumbs-section');

    await expect(target.locator('nav[aria-label="Хлебные крошки"]')).toBeHidden();
  });

  test('preserves pointer and keyboard link affordances', async ({ page }) => {
    const link = page.getByTestId('breadcrumbs-section').getByRole('link', { name: 'Главная' });
    const readStyles = () =>
      link.evaluate((element) => {
        const styles = getComputedStyle(element);

        return {
          color: styles.color,
          decorationColor: styles.textDecorationColor,
          decorationLine: styles.textDecorationLine,
          underlineOffset: styles.textUnderlineOffset,
          transitionProperty: styles.transitionProperty
        };
      });

    const resting = await readStyles();

    expect(resting.decorationLine).toBe('underline');
    expect(resting.decorationColor).toBe('rgba(0, 0, 0, 0)');
    expect(resting.underlineOffset).toBe('3.08px');
    expect(resting.transitionProperty).toBe('color, text-decoration-color, text-underline-offset');

    await page.keyboard.press('Tab');
    await expect(link).toBeFocused();
    await expect
      .poll(async () => (await readStyles()).decorationColor)
      .not.toBe(resting.decorationColor);
    await expect.poll(async () => (await readStyles()).underlineOffset).toBe('2.52px');

    await link.evaluate((element) => element.blur());
    await link.hover();
    await expect.poll(async () => (await readStyles()).color).not.toBe(resting.color);
    await expect
      .poll(async () => (await readStyles()).decorationColor)
      .not.toBe(resting.decorationColor);
    await expect.poll(async () => (await readStyles()).underlineOffset).toBe('2.52px');
  });

  test('renders a long trail when the last item stays linked', async ({ page }) => {
    const target = page.getByTestId('breadcrumbs-article');
    const list = target.locator('ol');

    await expect(target.getByRole('link', { name: 'Запуск уличного освещения' })).toBeVisible();
    await expect(target.locator('[aria-current="page"]')).toHaveCount(0);
    await expect(list).toHaveCSS('display', 'flex');

    await expect(target).toHaveScreenshot('breadcrumbs-article.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device'
    });
  });

  test('omits unlinked intermediate labels from structured data', async ({ page }) => {
    const target = page.getByTestId('breadcrumbs-unlinked-section');
    const items = target.locator('li');
    const schemaItems = target.locator('[itemprop="itemListElement"]');

    await expect(items).toHaveCount(3);
    await expect(items.nth(1)).not.toHaveAttribute('itemscope', '');
    await expect(schemaItems).toHaveCount(2);
    await expect(schemaItems.last().locator('[itemprop="position"]')).toHaveAttribute(
      'content',
      '2'
    );
  });

  for (const width of [320, 390, 639]) {
    test(`shows only vertical parents without JavaScript at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const section = page.getByTestId('breadcrumbs-section').locator('nav');
      await expect(section).toBeHidden();
      expect(await section.evaluate((element) => element.getClientRects().length)).toBe(0);

      const target = page.getByTestId('breadcrumbs-article');
      await expect(target.locator('ol')).toHaveCount(1);
      await expect(target.getByRole('link')).toHaveText(['Новости', '2026', 'Май']);
      await expect(target.locator('li').first()).toBeHidden();
      await expect(target.locator('li').last()).toBeHidden();
      await expect(target.locator('[itemprop="itemListElement"]')).toHaveCount(5);
      expect(
        await target
          .locator('[itemprop="position"]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('content')))
      ).toEqual(['1', '2', '3', '4', '5']);

      const parents = target.locator('li:visible');
      await expect(parents.first().locator('[aria-hidden="true"]')).toBeHidden();
      const rows = await parents.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, height: box.height };
        })
      );
      expect(rows.map((row) => row.x - rows[0]!.x)).toEqual([0, 12, 12]);
      expect(rows.map((row) => row.y - rows[0]!.y)).toEqual([0, 24, 48]);
      expect(rows.map((row) => row.height)).toEqual([24, 24, 24]);
      const arrows = await parents
        .locator('[aria-hidden="true"]:visible')
        .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().x));
      expect(arrows).toEqual([rows[0]!.x + 12, rows[0]!.x + 12]);
      await expect
        .poll(() =>
          target
            .getByRole('link')
            .first()
            .evaluate((element) => getComputedStyle(element).color)
        )
        .toBe(await target.locator('ol').evaluate((element) => getComputedStyle(element).color));

      const unlinked = page.getByTestId('breadcrumbs-unlinked-section');
      await expect(unlinked.locator('li:visible')).toHaveText('Люди', { useInnerText: true });
      await expect(unlinked.getByRole('link')).toHaveCount(0);
    });
  }

  for (const width of [640, 768, 1023]) {
    test(`shows horizontal parents without JavaScript at ${width}px`, async ({ page }) => {
      const target = page.getByTestId('breadcrumbs-article');
      const wideColor = await target
        .getByRole('link', { name: 'Новости', exact: true })
        .evaluate((element) => getComputedStyle(element).color);
      await page.setViewportSize({ width, height: 844 });
      const section = page.getByTestId('breadcrumbs-section').locator('nav');
      await expect(section).toBeHidden();
      expect(await section.evaluate((element) => element.getClientRects().length)).toBe(0);
      await expect(target.locator('ol')).toHaveCount(1);
      await expect(target.getByRole('link')).toHaveText(['Новости', '2026', 'Май']);
      await expect(target.locator('li').first()).toBeHidden();
      await expect(target.locator('li').last()).toBeHidden();
      await expect(target.locator('[itemprop="itemListElement"]')).toHaveCount(5);
      expect(
        await target
          .locator('[itemprop="position"]')
          .evaluateAll((elements) => elements.map((element) => element.getAttribute('content')))
      ).toEqual(['1', '2', '3', '4', '5']);

      const parents = target.locator('li:visible');
      await expect(parents.first().locator('[aria-hidden="true"]')).toBeHidden();
      await expect(parents.locator('[aria-hidden="true"]:visible')).toHaveCount(2);
      const rows = await parents.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, height: box.height };
        })
      );
      expect(rows.map((row) => row.y - rows[0]!.y)).toEqual([0, 0, 0]);
      expect(rows.map((row) => row.height)).toEqual([20, 20, 20]);
      expect(rows[1]!.x).toBeGreaterThan(rows[0]!.x);
      expect(rows[2]!.x).toBeGreaterThan(rows[1]!.x);
      const navX = await target
        .locator('nav')
        .evaluate((element) => element.getBoundingClientRect().x);
      expect(rows[0]!.x).toBe(navX);
      expect(
        await target
          .getByRole('link')
          .first()
          .evaluate((element) => element.getBoundingClientRect().x)
      ).toBe(navX);
      for (const parent of await parents.all())
        await expect(parent).toHaveCSS('margin-left', '0px');
      await expect(target.locator('nav')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(target.locator('nav')).toHaveCSS('padding-top', '0px');
      await expect(target.locator('nav')).toHaveCSS('padding-bottom', '0px');
      await expect
        .poll(() =>
          target
            .getByRole('link')
            .first()
            .evaluate((element) => getComputedStyle(element).color)
        )
        .toBe(wideColor);
      const unlinked = page.getByTestId('breadcrumbs-unlinked-section');
      await expect(unlinked.locator('li:visible')).toHaveText('Люди', { useInnerText: true });
      await expect(unlinked.getByRole('link')).toHaveCount(0);
    });
  }

  test('retains the complete desktop trail at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 844 });
    await expect(page.getByTestId('breadcrumbs-section').locator('nav')).toBeVisible();
    const target = page.getByTestId('breadcrumbs-article');
    await expect(target.getByRole('link')).toHaveCount(5);
    const rows = await target
      .locator('li')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
    expect(rows[1]).toBe(rows[0]);
    expect(rows[2]).toBe(rows[0]);
  });
  for (const width of [320, 640, 768, 1023]) {
    test(`wraps a long parent naturally with enlarged text at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const fontSize of ['16px', '32px']) {
        await page.locator('html').evaluate((element, value) => {
          element.style.fontSize = value;
        }, fontSize);
        const target = page.getByTestId('breadcrumbs-long');
        await expect(target.locator('[aria-current="page"]')).toBeHidden();
        const link = target.getByRole('link', {
          name: 'Документы и правила обслуживания общего имущества посёлка'
        });
        await expect(link).toBeVisible();
        const geometry = await link.locator('span').evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const lines = Array.from(range.getClientRects(), (rect) => ({ x: rect.x, y: rect.y }));
          const arrow = element.closest('li')!.querySelector('[aria-hidden="true"]')!;
          return { lines, arrowY: arrow.getBoundingClientRect().y };
        });
        expect(geometry.lines.length).toBeGreaterThan(1);
        for (const line of geometry.lines) expect(line.x).toBeCloseTo(geometry.lines[0]!.x, 1);
        if (width < 640) expect(Math.abs(geometry.arrowY - geometry.lines[0]!.y)).toBeLessThan(8);
        const parentRows = await target
          .locator('li:visible')
          .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
        expect(parentRows[1]!).toBeGreaterThan(parentRows[0]!);
        const bounds = await target.locator('nav').evaluate((element) => ({
          width: element.getBoundingClientRect().width,
          contentWidth: element.scrollWidth
        }));
        expect(bounds.contentWidth).toBeLessThanOrEqual(Math.ceil(bounds.width));
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
      }
    });
  }

  test('keeps full structured names, URLs and positions across both boundaries', async ({
    page
  }) => {
    const target = page.getByTestId('breadcrumbs-article');
    const readTrail = () =>
      target.locator('[itemprop="itemListElement"]').evaluateAll((elements) =>
        elements.map((element) => ({
          name: element.querySelector('[itemprop="name"]')?.textContent?.trim(),
          href: element.querySelector('[itemprop="item"]')?.getAttribute('href'),
          position: element.querySelector('[itemprop="position"]')?.getAttribute('content')
        }))
      );
    const wideTrail = await readTrail();
    expect(wideTrail).toHaveLength(5);
    for (const width of [639, 640, 1023, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(target.locator('ol')).toHaveCount(1);
      expect(await readTrail()).toEqual(wideTrail);
    }
  });

  for (const width of [390, 640, 1023]) {
    test(`focuses only visible parents and activates their original URL at ${width}px`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 844 });
      const target = page.getByTestId('breadcrumbs-article');
      for (const name of ['Новости', '2026', 'Май']) {
        await page.keyboard.press('Tab');
        const link = target.getByRole('link', { name, exact: true });
        await expect(link).toBeFocused();
        await expect(link).toHaveCSS('outline-style', 'solid');
        await expect(link).toHaveCSS('outline-width', '2px');
      }
      await page.keyboard.press('Tab');
      await expect(
        page.getByTestId('breadcrumbs-long').getByRole('link', { name: 'Справка', exact: true })
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/news/2026/05/');
    });
  }
});
