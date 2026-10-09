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

const expectChevronExpanded = (locator: Locator, expanded: boolean): Promise<void> =>
  expect
    .poll(() =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.transform !== 'none' || (style.rotate !== 'none' && style.rotate !== '0deg');
      })
    )
    .toBe(expanded);

test('removes the closed tariff submenu from desktop keyboard flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/rules/', { waitUntil: 'networkidle' });

  const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
  const menu = page.locator('[data-site-nav-dropdown-menu]');
  const icon = page.locator('[data-site-nav-dropdown-icon]');
  const compareLink = page.getByRole('link', { name: 'Сравнение тарифов' });

  await expect(menu).toHaveAttribute('inert', '');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(tariffButton).toBeFocused();
  await expect(tariffButton).toHaveAttribute('aria-expanded', 'false');
  await expectChevronExpanded(icon, false);

  await page.keyboard.press('Enter');
  await expect(tariffButton).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).not.toHaveAttribute('inert', '');
  await expectChevronExpanded(icon, true);
  await page.keyboard.press('Tab');
  await expect(compareLink).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(tariffButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('inert', '');
  await expect(tariffButton).toBeFocused();
  await expectChevronExpanded(icon, false);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Карта', exact: true })).toBeFocused();
});

test('toggles the hovered tariff submenu and closes it from outside', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/', { waitUntil: 'networkidle' });

  const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
  const menu = page.locator('[data-site-nav-dropdown-menu]');
  const icon = page.locator('[data-site-nav-dropdown-icon]');

  await tariffButton.hover();
  await expect(menu).toBeVisible();
  await expectChevronExpanded(icon, true);

  await tariffButton.click();
  await expect(menu).toHaveAttribute('inert', '');
  await expectChevronExpanded(icon, false);

  await tariffButton.click();
  await expect(menu).toBeVisible();
  await expectChevronExpanded(icon, true);
  await tariffButton.click();
  await expect(menu).toHaveAttribute('inert', '');
  await expectChevronExpanded(icon, false);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).hover();
  await tariffButton.hover();
  await expect(menu).toBeVisible();
  await page.locator('.site-page-content').click({ position: { x: 2, y: 2 } });
  await expect(menu).toHaveAttribute('inert', '');
});

test('toggles the tariff submenu with touch activation', async ({ baseURL, browser }) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    viewport: { width: 1024, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
    const menu = page.locator('[data-site-nav-dropdown-menu]');

    await tariffButton.tap();
    await expect(menu).toBeVisible();
    await tariffButton.tap();
    await expect(menu).toHaveAttribute('inert', '');
  } finally {
    await context.close();
  }
});

test('keeps non-hover pen and touch activation open through pointer leave', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/', { waitUntil: 'networkidle' });

  const dropdown = page.locator('[data-site-nav-dropdown]');

  for (const pointerType of ['pen', 'touch'] as const) {
    const state = await dropdown.evaluate((element, currentPointerType) => {
      const button = element.querySelector<HTMLButtonElement>('[data-site-nav-dropdown-button]');
      const menu = element.querySelector<HTMLElement>('[data-site-nav-dropdown-menu]');
      if (!button || !menu) {
        throw new Error('Expected hydrated tariff dropdown');
      }

      element.dispatchEvent(
        new PointerEvent('pointerenter', {
          pointerId: 7,
          pointerType: currentPointerType
        })
      );
      const hiddenAfterEnter = menu.inert;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      const buttonFocused = document.activeElement === button;
      const hiddenAfterClick = menu.inert;
      element.dispatchEvent(
        new PointerEvent('pointerleave', {
          pointerId: 7,
          pointerType: currentPointerType
        })
      );
      const hiddenAfterLeave = menu.inert;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

      return {
        buttonFocused,
        hiddenStates: [hiddenAfterEnter, hiddenAfterClick, hiddenAfterLeave, menu.inert]
      };
    }, pointerType);

    expect(state).toEqual({
      buttonFocused: false,
      hiddenStates: [true, false, false, true]
    });
  }
});

test('keeps tariff links available without JavaScript', async ({ baseURL, browser }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
    const tariffButton = page.getByRole('button', { name: 'Тариф 815' });
    const menu = page.locator('[data-site-nav-dropdown-menu]');
    const icon = page.locator('[data-site-nav-dropdown-icon]');
    const compareLink = page.getByRole('link', { name: 'Сравнение тарифов' });

    await expect(menu).not.toHaveAttribute('inert', '');
    await expect(menu).toBeHidden();
    await expectChevronExpanded(icon, false);
    await tariffButton.hover();
    await expect(menu).toBeVisible();
    await expectChevronExpanded(icon, true);
    await brand.hover();
    await expect(menu).toBeHidden();
    await expectChevronExpanded(icon, false);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(tariffButton).toBeFocused();
    await expect(menu).toBeVisible();
    await expectChevronExpanded(icon, true);
    await page.keyboard.press('Tab');
    await expect(compareLink).toBeFocused();
  } finally {
    await context.close();
  }
});

test('shows non-color keyboard focus on the brand at desktop and mobile sizes', async ({
  page
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/reviews/', { waitUntil: 'networkidle' });

    const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
    await page.keyboard.press('Tab');

    await expect(brand).toBeFocused();
    expect(await hasNonColorFocusIndicator(brand)).toBe(true);
  }
});

for (const hasTouch of [false, true]) {
  for (const path of ['/reviews/', '/']) {
    test(`keeps the closed mobile panel transparent during logo navigation from ${path} (${hasTouch ? 'touch' : 'mouse'})`, async ({
      baseURL,
      browser
    }) => {
      const context = await browser.newContext({
        baseURL,
        hasTouch,
        viewport: { width: 390, height: 844 }
      });
      const page = await context.newPage();

      try {
        await page.goto(path);
        await expect(page.locator('details.site-header-menu')).toHaveAttribute(
          'data-site-header-menu-hydrated',
          'true'
        );
        await page.evaluate(() => {
          for (const eventName of ['astro:after-swap', 'astro:page-load']) {
            document.addEventListener(
              eventName,
              () => {
                const panel = document.querySelector('.site-header-mobile-panel');
                if (!panel) throw new Error('Expected mobile menu panel');
                sessionStorage.setItem(eventName, getComputedStyle(panel).opacity);
              },
              { once: true }
            );
          }
        });

        const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
        if (hasTouch) {
          await brand.tap();
        } else {
          await brand.click();
        }
        await expect
          .poll(() => page.evaluate(() => sessionStorage.getItem('astro:page-load')))
          .toBe('0');
        expect(await page.evaluate(() => sessionStorage.getItem('astro:after-swap'))).toBe('0');
        await expect(page).toHaveURL('/');

        const trigger = page.locator('summary[aria-label="Меню"]');
        await trigger.click();
        await expect(page.locator('.site-header-mobile-panel')).toHaveCSS('opacity', '1');
      } finally {
        await context.close();
      }
    });
  }
}

test('keeps the mobile menu usable without JavaScript', async ({ baseURL, browser }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  try {
    await page.goto('/reviews/');
    const trigger = page.locator('summary[aria-label="Меню"]');
    const panel = page.locator('.site-header-mobile-panel');
    await expect(panel).toBeHidden();
    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS('opacity', '1');
    await trigger.click();
    await expect(panel).toBeHidden();
  } finally {
    await context.close();
  }
});

test('shows keyboard-only focus on the mobile menu button', async ({ page }) => {
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
  await expect(page.locator('details.site-header-menu')).toHaveAttribute('open', '');
  expect(await hasNonColorFocusIndicator(menuButton)).toBe(false);
});

test('removes panel movement and animated chevrons with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/reviews/', { waitUntil: 'networkidle' });
    const mobile = width < 896;
    const trigger = page.locator(
      mobile ? 'summary[aria-label="Меню"]' : '[data-site-nav-dropdown-button]'
    );
    const panel = page.locator(
      mobile ? '.site-header-mobile-panel' : '[data-site-nav-dropdown-menu]'
    );
    const icon = page.locator(mobile ? '.site-header-menu-icon' : '[data-site-nav-dropdown-icon]');
    await expect(panel).toHaveCSS('transform', 'none');
    await expect(icon).toHaveCSS('transition-duration', '0s');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(panel).not.toHaveAttribute('inert', '');
    await expect(panel).toHaveCSS('transform', 'none');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveAttribute('inert', '');
    await expect(panel).toHaveCSS('transform', 'none');
  }
});

test('keeps mobile input immediate through repeated toggles and a layout change', async ({
  page
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/reviews/', { waitUntil: 'networkidle' });
    const trigger = page.locator('summary[aria-label="Меню"]');
    const panel = page.locator('.site-header-mobile-panel');
    await trigger.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Expected menu trigger');
      element.click();
      element.click();
      element.click();
    });
    await expect(panel).not.toHaveAttribute('inert', '');
    await panel.locator('a').first().focus();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(panel).toHaveAttribute('inert', '');
    await page.keyboard.press('Enter');
    await panel.locator('a').first().focus();
    await page.setViewportSize({ width: 896, height: 844 });
    await expect(page.locator('details.site-header-menu')).not.toHaveAttribute('open', '');
    await expect(page.getByRole('link', { name: 'Шелково Онлайн' })).toBeFocused();
    await page.setViewportSize({ width, height: 844 });
    await expect(panel).toHaveAttribute('inert', '');
  }
});

test('restores disappearing header focus without stealing focus from the page', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/reviews/rules/', { waitUntil: 'networkidle' });
  const brand = page.getByRole('link', { name: 'Шелково Онлайн' });
  const summary = page.locator('summary[aria-label="Меню"]');
  await summary.focus();
  await page.setViewportSize({ width: 896, height: 900 });
  await expect(brand).toBeFocused();
  await page.locator('.site-header-desktop-nav a').first().focus();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(brand).toBeFocused();
  const contentLink = page.locator('main a:visible').first();
  await contentLink.focus();
  await expect(contentLink).toBeFocused();
  await page.setViewportSize({ width: 896, height: 900 });
  await expect(contentLink).toBeFocused();
});

test('keeps the sticky desktop header visible while search is open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/reviews/', { waitUntil: 'networkidle' });

  const header = page.locator('.site-header');
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect
    .poll(() => header.evaluate((element) => element.getBoundingClientRect().top))
    .toBe(0);
  const scrollY = await page.evaluate(() => window.scrollY);

  await page.getByRole('button', { name: 'Поиск' }).click();
  await expect(page.locator('[data-search-dialog]')).toBeVisible();

  await expect
    .poll(() => header.evaluate((element) => element.getBoundingClientRect().top))
    .toBe(0);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
});
