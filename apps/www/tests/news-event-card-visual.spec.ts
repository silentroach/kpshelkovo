import { expect, test, type Locator } from '@playwright/test';

import { expectPaintedContent, waitForVisualPaint } from './config/visual-content';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device'
} as const;

// Same minimal SDK shape as compare-controls.browser.spec.ts. The fixture supplies
// static map chrome; real MapPreview code clones and passes the production marker.
const yandexMapsReadyScript = `
  window.ymaps3 = {
    ready: new Promise(resolve => window.addEventListener('fixture:maps-ready', resolve, { once: true })),
    YMap: class {
      constructor(container, props) {
        this.container = container;
        container.append(document.querySelector('#map-sdk-fixture').content.cloneNode(true));
        if (props.copyrightsPosition === 'bottom right') {
          const copyright = container.querySelector('.ymaps3--map-copyrights');
          copyright.style.left = 'auto';
          copyright.style.right = '8px';
        }
      }
      addChild(child) {
        if (child.el) this.container.querySelector('[data-fixture-marker]').append(child.el);
        if (child.props) window.addEventListener('fixture:tiles-ready', () => child.props.onStateChanged({
          getLayerState: () => ({ tilesReady: 1, tilesTotal: 1 })
        }), { once: true });
      }
      destroy() {}
    },
    YMapDefaultSchemeLayer: class { static defaultProps = { source: 'fixture' }; },
    YMapDefaultFeaturesLayer: class {},
    YMapMarker: class {
      constructor(_options, el) { this.el = el; }
    },
    YMapListener: class {
      constructor(props) { this.props = props; }
    },
  };
`;

const expectCalendarOnly = async (target: Locator, icsUrl: string): Promise<void> => {
  const actions = target.locator('.news-event-actions');
  const calendarLink = actions.getByRole('link', { name: 'Добавить в календарь' });

  await expect(actions.locator('a, button')).toHaveCount(1);
  await expect(calendarLink).toHaveAttribute('href', icsUrl);
  await expect(calendarLink).toHaveAttribute('download', /.+\.ics$/);
  await expectPaintedContent(calendarLink);
};

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1100 }],
  ['mobile', { width: 390, height: 900 }]
] as const) {
  test.describe(`EventWidget ${device}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.route('https://api-maps.yandex.ru/**', (route) => route.abort());
      await page.addInitScript(yandexMapsReadyScript);
      await page.goto('/');
      await waitForVisualPaint(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });

    test('hands off the map fallback to native controls with only the calendar below', async ({
      page
    }) => {
      const target = page.getByTestId('news-event-card-coordinates');

      await expect(target.getByRole('complementary')).toBeVisible();
      await expect(target.getByRole('heading')).toBeVisible();
      const preview = target.locator('map-preview');
      await expect(preview).toHaveAttribute(
        'data-preview',
        JSON.stringify({
          coordinates: { lat: 55.123456, lng: 38.654321 },
          zoom: 16,
          anchor: [0.75, 0.45],
          muted: true,
          mutedOpacity: 0.4,
          copyrightsPosition: 'bottom right'
        })
      );
      await expect(target.locator('iframe')).toHaveCount(0);
      const canvas = preview.locator('[data-canvas]');
      const fallback = preview.locator('a[data-fallback]');
      const openMaps = canvas.getByRole('button', { name: 'Открыть в Яндекс Картах' });
      await expect(preview.locator('[data-message]')).toHaveCount(0);
      await expect(fallback).toBeVisible();
      await expect(canvas).toHaveJSProperty('inert', true);
      await fallback.focus();
      await expect(fallback).toBeFocused();

      // Release SDK readiness after focusing the SSR link; real MapPreview owns the handoff.
      await page.evaluate(() => window.dispatchEvent(new Event('fixture:maps-ready')));
      await expect(canvas.locator('.ymaps3--open-maps-button')).toBeAttached();
      await expect(canvas).toBeHidden();
      await expect(fallback).toBeVisible();
      await expect(fallback).toBeFocused();
      await page.evaluate(() => window.dispatchEvent(new Event('fixture:tiles-ready')));
      await expect(fallback).toBeHidden();
      await expect(fallback).toHaveAttribute(
        'href',
        'https://yandex.ru/maps/?pt=38.654321,55.123456&z=18&l=map'
      );
      await expect(canvas).toHaveJSProperty('inert', false);
      await expect(openMaps).toBeFocused();
      await expect(canvas.locator('svg')).toBeVisible();
      const marker = canvas.locator('span.ui-map-marker');
      await expect(marker).toHaveCount(1);
      await expect(marker).toHaveAttribute('aria-hidden', 'true');
      await expect(marker).toBeVisible();
      const markerBox = await marker.boundingBox();
      if (!markerBox) throw new Error('Missing map marker');
      expect(markerBox.width).toBe(18);
      expect(markerBox.height).toBe(18);

      const openMapsBox = await openMaps.boundingBox();
      if (!openMapsBox) throw new Error('Missing native OpenMaps action');
      expect(markerBox.y).toBeGreaterThan(openMapsBox.y + openMapsBox.height);
      for (const text of ['30', 'сентября']) {
        const dateBox = await target.getByText(text, { exact: true }).boundingBox();
        if (!dateBox) throw new Error(`Missing date text: ${text}`);
        const overlaps =
          dateBox.x < openMapsBox.x + openMapsBox.width &&
          dateBox.x + dateBox.width > openMapsBox.x &&
          dateBox.y < openMapsBox.y + openMapsBox.height &&
          dateBox.y + dateBox.height > openMapsBox.y;
        expect(overlaps, `Date text "${text}" overlaps OpenMaps`).toBe(false);
      }

      await expect(target.getByRole('link', { name: 'КП Шелково, эко-клуб' })).toHaveAttribute(
        'href',
        '/map/club/'
      );
      await expectCalendarOnly(target, '/news/2026/05/reglament/event.ics');

      // Native SDK controls must remain reachable through the card's content layer.
      await target.getByRole('heading').getByRole('link').focus();
      for (const action of [
        openMaps,
        canvas.getByRole('link', { name: 'Условия использования', exact: true }),
        canvas.getByRole('link', { name: 'Яндекс Карты', exact: true })
      ]) {
        await page.keyboard.press('Shift+Tab');
        await expect(action).toBeFocused();
        await action.click({ trial: true });
      }
      const copyright = await canvas
        .getByRole('link', { name: 'Яндекс Карты', exact: true })
        .boundingBox();
      const calendar = await target
        .getByRole('link', { name: 'Добавить в календарь' })
        .boundingBox();
      if (!copyright || !calendar) throw new Error('Missing copyright or calendar action');
      expect(copyright.y).toBeGreaterThan(calendar.y + calendar.height);
      await page.mouse.move(0, 0);
      await canvas.getByRole('link', { name: 'Яндекс Карты', exact: true }).blur();

      await expect(target).toHaveScreenshot(
        `news-event-card-coordinates-${device}.png`,
        screenshot
      );
    });

    test('renders an event without a place with only the calendar action', async ({ page }) => {
      const target = page.getByTestId('news-event-card-no-place');

      await expect(target.getByRole('complementary')).toBeVisible();
      await expect(target.getByRole('heading')).toBeVisible();
      await expect(target.locator('iframe')).toHaveCount(0);
      await expect(target.locator('map-preview')).toHaveCount(0);
      await expect(target.locator('.ui-map-marker')).toHaveCount(0);
      await expectCalendarOnly(target, '/news/2026/06/entrance/event.ics');
      await expect(target.getByRole('heading').getByRole('link')).toHaveAttribute(
        'href',
        '/events/2026/06/entrance-meeting/'
      );
      await expect(target.getByRole('link')).toHaveCount(2);

      await expect(target).toHaveScreenshot(`news-event-card-no-place-${device}.png`, screenshot);
    });

    test('uses the news map appearance and a single map action in event details', async ({
      page
    }) => {
      const detail = page.getByTestId('event-detail');
      const location = detail.getByRole('complementary');
      await location.scrollIntoViewIfNeeded();
      const preview = location.locator('map-preview');
      const newsPreview = page.getByTestId('news-event-card-coordinates').locator('map-preview');
      expect(await preview.getAttribute('data-preview')).toBe(
        await newsPreview.getAttribute('data-preview')
      );
      const fallback = preview.locator('[data-fallback]');
      const canvas = preview.locator('[data-canvas]');
      const openMaps = canvas.getByRole('button', { name: 'Открыть в Яндекс Картах' });
      await expect(location.locator('a[href^="https://yandex.ru/maps/"]')).toHaveCount(1);
      await fallback.focus();
      await page.evaluate(() => window.dispatchEvent(new Event('fixture:maps-ready')));
      await expect(canvas.locator('.ymaps3--open-maps-button')).toBeAttached();
      await page.evaluate(() => window.dispatchEvent(new Event('fixture:tiles-ready')));
      await expect(fallback).toBeHidden();
      await expect(openMaps).toBeFocused();
      await expect(location.getByRole('link', { name: 'Открыть', exact: false })).toHaveCount(0);
      await openMaps.click({ trial: true });
      const copyright = canvas.locator('.ymaps3--map-copyrights');
      await openMaps.blur();
      await page.mouse.move(0, 0);
      await expect(copyright).toHaveCSS('opacity', '0.4');
      const logo = canvas.getByRole('link', { name: 'Яндекс Карты', exact: true });
      await logo.focus();
      await expect(copyright).toHaveCSS('opacity', '1');
      await logo.click({ trial: true });
      await logo.blur();
      await page.mouse.move(0, 0);
      await expect(detail.getByRole('link', { name: 'Добавить в календарь' })).toHaveAttribute(
        'href',
        '/events/calendar/reglament.ics'
      );
      await expect(location.getByRole('link', { name: 'Добавить в календарь' })).toHaveCount(0);
      await expect(location.getByRole('heading', { name: 'Встреча по регламенту' })).toBeVisible();
      await expect(location.getByRole('heading').getByRole('link')).toHaveCount(0);
      await expect(detail.locator('header time')).toHaveCount(0);
      await expect(detail.locator('header a[download]')).toHaveCount(1);
      await expect(location).toHaveScreenshot(`event-location-${device}.png`, screenshot);
    });

    test('marks cancellation on the date without an icon or calendar download', async ({
      page
    }) => {
      const target = page.getByTestId('news-event-card-cancelled');
      await target.scrollIntoViewIfNeeded();
      const date = target.locator('time');
      await expect(date).toHaveAttribute('aria-label', /^Отменено:/);
      await expect(date).toHaveAttribute('title', 'Отменено');
      await expect(target.getByRole('img', { name: 'Отменено' })).toHaveCount(0);
      await expect(target.locator('a[download]')).toHaveCount(0);
      for (const part of await date.locator('span').all()) {
        await expect(part).toHaveCSS('text-decoration-line', 'line-through');
        await part.hover({ timeout: 5_000 });
        expect(await date.evaluate((element) => element.matches(':hover'))).toBe(true);
      }
      await page.mouse.move(0, 0);
      await expect(target).toHaveScreenshot(`news-event-card-cancelled-${device}.png`, screenshot);
    });
  });
}
