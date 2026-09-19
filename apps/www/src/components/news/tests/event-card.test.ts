import { Window } from 'happy-dom';
/// <reference types="astro/client" />
import { describe, expect, it } from 'vitest';

import { newsEventRecord } from '@/lib/news/tests/event.test-helper';
import type { NewsEvent } from '@/lib/news/types';
import { testPlace } from '@/lib/places/tests/place.test-helper';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import NewsEventCard from '../NewsEventCard.astro';

const event: NewsEvent = {
  ...newsEventRecord({ title: 'Встреча', starts_at: '02.05.2026 12:00' }),
  slug: 'meeting',
  title: 'Встреча',
  startsAt: new Date('2026-05-02T09:00:00Z'),
  startsIso: '2026-05-02T12:00:00+03:00',
  startsTime: '12:00',
  icsUrl: '/news/2026/05/meeting/meeting.ics'
};

describe('event place card', () => {
  it('links a hidden place and keeps its map in the compact card', async () => {
    const place = testPlace({ name: 'Green Dreams', mapUrl: 'https://yandex.ru/navi/meeting' });
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsEventCard, {
      props: {
        event: { ...event, place, locationDetails: 'в беседке' }
      }
    });
    expect(html).toContain(`href="${place.url}"`);
    expect(html).toContain('Green Dreams</a>');
    expect(html).toContain('беседке');
    expect(html).toContain(`href="${place.mapUrl}"`);
    expect(html).toContain(`href="${event.icsUrl}"`);
    expect(html).not.toContain('<iframe');
    expect(html).toContain('<map-preview');
  });

  it('keeps the calendar but omits place links and map without a place', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(NewsEventCard, { props: { event } });
    expect(html).toContain(`href="${event.icsUrl}"`);
    expect(html).not.toContain('href="/map/');
    expect(html).not.toContain('https://yandex.ru');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<map-preview');
  });

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
      props: { event: { ...event, place } }
    });
    const window = new Window();
    try {
      window.document.body.innerHTML = html;
      const preview = window.document.querySelector('map-preview');
      expect(JSON.parse(preview?.getAttribute('data-preview') ?? '{}')).toMatchInlineSnapshot(`
        {
          "anchor": [
            0.75,
            0.45,
          ],
          "coordinates": {
            "lat": 55,
            "lng": 38,
          },
          "muted": true,
          "mutedOpacity": 0.4,
          "zoom": 16,
        }
      `);
      const marker = preview?.querySelector('template')?.content;
      expect(marker?.querySelectorAll('.ui-map-marker')).toHaveLength(1);
      expect(marker?.querySelectorAll('img, [data-open]')).toHaveLength(0);
      const fallback = preview?.querySelector('[data-fallback]');
      expect(fallback?.getAttribute('href')).toBe(place.mapUrl);
      expect(fallback?.hasAttribute('hidden')).toBe(false);
      const actions = window.document.querySelector('.news-event-actions');
      expect([...actions!.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
        event.icsUrl
      ]);
    } finally {
      await window.happyDOM.close();
    }
  });
});
