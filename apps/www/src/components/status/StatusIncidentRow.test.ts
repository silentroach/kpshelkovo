/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { StatusIncident } from '@/lib/status/types';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusIncidentRow from './StatusIncidentRow.astro';

const incident = {
  id: '2026/05/outage',
  title: 'Отключение электричества',
  service: 'electricity',
  kind: 'incident',
  year: 2026,
  month: 5,
  slug: 'outage',
  url: '/status/incidents/2026/05/outage/',
  markdownUrl: '/status/incidents/2026/05/outage/index.md',
  canonical: 'https://kpshelkovo.online/status/incidents/2026/05/outage/',
  started: {
    at: new Date('2026-05-01T07:32:00+03:00'),
    iso: '2026-05-01T07:32:00+03:00',
    hasTime: true,
  },
  ended: {
    at: new Date('2026-05-01T16:38:00+03:00'),
    iso: '2026-05-01T16:38:00+03:00',
    hasTime: true,
  },
  phase: 'resolved',
  appliesToAllAreas: true,
  areas: [],
  hasPage: true,
  body: '',
  mentions: [],
  sortStartedAt: new Date('2026-05-01T07:32:00+03:00').valueOf(),
  sortLastChangeAt: new Date('2026-05-01T16:38:00+03:00').valueOf(),
  duration: { totalMinutes: 9 * 60 + 6 },
} satisfies StatusIncident;

describe('StatusIncidentRow', () => {
  it('renders incident title links without leading whitespace', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusIncidentRow, {
      props: { incident },
    });

    expect(html).toMatch(
      /<a(?=[^>]*href="\/status\/incidents\/2026\/05\/outage\/")(?=[^>]*class="[^"]*\bui-link\b[^"]*")[^>]*>Отключение электричества<\/a>/u,
    );
    expect(html).not.toMatch(
      /<a(?=[^>]*class="[^"]*\bui-link\b[^"]*")[^>]*>\s+Отключение/u,
    );
  });
});
