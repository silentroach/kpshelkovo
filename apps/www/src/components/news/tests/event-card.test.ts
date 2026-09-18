import { Window } from 'happy-dom';
/// <reference types="astro/client" />
import { describe, expect, it } from 'vitest';

import type { NewsEvent } from '@/lib/news/types';
import { testPlace } from '@/lib/places/tests/place.test-helper';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import NewsEventCard from '../NewsEventCard.astro';

const event: NewsEvent = {
  slug: 'meeting',
  title: 'Встреча',
  startsAt: new Date('2026-05-02T09:00:00Z'),
  startsIso: '2026-05-02T12:00:00+03:00',
  startsTime: '12:00',
  icsUrl: '/news/2026/05/meeting/meeting.ics'
};

describe('event place card', () => {
  it.each(['wide', 'compact'])(
    'links a hidden place and keeps its map in the %s variant',
    async (variant) => {
      const place = testPlace({ name: 'Green Dreams', mapUrl: 'https://yandex.ru/navi/meeting' });
      const container = await createAstroContainer();
      const html = await container.renderToString(NewsEventCard, {
        props: {
          variant,
          event: { ...event, place, locationDetails: 'в беседке' }
        }
      });
      expect(html).toContain(`href="${place.url}"`);
      expect(html).toContain('Green Dreams</a>');
      expect(html).toContain('беседке');
      expect(html).toContain(`href="${place.mapUrl}"`);
      expect(html).toContain(`href="${event.icsUrl}"`);
      expect(html).not.toContain('<iframe');
      expect(html.includes('<map-preview')).toBe(variant === 'compact');
    }
  );

  it.each(['wide', 'compact'])(
    'keeps the calendar but omits location and map without a place: %s',
    async (variant) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(NewsEventCard, { props: { variant, event } });
      expect(html).toContain(`href="${event.icsUrl}"`);
      expect(html).not.toContain('href="/map/');
      expect(html).not.toContain('https://yandex.ru');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('<map-preview');
    }
  );

  it('sends only the canonical event point, without place icon, areas or live hours', async () => {
    const place = testPlace({
      marker: 'fish',
      openingHours: { periods: [{ days: ['mon'], opensAt: '09:00', closesAt: '18:00' }] },
      geometry: {
        area: {
          precision: 'approximate',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [38, 55],
                [39, 55],
                [38, 56],
                [38, 55]
              ]
            ]
          }
        }
      }
    });
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsEventCard, {
      props: { variant: 'compact', event: { ...event, place } }
    });
    const window = new Window();
    try {
      window.document.body.innerHTML = html;
      const preview = window.document.querySelector('map-preview');
      expect(JSON.parse(preview?.getAttribute('data-preview') ?? '{}')).toMatchInlineSnapshot(`
        {
          "anchor": [
            0.75,
            0.25,
          ],
          "coordinates": {
            "lat": 55,
            "lng": 38,
          },
          "muted": true,
          "zoom": 16,
        }
      `);
      const marker = preview?.querySelector('template')?.content;
      expect(marker?.querySelectorAll('.ui-map-marker')).toHaveLength(1);
      expect(marker?.querySelectorAll('img, [data-open]')).toHaveLength(0);
      expect(preview?.querySelector('[data-fallback]')).toBeFalsy();
    } finally {
      await window.happyDOM.close();
    }
  });
});
