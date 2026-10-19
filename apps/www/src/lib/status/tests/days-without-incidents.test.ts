import { describe, expect, it } from 'vitest';

import { contentDateSchema } from '@/lib/content-date';

import { buildStatusDataset } from '../load';
import type { StatusIncidentEntry } from '../load';
import { buildStatusPublicPayload } from '../public-dto';

const testDate = contentDateSchema('test date');
const entry = (slug: string, startedAt: string, endedAt?: string): StatusIncidentEntry => ({
  id: `2026/08/${slug}`,
  body: '',
  data: {
    title: slug,
    service: 'electricity',
    kind: 'incident',
    started_at: testDate.parse(startedAt),
    ended_at: endedAt ? testDate.parse(endedAt) : undefined,
    source_url: 'https://example.com/status'
  }
});

const resolved = entry('resolved', '01.08.2026 10:00', '01.08.2026 11:00');
const scheduled = entry('scheduled', '18.08.2026 10:00', '18.08.2026 11:00');
const now = new Date('2026-08-10T09:00:00+03:00');
const publicCounter = (entries: readonly StatusIncidentEntry[], snapshotTime = now) =>
  buildStatusPublicPayload(buildStatusDataset(entries, { now: snapshotTime })).services.find(
    (service) => service.service === 'electricity'
  )?.days_without_incidents;

describe('days without incidents in the public snapshot', () => {
  it.each([scheduled, entry('open-scheduled', '18.08.2026 10:00')])(
    'ignores future incident $id when counting from the last resolved incident',
    (future) => {
      expect(publicCounter([resolved, future])).toMatchInlineSnapshot(`
        {
          "days": 9,
          "label": "9 дней без проблем",
          "last_ended_iso": "2026-08-01T11:00:00+03:00",
          "mode": "count",
        }
      `);
    }
  );

  it.each([
    { entries: [] },
    { entries: [scheduled] },
    { entries: [entry('open-scheduled', '18.08.2026 10:00')] }
  ])('does not invent a last resolved incident for history $entries', ({ entries }) => {
    expect(publicCounter(entries)).toMatchInlineSnapshot(`
        {
          "days": undefined,
          "label": "пока без инцидентов в истории",
          "last_ended_iso": undefined,
          "mode": "no_incidents",
        }
      `);
  });

  it.each([
    ['2026-08-18T10:00:00+03:00', scheduled],
    ['2026-08-18T10:59:59.999+03:00', scheduled],
    ['2026-08-18T11:00:00+03:00', entry('open-active', '18.08.2026 10:00')]
  ] as const)('keeps active incident priority at %s', (snapshotTime, active) => {
    expect(publicCounter([resolved, active], new Date(snapshotTime))).toMatchInlineSnapshot(`
        {
          "days": undefined,
          "label": "идет инцидент",
          "last_ended_iso": undefined,
          "mode": "active_incident",
        }
      `);
  });

  it('counts the newly resolved incident at the exact end boundary', () => {
    expect(publicCounter([resolved, scheduled], new Date('2026-08-18T11:00:00+03:00')))
      .toMatchInlineSnapshot(`
        {
          "days": 0,
          "label": "0 дней без проблем",
          "last_ended_iso": "2026-08-18T11:00:00+03:00",
          "mode": "count",
        }
      `);
  });

  it.each([
    entry('past-maintenance', '09.08.2026 10:00', '09.08.2026 11:00'),
    entry('active-maintenance', '10.08.2026 08:00', '10.08.2026 10:00'),
    scheduled
  ])('ignores maintenance $id regardless of its phase', (incident) => {
    const maintenance: StatusIncidentEntry = {
      id: incident.id,
      body: incident.body,
      data: { ...incident.data, kind: 'maintenance' }
    };

    expect(publicCounter([resolved, maintenance])).toEqual(publicCounter([resolved]));
  });
});
