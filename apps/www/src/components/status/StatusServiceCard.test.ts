/// <reference types="astro/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusServiceCard from './StatusServiceCard.astro';
import type { StatusIncident, StatusServiceSummary } from '@/lib/status/types';

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
    hasTime: true,
  },
  ended: {
    at: new Date('2026-05-09T01:00:00Z'),
    iso: '2026-05-09T01:00:00Z',
    hasTime: true,
  },
  isActive: false,
  appliesToAllAreas: true,
  areas: [],
  hasPage: true,
  body: '',
  mentions: [],
  sortStartedAt: Date.parse('2026-05-09T00:00:00Z'),
  sortLastChangeAt: Date.parse('2026-05-09T01:00:00Z'),
  duration: { totalMinutes: 60 },
});

const summary = (): StatusServiceSummary => ({
  service: 'water',
  serviceStatus: 'green',
  incidents: [incident()],
  activeIncidents: [],
  activeMaintenance: [],
  daysWithoutIncidents: { mode: 'count', days: 1 },
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
  it('keeps overview timeline tooltips available', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusServiceCard, {
      props: {
        summary: summary(),
        serviceHref: '/status/water/',
      },
    });

    expect(html).toContain('data-status-timeline-tooltip');
    expect(html).toContain('data-tooltip-title="Проверка tooltip');
    expect(html).toContain('aria-label="Вода. Инцидент');
  });

  it('renders separate mobile and desktop timeline ranges when requested', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(StatusServiceCard, {
      props: {
        summary: summary(),
        serviceHref: '/status/water/',
        timelineDays: 30,
        mobileTimelineDays: 7,
      },
    });

    expect(html.match(/data-range-days="7"/gu)?.length ?? 0).toBe(1);
    expect(html.match(/data-range-days="30"/gu)?.length ?? 0).toBe(1);
    expect(html).toContain('class="lg:hidden"');
    expect(html).toContain('class="hidden lg:block"');
  });
});
