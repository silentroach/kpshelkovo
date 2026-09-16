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
      const place = testPlace({ name: 'Green Dreams' });
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
      expect(html).toContain('href="https://yandex.ru/maps/?pt=38,55');
      expect(html.includes('<iframe')).toBe(variant === 'compact');
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
    }
  );
});
