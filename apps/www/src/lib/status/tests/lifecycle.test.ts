import { beforeAll, describe, expect, it } from 'vitest';

import { contentDateSchema } from '@/lib/content-date';
import type { StatusIncidentEntry } from '../load';
import { resolveStatusIncidentState } from '../lifecycle';

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
    source_url: 'https://example.com/dam-maintenance',
  },
};

let buildStatusDataset: typeof import('../load').buildStatusDataset;
let buildStatusPublicPayload: typeof import('../public-dto').buildStatusPublicPayload;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildStatusDataset } = await import('../load'));
  ({ buildStatusPublicPayload } = await import('../public-dto'));
});

const statusSnapshot = (now: string) => {
  const data = buildStatusDataset([maintenanceEntry], {
    now: new Date(now),
  });
  const payload = buildStatusPublicPayload(data);
  const incident = payload.incidents[0];
  const service = payload.services.find((item) => item.service === 'dam');

  return {
    incident: {
      phase: incident?.phase,
      phaseLabel: incident?.phase_label,
      isActive: incident?.is_active,
    },
    activeIds: payload.active.map((item) => item.id),
    service: {
      state: service?.service_status,
      activeMaintenanceIds: service?.active_maintenance_ids,
      incidentIds: service?.incident_ids,
    },
  };
};

describe('status lifecycle boundaries', () => {
  it('publishes a future maintenance window as scheduled', () => {
    expect(statusSnapshot('2026-08-26T09:59:59.999+03:00'))
      .toMatchInlineSnapshot(`
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
      startedAt: Date.parse(START),
    };

    expect([
      resolveStatusIncidentState(input, input.startedAt - 1),
      resolveStatusIncidentState(input, input.startedAt),
      resolveStatusIncidentState(input, Date.parse(END)),
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
});
