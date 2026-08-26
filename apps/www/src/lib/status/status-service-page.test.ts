/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

const fixtures = vi.hoisted(() => {
  const started = new Date('2026-08-18T10:00:00+03:00');
  const ended = new Date('2026-08-18T11:00:00+03:00');
  const incident = {
    id: '2026/08/future-outage',
    title: 'Будущее отключение электричества',
    service: 'electricity' as const,
    kind: 'incident' as const,
    year: 2026,
    month: 8,
    slug: 'future-outage',
    started: {
      at: started,
      iso: '2026-08-18T10:00:00+03:00',
      hasTime: true,
    },
    ended: {
      at: ended,
      iso: '2026-08-18T11:00:00+03:00',
      hasTime: true,
    },
    phase: 'scheduled' as const,
    appliesToAllAreas: true,
    areas: [],
    hasPage: false as const,
    body: '',
    mentions: [],
    sortStartedAt: started.valueOf(),
    sortLastChangeAt: started.valueOf(),
  };

  return {
    summary: {
      service: 'electricity' as const,
      serviceStatus: 'green' as const,
      incidents: [incident],
      activeIncidents: [],
      activeMaintenance: [],
      daysWithoutIncidents: { mode: 'noIncidents' as const },
    },
  };
});

vi.mock('@/lib/status/load', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/status/load')>()),
  loadStatusService: async () => fixtures.summary,
}));

// @ts-expect-error Astro page modules are resolved by Astro/Vitest at test time.
import StatusServicePage from '@/pages/status/[service]/index.astro';

const renderPage = async (): Promise<string> => {
  const container = await createAstroContainer();

  return container.renderToString(StatusServicePage, {
    params: { service: 'electricity' },
    request: new Request('https://example.com/status/electricity/'),
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-18T09:00:00+03:00'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('/status/[service]/', () => {
  it('renders the service timeline without a DTO mismatch', async () => {
    const html = await renderPage();

    expect(html).toContain('data-status-timeline');
  });

  it('renders a normal build-time state with the future lifecycle payload', async () => {
    const html = await renderPage();
    const document = new Window().document;
    document.write(html);
    const state = document.querySelector('[data-status-service-state-label]');
    if (!state) {
      throw new Error('service detail state is missing');
    }

    const windows = JSON.parse(
      state.getAttribute('data-status-service-incidents') ?? '[]',
    ) as readonly {
      readonly kind: string;
      readonly startedAt: number;
      readonly endedAt?: number;
    }[];

    expect({
      label: state.textContent.trim(),
      role: state.getAttribute('role'),
      state: state.getAttribute('data-status-service-state'),
      windows: windows.map((item) => ({
        kind: item.kind,
        startedAt: new Date(item.startedAt).toISOString(),
        endedAt:
          item.endedAt === undefined
            ? undefined
            : new Date(item.endedAt).toISOString(),
      })),
    }).toMatchInlineSnapshot(`
      {
        "label": "В норме",
        "role": "status",
        "state": "green",
        "windows": [
          {
            "endedAt": "2026-08-18T08:00:00.000Z",
            "kind": "incident",
            "startedAt": "2026-08-18T07:00:00.000Z",
          },
        ],
      }
    `);
  });
});
