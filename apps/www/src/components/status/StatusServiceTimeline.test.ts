/// <reference types="astro/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import StatusServiceTimeline from './StatusServiceTimeline.astro';
import type { StatusArea } from '@/lib/status/schema';
import type { StatusTimelineIncidentInput } from '@/lib/status/timeline';

const NBSP = '\u00A0';

interface IncidentInput {
  readonly id: string;
  readonly href?: string;
  readonly kind?: StatusTimelineIncidentInput['kind'];
  readonly hasPage?: boolean;
  readonly title?: string;
  readonly startedIso: string;
  readonly startedHasTime?: boolean;
  readonly endedIso?: string;
  readonly endedHasTime?: boolean;
  readonly isActive?: boolean;
  readonly areas?: readonly StatusArea[];
}

const incident = (input: IncidentInput): StatusTimelineIncidentInput => ({
  id: input.id,
  href:
    input.hasPage === false
      ? undefined
      : (input.href ?? `/status/incidents/${input.id}`),
  title: input.title ?? `Запись ${input.id}`,
  kind: input.kind ?? 'incident',
  startedIso: input.startedIso,
  startedHasTime: input.startedHasTime ?? true,
  endedIso: input.endedIso,
  endedHasTime: input.endedHasTime ?? true,
  isActive: input.isActive ?? !input.endedIso,
  areas: input.areas,
});

const renderTimeline = async (
  incidents: readonly StatusTimelineIncidentInput[],
  timelineDays = 10,
): Promise<string> => {
  const container = await createAstroContainer();

  return container.renderToString(StatusServiceTimeline, {
    props: {
      service: 'water',
      incidents,
      timelineDays,
    },
  });
};

const astroGeneratedAttribute =
  /\sdata-astro-(?:cid-[^=\s>]+="true"|source-(?:file|loc)="[^"]*")/gu;
const normalizeHtml = (html: string): string =>
  html
    .replace(astroGeneratedAttribute, '')
    .replaceAll('&quot;', '&#34;')
    .replaceAll(NBSP, '·')
    .replace(/>\s+</gu, '><')
    .replace(/</gu, '\n<')
    .trim();

const incidentSegmentTag = (html: string, id: string): string =>
  normalizeHtml(
    html.match(
      new RegExp(
        `<(?:a|button|span)\\b[^>]*data-incident-id="${id}"[^>]*>`,
        'u',
      ),
    )?.[0] ?? '',
  );

const incidentSegmentTarget = (
  html: string,
  id: string,
): { readonly href?: string; readonly laneOffset?: string } => {
  const tag = incidentSegmentTag(html, id);

  return {
    href: tag.match(/\shref="([^"]+)"/u)?.[1],
    laneOffset: tag.match(/--segment-lane-offset: ([^;]+);/u)?.[1],
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-10T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('StatusServiceTimeline', () => {
  it('renders visible segments plus hidden future incidents in SSR HTML', async () => {
    const html = await renderTimeline([
      incident({
        id: 'old-past',
        startedIso: '2026-04-20T00:00:00Z',
        endedIso: '2026-04-22T00:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'maintenance-visible',
        kind: 'maintenance',
        startedIso: '2026-05-02T00:00:00Z',
        endedIso: '2026-05-03T00:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'incident-active',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
      }),
      incident({
        id: 'maintenance-future',
        kind: 'maintenance',
        startedIso: '2026-05-12T00:00:00Z',
        endedIso: '2026-05-13T00:00:00Z',
        isActive: false,
      }),
    ]);

    expect(html.match(/data-status-problem/g)?.length ?? 0).toBe(3);
    expect(html).not.toContain('data-status-segment="green"');
    expect(html).not.toContain('data-incident-id="old-past"');
    expect(html).toContain('data-incident-id="maintenance-visible"');
    expect(html).toContain('data-incident-id="incident-active"');
    expect(html).toMatch(
      /data-incident-id="maintenance-future"[^>]*data-status-problem[^>]*hidden/,
    );
  });

  it('keeps data attributes needed for later client hydration', async () => {
    const html = await renderTimeline([
      incident({
        id: 'maintenance-visible',
        kind: 'maintenance',
        startedIso: '2026-05-02T00:00:00Z',
        endedIso: '2026-05-03T00:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'incident-active',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
      }),
      incident({
        id: 'maintenance-future',
        kind: 'maintenance',
        startedIso: '2026-05-12T00:00:00Z',
        endedIso: '2026-05-13T00:00:00Z',
        isActive: false,
      }),
    ]);

    expect(html).toMatch(
      /data-incident-id="maintenance-visible"[^>]*data-status-problem[^>]*data-start="2026-05-02T00:00:00Z"[^>]*data-end="2026-05-03T00:00:00Z"/,
    );
    expect(html).toMatch(
      /data-incident-id="maintenance-visible"[^>]*data-tooltip-service-label="Вода"[^>]*data-tooltip-kind-label="Плановые работы"[^>]*data-tooltip-phase-label="завершено"/,
    );
    expect(html).toMatch(
      /data-incident-id="incident-active"[^>]*data-status-problem[^>]*data-start="2026-05-09T00:00:00Z"[^>]*data-tooltip-phase-icon="alert"/,
    );
    expect(html).not.toMatch(
      /data-incident-id="incident-active"[^>]*data-end=/,
    );
    expect(html).toMatch(
      /data-incident-id="maintenance-future"[^>]*data-status-problem[^>]*data-start="2026-05-12T00:00:00Z"[^>]*data-end="2026-05-13T00:00:00Z"[^>]*data-tooltip-phase-label="запланировано"[^>]*hidden/,
    );
  });

  it('collapses multiple same-day incidents into one timeline marker with grouped tooltip data', async () => {
    const html = await renderTimeline([
      incident({
        id: 'same-day-a',
        startedIso: '2026-05-09T03:00:00Z',
        endedIso: '2026-05-09T03:40:00Z',
        isActive: false,
      }),
      incident({
        id: 'same-day-b',
        startedIso: '2026-05-09T08:10:00Z',
        endedIso: '2026-05-09T08:45:00Z',
        isActive: false,
      }),
      incident({
        id: 'same-day-c',
        startedIso: '2026-05-09T19:20:00Z',
        endedIso: '2026-05-09T20:05:00Z',
        isActive: false,
      }),
    ]);

    expect({
      problemCount: html.match(/data-status-problem/g)?.length ?? 0,
      segment: incidentSegmentTag(html, 'same-day-a'),
    }).toMatchSnapshot();
  });

  it('renders typographic non-breaking spaces in tooltip date labels', async () => {
    const html = await renderTimeline([
      incident({
        id: 'incident-active',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
      }),
    ]);

    expect(html).toContain(
      `data-tooltip-period-label="Начиная с${NBSP}9${NBSP}мая, 03:00"`,
    );
    expect(html).toContain(
      `aria-label="Вода. Инцидент. Запись incident-active. Статус: идет. Начиная с${NBSP}9${NBSP}мая, 03:00"`,
    );
  });

  it('serializes area icons only for explicitly scoped incidents', async () => {
    const html = await renderTimeline([
      incident({
        id: 'park-outage',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
        areas: ['park'],
      }),
      incident({
        id: 'all-village-outage',
        startedIso: '2026-05-08T00:00:00Z',
        endedIso: '2026-05-08T01:00:00Z',
        isActive: false,
      }),
    ]);

    expect(normalizeHtml(html)).toMatch(
      /data-incident-id="park-outage"[^>]*data-tooltip-areas="\[&#34;park&#34;\]"/,
    );
    expect(html).toMatch(
      new RegExp(
        `data-incident-id="park-outage"[^>]*data-tooltip-area-label="Шелково${NBSP}Парк"`,
      ),
    );
    expect(html).not.toMatch(
      /data-incident-id="all-village-outage"[^>]*data-tooltip-areas=/,
    );
  });

  it('applies typography to tooltip titles', async () => {
    const html = await renderTimeline([
      incident({
        id: 'park-outage',
        title: 'Нет воды в Шелково Парк',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
      }),
    ]);

    expect(html).toContain(
      `data-tooltip-title="Нет воды в${NBSP}Шелково${NBSP}Парк"`,
    );
  });

  it('renders links and tooltip-only markers with semantic segment elements', async () => {
    const html = await renderTimeline([
      incident({
        id: 'no-page',
        hasPage: false,
        startedIso: '2026-05-08T00:00:00Z',
        endedIso: '2026-05-08T01:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'with-page',
        startedIso: '2026-05-09T00:00:00Z',
        endedIso: '2026-05-09T01:00:00Z',
        isActive: false,
      }),
    ]);

    expect([
      incidentSegmentTag(html, 'no-page'),
      incidentSegmentTag(html, 'with-page'),
    ]).toMatchSnapshot();
  });

  it('keeps adjacent dates in separate SSR lanes with their own links', async () => {
    vi.setSystemTime(new Date('2026-08-17T00:00:00Z'));

    const html = await renderTimeline(
      [
        incident({
          id: 'electricity-river-outage-2026-08-10',
          href: '/status/incidents/2026/08/electricity-river-outage-2026-08-10/',
          kind: 'maintenance',
          startedIso: '2026-08-10T12:00:00Z',
          endedIso: '2026-08-10T14:00:00Z',
          isActive: false,
        }),
        incident({
          id: 'electricity-outage-2026-08-11',
          href: '/status/incidents/2026/08/electricity-outage-2026-08-11/',
          kind: 'maintenance',
          startedIso: '2026-08-11T06:00:00Z',
          endedIso: '2026-08-11T14:00:00Z',
          isActive: false,
        }),
      ],
      90,
    );

    expect([
      incidentSegmentTarget(html, 'electricity-river-outage-2026-08-10'),
      incidentSegmentTarget(html, 'electricity-outage-2026-08-11'),
    ]).toMatchInlineSnapshot(`
      [
        {
          "href": "/status/incidents/2026/08/electricity-river-outage-2026-08-10/",
          "laneOffset": "-12px",
        },
        {
          "href": "/status/incidents/2026/08/electricity-outage-2026-08-11/",
          "laneOffset": "12px",
        },
      ]
    `);
  });

  it('marks any affected single day with the full visible day slot', async () => {
    const html = await renderTimeline([
      incident({
        id: 'short-single-day',
        startedIso: '2026-05-07T00:00:00Z',
        endedIso: '2026-05-07T00:15:00Z',
        isActive: false,
      }),
      incident({
        id: 'long-single-day',
        startedIso: '2026-05-08T00:00:00Z',
        endedIso: '2026-05-08T09:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'active-single-day',
        startedIso: '2026-05-09T21:00:00Z',
        isActive: true,
      }),
    ]);

    expect([
      incidentSegmentTag(html, 'short-single-day'),
      incidentSegmentTag(html, 'long-single-day'),
      incidentSegmentTag(html, 'active-single-day'),
    ]).toMatchSnapshot();

    const shorterRangeHtml = await renderTimeline(
      [
        incident({
          id: 'shorter-range-single-day',
          startedIso: '2026-05-09T00:00:00Z',
          endedIso: '2026-05-09T01:00:00Z',
          isActive: false,
        }),
      ],
      5,
    );

    expect(
      incidentSegmentTag(shorterRangeHtml, 'shorter-range-single-day'),
    ).toMatchSnapshot();
  });

  it('marks every affected day for cross-day incidents', async () => {
    const html = await renderTimeline([
      incident({
        id: 'cross-day-short',
        startedIso: '2026-05-08T20:30:00Z',
        endedIso: '2026-05-08T22:00:00Z',
        isActive: false,
      }),
    ]);

    expect(incidentSegmentTag(html, 'cross-day-short')).toContain(
      '--segment-width: 20;',
    );
  });

  it('keeps compact grouped markers tooltip-only', async () => {
    const html = await renderTimeline([
      incident({
        id: 'same-day-a',
        startedIso: '2026-05-09T03:00:00Z',
        endedIso: '2026-05-09T03:40:00Z',
        isActive: false,
      }),
      incident({
        id: 'same-day-b',
        startedIso: '2026-05-09T08:10:00Z',
        endedIso: '2026-05-09T08:45:00Z',
        isActive: false,
      }),
    ]);

    expect(incidentSegmentTag(html, 'same-day-a')).toMatchSnapshot();
  });

  it('groups short active same-day incidents with dense compact markers', async () => {
    const html = await renderTimeline([
      incident({
        id: 'dense-ended',
        startedIso: '2026-05-09T22:10:00Z',
        endedIso: '2026-05-09T22:30:00Z',
        isActive: false,
      }),
      incident({
        id: 'dense-active',
        startedIso: '2026-05-09T23:40:00Z',
        isActive: true,
      }),
    ]);

    expect({
      problemCount: html.match(/data-status-problem/g)?.length ?? 0,
      segment: incidentSegmentTag(html, 'dense-ended'),
    }).toMatchSnapshot();
  });

  it('renders a shared tooltip shell in SSR HTML', async () => {
    const html = await renderTimeline([
      incident({
        id: 'incident-active',
        startedIso: '2026-05-09T00:00:00Z',
        isActive: true,
      }),
    ]);

    expect(html).toContain('data-status-timeline-tooltip');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('data-status-tooltip-title');
    expect(html).toContain('data-status-tooltip-phase-icon-alert');
    expect(html).toContain('data-status-tooltip-phase-icon-check');
  });

  it('uses different tone classes for maintenance and incident entries', async () => {
    const html = await renderTimeline([
      incident({
        id: 'maintenance-visible',
        kind: 'maintenance',
        startedIso: '2026-05-02T00:00:00Z',
        endedIso: '2026-05-03T00:00:00Z',
        isActive: false,
      }),
      incident({
        id: 'incident-visible',
        startedIso: '2026-05-05T00:00:00Z',
        endedIso: '2026-05-06T00:00:00Z',
        isActive: false,
      }),
    ]);

    expect(html).toMatch(
      /data-incident-id="maintenance-visible"[^>]*status-service-timeline__segment--amber/,
    );
    expect(html).toMatch(
      /data-incident-id="incident-visible"[^>]*status-service-timeline__segment--red/,
    );
  });

  it('marks active incidents that reach now so they can visually touch the right edge', async () => {
    const html = await renderTimeline([
      incident({
        id: 'incident-active',
        startedIso: '2026-05-09T23:40:00Z',
        isActive: true,
      }),
    ]);

    expect(html).toMatch(
      /data-incident-id="incident-active"[^>]*status-service-timeline__segment--problem-active-end/,
    );
  });
});
