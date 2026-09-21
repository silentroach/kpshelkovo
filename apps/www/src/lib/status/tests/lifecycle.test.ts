import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// @ts-expect-error Astro components are resolved by Astro/Vitest at test time.
import StatusServiceState from '@/components/status/StatusServiceState.astro';
import { contentDateSchema } from '@/lib/content-date';
import { createAstroContainer } from '@/test/astro-container';

import { parseStatusIncidentWindows, resolveStatusIncidentState } from '../lifecycle';
import type { StatusIncidentEntry } from '../load';

const START = '2026-08-26T10:00:00+03:00';
const END = '2026-08-26T13:00:00+03:00';
const testDate = contentDateSchema('test date');

const maintenanceEntry: StatusIncidentEntry = {
  id: '2026/08/dam-maintenance',
  body: '',
  data: {
    title: 'Плановые работы на дамбе',
    service: 'dam',
    kind: 'maintenance',
    started_at: testDate.parse('26.08.2026 10:00'),
    ended_at: testDate.parse('26.08.2026 13:00'),
    source_url: 'https://example.com/dam-maintenance'
  }
};

let buildStatusDataset: typeof import('../load').buildStatusDataset;
let buildStatusHomeMarkdown: typeof import('../markdown').buildStatusHomeMarkdown;
let buildStatusServiceMarkdown: typeof import('../markdown').buildStatusServiceMarkdown;
let buildStatusPublicPayload: typeof import('../public-dto').buildStatusPublicPayload;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildStatusDataset } = await import('../load'));
  ({ buildStatusHomeMarkdown, buildStatusServiceMarkdown } = await import('../markdown'));
  ({ buildStatusPublicPayload } = await import('../public-dto'));
});

const statusSnapshot = (now: string) => {
  const data = buildStatusDataset([maintenanceEntry], {
    now: new Date(now)
  });
  const payload = buildStatusPublicPayload(data);
  const incident = payload.incidents[0];
  const service = payload.services.find((item) => item.service === 'dam');

  return {
    incident: {
      phase: incident?.phase,
      phaseLabel: incident?.phase_label,
      isActive: incident?.is_active
    },
    activeIds: payload.active.map((item) => item.id),
    service: {
      state: service?.service_status,
      activeMaintenanceIds: service?.active_maintenance_ids,
      incidentIds: service?.incident_ids
    }
  };
};

describe('status lifecycle boundaries', () => {
  it.each([
    [Date.parse(START) - 1, true],
    [Date.parse(START), true],
    [Date.parse(END) - 1, true],
    [Date.parse(END), false]
  ] as const)('serializes only unfinished snapshot windows at %s', async (now, keepsWindow) => {
    const data = buildStatusDataset([maintenanceEntry], { now: new Date(now) });
    const summary = data.byService.get('dam');
    const container = await createAstroContainer();
    const document = new Window().document;
    document.write(await container.renderToString(StatusServiceState, { props: { summary } }));

    expect(
      document
        .querySelector('[data-status-service-state-label]')
        ?.getAttribute('data-status-service-incidents')
    ).toBe(
      JSON.stringify(
        keepsWindow
          ? [
              {
                kind: 'maintenance',
                start: Date.parse(START),
                end: Date.parse(END)
              }
            ]
          : []
      )
    );
    expect(summary?.incidents).toHaveLength(1);
  });

  it.each([Date.parse(START) - 1, Date.parse(END)])(
    'keeps an open incident in the client payload at %s',
    async (now) => {
      const data = buildStatusDataset(
        [
          {
            ...maintenanceEntry,
            data: { ...maintenanceEntry.data, kind: 'incident', ended_at: undefined }
          }
        ],
        { now: new Date(now) }
      );
      const container = await createAstroContainer();
      const document = new Window().document;
      document.write(
        await container.renderToString(StatusServiceState, {
          props: { summary: data.byService.get('dam') }
        })
      );

      expect(
        document
          .querySelector('[data-status-service-state-label]')
          ?.getAttribute('data-status-service-incidents')
      ).toBe(JSON.stringify([{ kind: 'incident', start: Date.parse(START) }]));
    }
  );

  it('publishes a future maintenance window as scheduled', () => {
    expect(statusSnapshot('2026-08-26T09:59:59.999+03:00')).toMatchInlineSnapshot(`
        {
          "activeIds": [],
          "incident": {
            "isActive": false,
            "phase": "scheduled",
            "phaseLabel": "запланировано",
          },
          "service": {
            "activeMaintenanceIds": [],
            "incidentIds": [
              "2026/08/dam-maintenance",
            ],
            "state": "green",
          },
        }
      `);
  });

  it('publishes maintenance as active at the exact start boundary', () => {
    expect(statusSnapshot(START)).toMatchInlineSnapshot(`
      {
        "activeIds": [
          "2026/08/dam-maintenance",
        ],
        "incident": {
          "isActive": true,
          "phase": "active",
          "phaseLabel": "идет",
        },
        "service": {
          "activeMaintenanceIds": [
            "2026/08/dam-maintenance",
          ],
          "incidentIds": [
            "2026/08/dam-maintenance",
          ],
          "state": "amber",
        },
      }
    `);
  });

  it('keeps snapshot-scheduled maintenance in Markdown at the start boundary', () => {
    const data = buildStatusDataset([maintenanceEntry], {
      now: new Date(Date.parse(START) - 1)
    });
    const service = data.byService.get('dam');

    if (!service) {
      throw new Error('Expected dam status summary');
    }

    vi.useFakeTimers();
    vi.setSystemTime(new Date(START));

    try {
      const expected = '## Плановые работы\n\n- Плановые работы на дамбе';

      expect(buildStatusHomeMarkdown(data)).toContain(expected);
      expect(buildStatusServiceMarkdown(service)).toContain(expected);
    } finally {
      vi.useRealTimers();
    }
  });

  it('publishes maintenance as resolved at the exact end boundary', () => {
    expect(statusSnapshot(END)).toMatchInlineSnapshot(`
      {
        "activeIds": [],
        "incident": {
          "isActive": false,
          "phase": "resolved",
          "phaseLabel": "завершено",
        },
        "service": {
          "activeMaintenanceIds": [],
          "incidentIds": [
            "2026/08/dam-maintenance",
          ],
          "state": "green",
        },
      }
    `);
  });

  it('keeps an incident without an end active from its start onward', () => {
    const input = {
      kind: 'incident' as const,
      service: 'water' as const,
      start: Date.parse(START)
    };

    expect([
      resolveStatusIncidentState(input, input.start - 1),
      resolveStatusIncidentState(input, input.start),
      resolveStatusIncidentState(input, Date.parse(END))
    ]).toMatchInlineSnapshot(`
      [
        {
          "isActive": false,
          "label": "ожидается",
          "phase": "scheduled",
          "tone": "info",
        },
        {
          "isActive": true,
          "label": "идет",
          "phase": "active",
          "tone": "danger",
        },
        {
          "isActive": true,
          "label": "идет",
          "phase": "active",
          "tone": "danger",
        },
      ]
    `);
  });

  it('rejects the whole client payload when one window has an invalid range', () => {
    const payload = JSON.stringify([
      { kind: 'maintenance', start: Date.parse(START), end: Date.parse(END) },
      { kind: 'incident', start: Date.parse(END), end: Date.parse(START) }
    ]);

    expect(parseStatusIncidentWindows(payload)).toBeUndefined();
  });
});
