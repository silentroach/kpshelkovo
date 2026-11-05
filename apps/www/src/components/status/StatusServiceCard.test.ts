/// <reference types="astro/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StatusIncident, StatusServiceSummary } from '@/lib/status/types';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusServiceCard from './StatusServiceCard.astro';

const incident = (): StatusIncident => ({
  id: 'overview-tooltip',
  title: 'Проверка tooltip на общей странице',
  service: 'water',
  kind: 'incident',
  year: 2026,
  month: 5,
  slug: 'overview-tooltip',
  url: '/status/incidents/overview-tooltip',
  markdownUrl: '/status/incidents/overview-tooltip/index.md',
  canonical: 'https://kpshelkovo.online/status/incidents/overview-tooltip/',
  started: {
    at: new Date('2026-05-09T00:00:00Z'),
    iso: '2026-05-09T00:00:00Z',
    hasTime: true
  },
  ended: {
    at: new Date('2026-05-09T01:00:00Z'),
    iso: '2026-05-09T01:00:00Z',
    hasTime: true
  },
  phase: 'resolved',
  appliesToAllAreas: true,
  areas: [],
  hasPage: true,
  body: '',
  mentions: [],
  sortStartedAt: Date.parse('2026-05-09T00:00:00Z'),
  sortLastChangeAt: Date.parse('2026-05-09T01:00:00Z'),
  duration: { totalMinutes: 60 }
});

const summary = (): StatusServiceSummary => ({
  service: 'water',
  serviceStatus: 'green',
  incidents: [incident()],
  activeIncidents: [],
  activeMaintenance: [],
  daysWithoutIncidents: { mode: 'count', days: 1 }
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-10T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StatusServiceCard', () => {
  it('embeds one set of timeline records and keeps the service URL', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusServiceCard, {
      props: {
        summary: summary(),
        serviceHref: '/status/water/'
      }
    });

    expect(html.match(/data-timeline-records=/gu)).toHaveLength(1);
    expect(html).toContain('href="/status/water/"');
    expect(html.match(/data-timeline-control/gu)).toHaveLength(1);
  });

  it('uses a single component for both thirty-day views', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusServiceCard, {
      props: {
        summary: summary(),
        serviceHref: '/status/water/',
        timelineDays: 30
      }
    });

    expect(html.match(/data-day="/gu)).toHaveLength(60);
    expect(html.match(/data-range-days="30"/gu)).toHaveLength(1);
  });
});
