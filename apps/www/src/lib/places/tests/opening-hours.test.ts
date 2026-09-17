import { describe, expect, it } from 'vitest';

import { formatPlaceOpeningHours, getPlaceClosingTime, isPlaceOpen } from '../opening-hours';
import { PLACE_WEEKDAYS } from '../schema';
import type { PlaceOpeningHours } from '../types';

describe('place opening hours', () => {
  it('formats daily hours in one row', () => {
    expect(
      formatPlaceOpeningHours({
        periods: [{ days: PLACE_WEEKDAYS, opensAt: '07:00', closesAt: '23:00' }]
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "closed": false,
          "days": "Ежедневно",
          "hours": "07:00–23:00",
        },
      ]
    `);
  });

  it('keeps a midweek day off and working weekends distinct', () => {
    expect(
      formatPlaceOpeningHours({
        periods: [
          { days: ['mon', 'wed', 'thu', 'fri'], opensAt: '10:00', closesAt: '19:00' },
          { days: ['sat', 'sun'], opensAt: '10:00', closesAt: '20:00' }
        ]
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "closed": false,
          "days": "пн",
          "hours": "10:00–19:00",
        },
        {
          "closed": true,
          "days": "вт",
          "hours": "выходной",
        },
        {
          "closed": false,
          "days": "ср–пт",
          "hours": "10:00–19:00",
        },
        {
          "closed": false,
          "days": "сб–вс",
          "hours": "10:00–20:00",
        },
      ]
    `);
  });

  it('does not join matching hours across other hours or the week boundary', () => {
    expect(
      formatPlaceOpeningHours({
        periods: [
          { days: ['mon', 'tue', 'wed', 'thu', 'sun'], opensAt: '09:00', closesAt: '22:00' },
          { days: ['fri', 'sat'], opensAt: '09:00', closesAt: '23:00' }
        ]
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "closed": false,
          "days": "пн–чт",
          "hours": "09:00–22:00",
        },
        {
          "closed": false,
          "days": "пт–сб",
          "hours": "09:00–23:00",
        },
        {
          "closed": false,
          "days": "вс",
          "hours": "09:00–22:00",
        },
      ]
    `);
  });

  it('sorts intervals without mutation and groups only complete matching schedules', () => {
    const hours: PlaceOpeningHours = {
      periods: [
        { days: ['fri', 'thu', 'wed', 'tue', 'mon'], opensAt: '14:00', closesAt: '18:00' },
        { days: ['mon', 'tue', 'wed', 'thu', 'fri'], opensAt: '09:00', closesAt: '13:00' }
      ]
    };
    const original = structuredClone(hours);
    const rows = formatPlaceOpeningHours(hours);
    expect(rows).toMatchInlineSnapshot(`
      [
        {
          "closed": false,
          "days": "пн–пт",
          "hours": "09:00–13:00, 14:00–18:00",
        },
        {
          "closed": true,
          "days": "сб–вс",
          "hours": "выходной",
        },
      ]
    `);
    expect(hours).toEqual(original);
    expect(
      formatPlaceOpeningHours({
        periods: hours.periods.toReversed().map((period) => ({
          ...period,
          days: period.days.toReversed()
        }))
      })
    ).toEqual(rows);
    expect(
      formatPlaceOpeningHours({
        periods: [...hours.periods, { days: ['fri'], opensAt: '19:00', closesAt: '20:00' }]
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "closed": false,
          "days": "пн–чт",
          "hours": "09:00–13:00, 14:00–18:00",
        },
        {
          "closed": false,
          "days": "пт",
          "hours": "09:00–13:00, 14:00–18:00, 19:00–20:00",
        },
        {
          "closed": true,
          "days": "сб–вс",
          "hours": "выходной",
        },
      ]
    `);
  });

  it.each([
    ['2026-08-17T05:59:00Z', false, undefined],
    ['2026-08-17T06:00:00Z', true, '13:00'],
    ['2026-08-17T09:59:00Z', true, '13:00'],
    ['2026-08-17T10:00:00Z', false, undefined],
    ['2026-08-17T10:30:00Z', false, undefined],
    ['2026-08-17T11:00:00Z', true, '18:00'],
    ['2026-08-17T15:00:00Z', false, undefined],
    ['2026-08-18T06:00:00Z', false, undefined],
    ['2026-08-17T21:30:00Z', false, undefined]
  ])('matches Moscow intervals at %s', (instant, open, closingTime) => {
    const hours: PlaceOpeningHours = {
      periods: [
        { days: ['mon'], opensAt: '14:00', closesAt: '18:00' },
        { days: ['mon'], opensAt: '09:00', closesAt: '13:00' },
        { days: ['mon'], opensAt: '00:00', closesAt: '01:00' }
      ]
    };
    const date = new Date(instant);
    expect(isPlaceOpen(hours, date)).toBe(open);
    expect(getPlaceClosingTime(hours, date)).toBe(closingTime);
    expect(getPlaceClosingTime({ ...hours, description: 'Вход со двора.' }, date)).toBe(
      closingTime
    );
  });
});
