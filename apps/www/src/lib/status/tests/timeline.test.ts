import { describe, expect, it } from 'vitest';

import { buildStatusTimelineDays } from '../timeline';
import { buildStatusTimelineRecords } from '../timeline-data';
import type { StatusTimelineIncidentInput } from '../timeline.types';

const record = (
  id: string,
  startedIso: string,
  endedIso?: string,
  kind: 'incident' | 'maintenance' = 'incident'
) => ({ id, startedIso, endedIso, kind });

describe('daily status projection', () => {
  it('includes leap day and interprets different ISO offsets as Moscow calendar dates', () => {
    expect(
      buildStatusTimelineDays(
        [record('leap', '2024-02-29T01:00:00+05:00', '2024-03-01T00:00:00+03:00')],
        Date.parse('2024-03-01T12:00:00+03:00'),
        3
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "2024-02-28",
          "recordIds": [
            "leap",
          ],
          "tone": "red",
        },
        {
          "id": "2024-02-29",
          "recordIds": [
            "leap",
          ],
          "tone": "red",
        },
        {
          "id": "2024-03-01",
          "recordIds": [],
          "tone": "green",
        },
      ]
    `);
  });

  it('uses Moscow dates over month and year boundaries, excludes midnight end and zero intervals', () => {
    const now = Date.parse('2026-01-01T21:30:00Z'); // January 2 in Moscow
    const days = buildStatusTimelineDays(
      [
        record('midnight', '2025-12-30T21:00:00Z', '2025-12-31T21:00:00Z'),
        record('zero', '2026-01-01T10:00:00Z', '2026-01-01T10:00:00Z'),
        record('later', '2026-01-02T10:00:00Z'),
        record('work', '2026-01-01T10:00:00Z', undefined, 'maintenance')
      ],
      now,
      3
    );
    expect(days).toMatchInlineSnapshot(`
      [
        {
          "id": "2025-12-31",
          "recordIds": [
            "midnight",
          ],
          "tone": "red",
        },
        {
          "id": "2026-01-01",
          "recordIds": [
            "work",
          ],
          "tone": "amber",
        },
        {
          "id": "2026-01-02",
          "recordIds": [
            "work",
          ],
          "tone": "amber",
        },
      ]
    `);
  });

  it('bounds a multi-year open interval, keeps original ordering, mixed kinds and deduplicates ids', () => {
    const now = Date.parse('2026-05-10T12:00:00+03:00');
    const older = record('z-oldest', '2020-01-01T00:00:00+03:00');
    const days = buildStatusTimelineDays(
      [
        record('a-newer', '2025-01-01T00:00:00+03:00', undefined, 'maintenance'),
        older,
        older,
        record('today', '2026-05-10T10:00:00+03:00', '2026-05-10T11:00:00+03:00'),
        record('future', '2026-05-10T13:00:00+03:00')
      ],
      now,
      2
    );
    expect(days).toMatchInlineSnapshot(`
      [
        {
          "id": "2026-05-09",
          "recordIds": [
            "z-oldest",
            "a-newer",
          ],
          "tone": "red",
        },
        {
          "id": "2026-05-10",
          "recordIds": [
            "z-oldest",
            "a-newer",
            "today",
          ],
          "tone": "red",
        },
      ]
    `);
  });

  it('keeps an open incident on a later day independently of closed events', () => {
    const records = [
      record('open', '2026-05-08T10:00:00+03:00'),
      record('closed', '2026-05-08T09:00:00+03:00', '2026-05-08T12:00:00+03:00')
    ];
    expect(buildStatusTimelineDays(records, Date.parse('2026-05-12T00:00:00+03:00'), 3))
      .toMatchInlineSnapshot(`
      [
        {
          "id": "2026-05-10",
          "recordIds": [
            "open",
          ],
          "tone": "red",
        },
        {
          "id": "2026-05-11",
          "recordIds": [
            "open",
          ],
          "tone": "red",
        },
        {
          "id": "2026-05-12",
          "recordIds": [
            "open",
          ],
          "tone": "red",
        },
      ]
    `);
  });
});

it('retains every intersecting and future record rather than a recent-ten slice', () => {
  const now = Date.parse('2026-05-10T12:00:00+03:00');
  const inputs: readonly StatusTimelineIncidentInput[] = Array.from({ length: 15 }, (_, index) => ({
    id: String(index),
    title: '<script>Title</script>',
    kind: 'incident',
    startedIso: '2026-05-09T10:00:00+03:00',
    startedHasTime: true,
    endedHasTime: true,
    phase: 'resolved',
    endedIso: '2026-05-09T11:30:00+03:00',
    duration: { totalMinutes: 90 }
  }));
  const records = buildStatusTimelineRecords(
    [
      ...inputs,
      { ...inputs[0], id: 'expired', endedIso: '2026-04-01T00:00:00+03:00' },
      {
        ...inputs[0],
        id: 'future',
        startedIso: '2027-01-01T00:00:00+03:00',
        endedIso: undefined,
        phase: 'scheduled'
      }
    ],
    now,
    30
  );
  expect(records.map((item) => item.id)).toMatchInlineSnapshot(`
    [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "future",
    ]
  `);
  expect(records[0]).toMatchInlineSnapshot(`
    {
      "activePeriodLabel": undefined,
      "areaLabel": undefined,
      "areas": undefined,
      "endedHasTime": true,
      "endedIso": "2026-05-09T11:30:00+03:00",
      "href": undefined,
      "id": "0",
      "kind": "incident",
      "periodLabel": "9 мая, 10:00 — 11:30 (1 ч. 30 мин.)",
      "phase": "resolved",
      "startedHasTime": true,
      "startedIso": "2026-05-09T10:00:00+03:00",
      "title": "<script>Title</script>",
    }
  `);
});

it('prepares date-free periods without inventing unknown times or shortening multi-day ranges', () => {
  const base: StatusTimelineIncidentInput = {
    id: 'timed',
    title: 'Timed',
    kind: 'incident',
    phase: 'resolved',
    startedIso: '2026-05-09T10:00:00+03:00',
    startedHasTime: true,
    endedIso: '2026-05-09T11:30:00+03:00',
    endedHasTime: true,
    duration: { totalMinutes: 90 }
  };
  const records = buildStatusTimelineRecords(
    [
      base,
      { ...base, id: 'unknown-start', startedHasTime: false },
      { ...base, id: 'midnight-end', endedIso: '2026-05-10T00:00:00+03:00' },
      {
        ...base,
        id: 'offsets',
        startedIso: '2026-05-09T23:00:00+05:00',
        endedIso: '2026-05-10T01:00:00+05:00',
        duration: { totalMinutes: 120 }
      },
      {
        ...base,
        id: 'open',
        phase: 'active',
        endedIso: undefined,
        endedHasTime: false,
        duration: undefined
      },
      {
        ...base,
        id: 'date-only-open',
        phase: 'active',
        startedHasTime: false,
        endedIso: undefined,
        endedHasTime: false,
        duration: undefined
      }
    ],
    Date.parse('2026-05-10T12:00:00+03:00'),
    30
  );
  expect(
    records.map((record) => ({
      id: record.id,
      date: record.singleDayDate,
      period: record.singleDayPeriodLabel?.replaceAll('\u00a0', '·')
    }))
  ).toMatchInlineSnapshot();
});
