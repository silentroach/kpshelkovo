import { describe, expect, it } from 'vitest';

import {
  buildStatusCalendarProjection,
  statusCalendarMonthId,
} from '../calendar';
import type {
  StatusCalendarProjection,
  StatusCalendarRecordInput,
} from '../calendar.types';

const BUILD_NOW_MS = Date.parse('2026-08-27T12:00:00+03:00');

const record = (
  id: string,
  kind: StatusCalendarRecordInput['kind'],
  startedAt: string,
  endedAt?: string,
): StatusCalendarRecordInput => ({
  id,
  kind,
  startedAt: Date.parse(startedAt),
  endedAt: endedAt ? Date.parse(endedAt) : undefined,
});

const datesForRecord = (
  projection: StatusCalendarProjection,
  recordId: string,
): readonly string[] =>
  [...projection.byDay.values()]
    .filter((day) => day.recordIds.includes(recordId))
    .map((day) => day.id);

describe('buildStatusCalendarProjection', () => {
  it('uses positive Moscow-day intersections across midnight and months', () => {
    const projection = buildStatusCalendarProjection(
      [
        record(
          '2026/03/dam-flood-closure',
          'incident',
          '2026-03-15T00:00:00+03:00',
          '2026-04-24T00:00:00+03:00',
        ),
        record(
          '2026/04/electricity-river-10kv-line-damage',
          'incident',
          '2026-04-22T11:30:00+03:00',
          '2026-04-23T00:06:00+03:00',
        ),
      ],
      BUILD_NOW_MS,
    );

    expect({
      april22: projection.byDay.get('2026-04-22'),
      april23: projection.byDay.get('2026-04-23'),
      april24: projection.byDay.get('2026-04-24'),
      years: projection.years.map((year) => ({
        year: year.year,
        months: year.months.map((month) => month.id),
      })),
    }).toMatchInlineSnapshot(`
      {
        "april22": {
          "day": 22,
          "id": "2026-04-22",
          "incidentCount": 2,
          "kind": "incident",
          "maintenanceCount": 0,
          "month": 4,
          "recordIds": [
            "2026/03/dam-flood-closure",
            "2026/04/electricity-river-10kv-line-damage",
          ],
          "year": 2026,
        },
        "april23": {
          "day": 23,
          "id": "2026-04-23",
          "incidentCount": 2,
          "kind": "incident",
          "maintenanceCount": 0,
          "month": 4,
          "recordIds": [
            "2026/03/dam-flood-closure",
            "2026/04/electricity-river-10kv-line-damage",
          ],
          "year": 2026,
        },
        "april24": undefined,
        "years": [
          {
            "months": [
              "2026/04",
              "2026/03",
            ],
            "year": 2026,
          },
        ],
      }
    `);
  });

  it('crosses New Year and includes leap day without including a midnight end', () => {
    const projection = buildStatusCalendarProjection(
      [
        record(
          '2023/12/new-year-outage',
          'incident',
          '2023-12-31T23:55:00+03:00',
          '2024-01-01T00:06:00+03:00',
        ),
        record(
          '2024/02/leap-maintenance',
          'maintenance',
          '2024-02-28T22:00:00+03:00',
          '2024-03-01T00:00:00+03:00',
        ),
      ],
      BUILD_NOW_MS,
    );

    expect({
      years: projection.years.map((year) => year.year),
      months: [...projection.byMonth.keys()],
      days: [...projection.byDay.keys()],
      march1: projection.byDay.get('2024-03-01'),
    }).toMatchInlineSnapshot(`
      {
        "days": [
          "2024-02-29",
          "2024-02-28",
          "2024-01-01",
          "2023-12-31",
        ],
        "march1": undefined,
        "months": [
          "2024/02",
          "2024/01",
          "2023/12",
        ],
        "years": [
          2024,
          2023,
        ],
      }
    `);
  });

  it('limits open records at a fixed Moscow build date', () => {
    const activeId = '2026/05/active-open-incident';
    const futureOpenId = '2026/05/future-open-maintenance';
    const futureKnownId = '2026/05/future-known-maintenance';
    const projection = buildStatusCalendarProjection(
      [
        record(activeId, 'incident', '2026-05-02T10:00:00+03:00'),
        record(futureOpenId, 'maintenance', '2026-05-10T10:00:00+03:00'),
        record(
          futureKnownId,
          'maintenance',
          '2026-05-12T10:00:00+03:00',
          '2026-05-14T00:00:00+03:00',
        ),
      ],
      Date.parse('2026-05-03T21:30:00Z'),
    );

    expect({
      active: datesForRecord(projection, activeId),
      futureOpen: datesForRecord(projection, futureOpenId),
      futureKnown: datesForRecord(projection, futureKnownId),
    }).toMatchInlineSnapshot(`
      {
        "active": [
          "2026-05-04",
          "2026-05-03",
          "2026-05-02",
        ],
        "futureKnown": [
          "2026-05-13",
          "2026-05-12",
        ],
        "futureOpen": [
          "2026-05-10",
        ],
      }
    `);
  });

  it('deduplicates record IDs and keeps separate counts for a mixed day', () => {
    const firstIncident = record(
      '2026/06/electricity-outage-2026-06-24-0400',
      'incident',
      '2026-06-24T04:00:00+03:00',
      '2026-06-24T08:58:00+03:00',
    );
    const projection = buildStatusCalendarProjection(
      [
        record(
          '2026/06/electricity-outage-2026-06-24',
          'maintenance',
          '2026-06-24T09:00:00+03:00',
          '2026-06-24T17:00:00+03:00',
        ),
        firstIncident,
        record(
          '2026/06/electricity-outage-2026-06-24-0859',
          'incident',
          '2026-06-24T08:59:00+03:00',
          '2026-06-24T11:23:00+03:00',
        ),
        firstIncident,
      ],
      BUILD_NOW_MS,
    );

    expect(projection.byDay.get('2026-06-24')).toMatchInlineSnapshot(`
      {
        "day": 24,
        "id": "2026-06-24",
        "incidentCount": 2,
        "kind": "mixed",
        "maintenanceCount": 1,
        "month": 6,
        "recordIds": [
          "2026/06/electricity-outage-2026-06-24-0400",
          "2026/06/electricity-outage-2026-06-24-0859",
          "2026/06/electricity-outage-2026-06-24",
        ],
        "year": 2026,
      }
    `);
  });

  it('orders carry-overs before records that start that day regardless of input order', () => {
    const carryOver = record(
      '2026/06/water-forest-outage-2026-06-13',
      'incident',
      '2026-06-13T20:30:00+03:00',
      '2026-06-19T00:00:00+03:00',
    );
    const startsAtTen = record(
      '2026/06/water-forest-village-outage-2026-06-18',
      'incident',
      '2026-06-18T10:00:00+03:00',
      '2026-06-18T14:00:00+03:00',
    );
    const startsAtThirteen = record(
      '2026/06/electricity-river-outage-2026-06-18',
      'incident',
      '2026-06-18T13:10:00+03:00',
      '2026-06-18T16:00:00+03:00',
    );
    const expected = [carryOver.id, startsAtTen.id, startsAtThirteen.id];
    const first = buildStatusCalendarProjection(
      [startsAtThirteen, carryOver, startsAtTen],
      BUILD_NOW_MS,
    );
    const second = buildStatusCalendarProjection(
      [startsAtTen, startsAtThirteen, carryOver],
      BUILD_NOW_MS,
    );

    expect([
      first.byDay.get('2026-06-18')?.recordIds,
      second.byDay.get('2026-06-18')?.recordIds,
    ]).toEqual([expected, expected]);
  });

  it('does not project zero-length records', () => {
    const projection = buildStatusCalendarProjection(
      [
        record(
          '2026/06/zero-length',
          'incident',
          '2026-06-24T09:00:00+03:00',
          '2026-06-24T09:00:00+03:00',
        ),
      ],
      BUILD_NOW_MS,
    );

    expect(projection).toMatchObject({
      years: [],
      byYear: new Map(),
      byMonth: new Map(),
      byDay: new Map(),
    });
    expect(statusCalendarMonthId(2026, 6)).toBe('2026/06');
  });
});
