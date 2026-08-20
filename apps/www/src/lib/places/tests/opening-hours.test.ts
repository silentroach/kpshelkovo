import { describe, expect, it } from 'vitest';

import { getPlaceClosingTime, isPlaceOpen } from '../opening-hours';
import type { PlaceOpeningHours } from '../types';

const openingHours: PlaceOpeningHours = {
  description: 'С 10:00 до 22:00, вторник — выходной',
  periods: [
    {
      days: ['mon', 'wed', 'thu', 'fri', 'sat', 'sun'],
      opensAt: '10:00',
      closesAt: '22:00',
    },
  ],
};

describe('place opening hours', () => {
  it('uses Moscow time and excludes closing time and days off', () => {
    const dates = [
      '2026-08-17T06:59:00.000Z',
      '2026-08-17T07:00:00.000Z',
      '2026-08-17T18:59:00.000Z',
      '2026-08-17T19:00:00.000Z',
      '2026-08-18T12:00:00.000Z',
    ];

    expect(
      dates.map((date) => ({
        closingTime: getPlaceClosingTime(openingHours, new Date(date)),
        open: isPlaceOpen(openingHours, new Date(date)),
      })),
    ).toMatchInlineSnapshot(`
        [
          {
            "closingTime": undefined,
            "open": false,
          },
          {
            "closingTime": "22:00",
            "open": true,
          },
          {
            "closingTime": "22:00",
            "open": true,
          },
          {
            "closingTime": undefined,
            "open": false,
          },
          {
            "closingTime": undefined,
            "open": false,
          },
        ]
      `);
  });
});
