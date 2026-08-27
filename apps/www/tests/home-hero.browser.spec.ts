import { expect, type Page, test } from '@playwright/test';

type HeroMode = 'day' | 'night';

const fixedTimeByMode = {
  day: new Date('2026-05-11T12:00:00Z'),
  night: new Date('2026-05-11T17:30:00Z'),
} satisfies Readonly<Record<HeroMode, Date>>;

const getBuildMode = async (page: Page): Promise<HeroMode> => {
  const response = await page.request.get('/');
  const html = await response.text();
  const mode = html.match(/data-home-hero-mode="(day|night)"/u)?.[1];
  if (mode !== 'day' && mode !== 'night') {
    throw new Error('Expected the built home hero mode');
  }

  return mode;
};

const getOppositeMode = (mode: HeroMode): HeroMode =>
  mode === 'day' ? 'night' : 'day';

const getHeroAssetMode = (url: string): HeroMode | undefined => {
  if (url.includes('home-hero-day')) return 'day';
  if (url.includes('home-hero-night')) return 'night';

  return;
};

const collectHeroRequests = (page: Page): HeroMode[] => {
  const modes: HeroMode[] = [];
  page.on('request', (request) => {
    if (request.resourceType() !== 'image') return;

    const mode = getHeroAssetMode(request.url());
    if (mode) modes.push(mode);
  });

  return modes;
};

test('loads only the runtime panorama on a JavaScript full load', async ({
  page,
}) => {
  const buildMode = await getBuildMode(page);
  const runtimeMode = getOppositeMode(buildMode);
  await page.clock.setFixedTime(fixedTimeByMode[runtimeMode]);
  const heroRequests = collectHeroRequests(page);

  await page.goto('/', { waitUntil: 'networkidle' });
  const image = page.locator('[data-home-hero-image]');

  await expect(image).toBeVisible();
  const src = await image.getAttribute('src');
  if (!src) throw new Error('Expected the runtime hero source');
  expect(getHeroAssetMode(src)).toBe(runtimeMode);
  expect(heroRequests).toEqual([runtimeMode]);
});

test('loads only the runtime panorama after an Astro navigation', async ({
  page,
}) => {
  const buildMode = await getBuildMode(page);
  const runtimeMode = getOppositeMode(buildMode);
  await page.clock.setFixedTime(fixedTimeByMode[runtimeMode]);
  await page.goto('/reviews/rules/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    Reflect.set(window, Symbol.for('home-hero-transition-test'), true);
  });
  const heroRequests = collectHeroRequests(page);

  await page.getByRole('link', { name: 'Шелково Онлайн' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-home-hero-image]')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, Symbol.for('home-hero-transition-test')) === true,
    ),
  ).toBe(true);
  expect(heroRequests).toEqual([runtimeMode]);
});

test('loads the built panorama on a direct no-JavaScript visit', async ({
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
    const buildMode = await getBuildMode(page);
    const heroRequests = collectHeroRequests(page);

    await page.goto('/', { waitUntil: 'networkidle' });
    const fallback = page.locator('[data-home-hero-fallback]');

    await expect(fallback).toBeVisible();
    expect(
      getHeroAssetMode(
        await fallback.evaluate(
          (element) => getComputedStyle(element).backgroundImage,
        ),
      ),
    ).toBe(buildMode);
    expect(heroRequests).toEqual([buildMode]);
  } finally {
    await context.close();
  }
});
