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
    ready: Promise.resolve(),
    YMap: class {
      constructor(container) {
        this.container = container;
        container.append(document.querySelector('#map-sdk-fixture').content.cloneNode(true));
      }
      addChild(child) {
        if (!child.el) return;
        this.container.querySelector('[data-fixture-marker]').append(child.el);
      }
      destroy() {}
    },
    YMapDefaultSchemeLayer: class {},
    YMapDefaultFeaturesLayer: class {},
    YMapMarker: class {
      constructor(_options, el) { this.el = el; }
    },
    YMapListener: class {},
  };
`;

const expectActions = async (target: Locator, icsUrl: string, mapUrl?: string): Promise<void> => {
  const calendarLink = target.getByRole('link', { name: 'Добавить в календарь' });
  const mapLink = target.getByRole('link', { name: 'Открыть на Яндекс Картах' });

  await expect(calendarLink).toHaveAttribute('href', icsUrl);
  await expect(calendarLink).toHaveAttribute('download', /.+\.ics$/);
  await expectPaintedContent(calendarLink);
  if (mapUrl) {
    await expect(mapLink).toHaveAttribute('href', mapUrl);
    await expect(mapLink).toHaveAttribute('target', '_blank');
    await expectPaintedContent(mapLink);
  } else {
    await expect(mapLink).toHaveCount(0);
    await expect(target.getByRole('link')).toHaveCount(1);
  }
};

for (const [device, viewport] of [
  ['desktop', { width: 1440, height: 1100 }],
  ['mobile', { width: 390, height: 900 }]
] as const) {
  test.describe(`NewsEventCard compact ${device}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.route('https://api-maps.yandex.ru/**', (route) => route.abort());
      await page.addInitScript(yandexMapsReadyScript);
      await page.goto('/');
      await waitForVisualPaint(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });

    test('renders coordinates with background map, pin and actions', async ({ page }) => {
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
          mutedOpacity: 0.4
        })
      );
      await expect(target.locator('iframe')).toHaveCount(0);
      const canvas = preview.locator('[data-canvas]');
      await expect(canvas.locator('svg')).toBeVisible();
      const marker = canvas.locator('span.ui-map-marker.news-event-compact-map-pin');
      await expect(marker).toHaveCount(1);
      await expect(marker).toHaveAttribute('aria-hidden', 'true');
      await expect(marker).toBeVisible();
      const markerBox = await marker.boundingBox();
      if (!markerBox) throw new Error('Missing map marker');
      expect(markerBox.width).toBe(18);
      expect(markerBox.height).toBe(18);

      const openMapsBox = await canvas
        .getByRole('link', { name: 'Открыть в Яндекс Картах' })
        .boundingBox();
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
      await expectActions(
        target,
        '/news/2026/05/reglament/event.ics',
        'https://yandex.ru/maps/?pt=38.654321,55.123456&z=18&l=map'
      );

      // Native SDK controls must remain reachable through the card's content layer.
      await target.getByRole('link', { name: 'КП Шелково, эко-клуб' }).focus();
      for (const name of ['Открыть в Яндекс Картах', 'Условия использования', 'Яндекс Карты']) {
        const action = canvas.getByRole('link', { name, exact: true });
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
      await expect(target.locator('.news-event-compact-map-pin')).toHaveCount(0);
      await expectActions(target, '/news/2026/06/entrance/event.ics');

      await expect(target).toHaveScreenshot(`news-event-card-no-place-${device}.png`, screenshot);
    });
  });
}
