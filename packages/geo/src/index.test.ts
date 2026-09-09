import { describe, expect, it } from 'vitest';

import { calculateDistance, getCivilTwilight, isCivilDaylight, isSunlight } from './index';

const shelkovo = {
  lat: 55.065422,
  lng: 37.733096
} as const;

const longyearbyen = {
  lat: 78.2232,
  lng: 15.6469
} as const;

describe('geo package', () => {
  it('returns zero for identical points', () => {
    expect(calculateDistance(55.7, 37, 55.7, 37)).toBe(0);
  });

  it('matches expected distance for known nearby points', () => {
    expect(calculateDistance(55.7, 37, 55.8, 37.1)).toBeCloseTo(12.8, 1);
  });

  it('is symmetric', () => {
    const a = calculateDistance(55.7, 37, 55.8, 37.1);
    const b = calculateDistance(55.8, 37.1, 55.7, 37);

    expect(a).toBeCloseTo(b, 10);
  });

  it('calculates civil dawn and dusk for Shelkovo', () => {
    const twilight = getCivilTwilight(new Date('2026-05-11T12:00:00Z'), shelkovo);

    expect({
      dawn: twilight.dawn.toISOString(),
      dusk: twilight.dusk.toISOString()
    }).toMatchInlineSnapshot(`
      {
        "dawn": "2026-05-11T00:42:34.126Z",
        "dusk": "2026-05-11T18:09:59.254Z",
      }
    `);
  });

  it('treats the civil twilight interval as daylight', () => {
    expect(isCivilDaylight(new Date('2026-05-11T00:42:00Z'), shelkovo)).toBe(false);
    expect(isCivilDaylight(new Date('2026-05-11T00:45:00Z'), shelkovo)).toBe(true);
    expect(isCivilDaylight(new Date('2026-05-11T18:09:00Z'), shelkovo)).toBe(true);
    expect(isCivilDaylight(new Date('2026-05-11T18:10:00Z'), shelkovo)).toBe(false);
  });

  it('treats the sunrise-to-sunset interval as sunlight', () => {
    expect({
      beforeSunrise: isSunlight(new Date('2026-05-11T01:28:00Z'), shelkovo),
      afterSunrise: isSunlight(new Date('2026-05-11T01:29:00Z'), shelkovo),
      beforeSunset: isSunlight(new Date('2026-05-11T17:23:00Z'), shelkovo),
      afterSunset: isSunlight(new Date('2026-05-11T17:24:00Z'), shelkovo)
    }).toMatchInlineSnapshot(`
      {
        "afterSunrise": true,
        "afterSunset": false,
        "beforeSunrise": false,
        "beforeSunset": true,
      }
    `);
  });

  it('follows seasonal civil twilight instead of fixed clock hours', () => {
    expect(isCivilDaylight(new Date('2026-01-11T05:05:00Z'), shelkovo)).toBe(false);
    expect(isCivilDaylight(new Date('2026-01-11T05:07:00Z'), shelkovo)).toBe(true);
    expect(isCivilDaylight(new Date('2026-01-11T14:09:00Z'), shelkovo)).toBe(true);
    expect(isCivilDaylight(new Date('2026-01-11T14:10:00Z'), shelkovo)).toBe(false);
  });

  it('handles dates without civil dawn or dusk', () => {
    expect({
      polarDay: isCivilDaylight(new Date('2026-06-21T12:00:00Z'), longyearbyen),
      polarNight: isCivilDaylight(new Date('2026-12-21T12:00:00Z'), longyearbyen)
    }).toMatchInlineSnapshot(`
      {
        "polarDay": true,
        "polarNight": false,
      }
    `);
  });
});
