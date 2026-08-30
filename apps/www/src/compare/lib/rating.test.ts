import * as geo from '@shelkovo/geo';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRatings,
  MKAD_RADIUS,
  RABSTVO_PENALTY,
  WATER_BONUS,
} from './rating';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';
import type { Settlement } from './settlement/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function mk(
  slug: string,
  opts?: Partial<RawSettlement> & {
    lat?: number;
    lng?: number;
  },
): Settlement {
  return mapRawSettlement({
    name: slug,
    short_name: slug,
    slug,
    website: `https://example.com/${slug}`,
    is_baseline: false,
    location: {
      address_text: 'МО, округ Истра',
      lat: opts?.lat ?? 55.7558,
      lng: opts?.lng ?? 37.6176,
      district: 'Истринский район',
    },
    tariff: {
      value: 100,
      unit: 'rub_per_sotka',
      period: 'month',
    },
    infrastructure: {},
    common_spaces: {},
    service_model: {},
    sources: [
      {
        title: 'Источник',
        url: `https://example.com/${slug}/source`,
        type: 'official',
        date_checked: '2026-04-14',
        comment: '',
      },
    ],
    ...opts,
  } satisfies RawSettlement);
}

describe('buildRatings', () => {
  it('calculates distance to Moscow once per settlement', () => {
    const calculateDistance = vi.spyOn(geo, 'calculateDistance');

    buildRatings([mk('first'), mk('second')]);

    expect(calculateDistance).toHaveBeenCalledTimes(2);
  });

  it('uses distance from Moscow beyond MKAD radius', () => {
    const rows = buildRatings([
      mk('near', {
        lat: 55.78,
        lng: 37.8,
      }),
      mk('far', {
        lat: 55.1,
        lng: 39.0,
      }),
    ]);

    const near = rows.get('near');
    const far = rows.get('far');

    expect(MKAD_RADIUS).toBeGreaterThan(10);
    expect(MKAD_RADIUS).toBeLessThan(30);
    expect(near?.ring).toBeLessThan(far?.ring ?? 0);
    expect(near?.score).toBeGreaterThan(far?.score ?? 0);
  });

  it('keeps fully unknown rows between strong and weak rows', () => {
    const rows = buildRatings([
      mk('good', {
        infrastructure: {
          roads: 'asphalt',
          lighting: 'yes',
          gas: 'yes',
          water: 'yes',
          sewage: 'yes',
          checkpoints: 'yes',
          security: 'yes',
          fencing: 'yes',
          video_surveillance: 'full',
          retail_or_services: 'yes',
        },
        common_spaces: {
          playgrounds: 'yes',
          sports: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          club_infrastructure: 'yes',
        },
        service_model: {
          garbage_collection: 'yes',
          snow_removal: 'yes',
          road_cleaning: 'yes',
        },
      }),
      mk('bad', {
        infrastructure: {
          roads: 'dirt',
          lighting: 'no',
          gas: 'no',
          water: 'no',
          sewage: 'no',
          checkpoints: 'no',
          security: 'no',
          fencing: 'no',
          video_surveillance: 'none',
          retail_or_services: 'no',
        },
        common_spaces: {
          playgrounds: 'no',
          sports: 'no',
          walking_routes: 'no',
          water_access: 'no',
          club_infrastructure: 'no',
        },
        service_model: {
          garbage_collection: 'no',
          snow_removal: 'no',
          road_cleaning: 'no',
        },
      }),
      mk('mid'),
    ]);

    const good = rows.get('good')?.score ?? 0;
    const bad = rows.get('bad')?.score ?? 0;
    const mid = rows.get('mid')?.score ?? 0;

    expect(good).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(bad);
  });

  it('shrinks sparse rows to a neutral midpoint instead of the dataset average', () => {
    const rows = buildRatings([
      mk('good', {
        infrastructure: {
          roads: 'asphalt',
          lighting: 'yes',
          gas: 'yes',
          water: 'yes',
          sewage: 'yes',
          checkpoints: 'yes',
          security: 'yes',
          fencing: 'yes',
          video_surveillance: 'full',
          retail_or_services: 'yes',
        },
        common_spaces: {
          playgrounds: 'yes',
          sports: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          club_infrastructure: 'yes',
        },
        service_model: {
          garbage_collection: 'yes',
          snow_removal: 'yes',
          road_cleaning: 'yes',
        },
      }),
      mk('mid'),
    ]);

    const good = rows.get('good')?.score ?? 0;
    const mid = rows.get('mid')?.score ?? 0;

    expect(mid).toBe(57.5);
    expect(good).toBeGreaterThan(mid);
  });

  it('adds a bonus when central water is included in tariff', () => {
    const rows = buildRatings([
      mk('base', {
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
        },
      }),
      mk('bonus', {
        water_in_tariff: true,
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
        },
      }),
    ]);

    const base = rows.get('base')?.score ?? 0;
    const bonus = rows.get('bonus')?.score ?? 0;

    expect(bonus - base).toBeCloseTo(WATER_BONUS, 6);
  });

  it('applies a strong penalty for mentions in obmandachniki', () => {
    const rows = buildRatings([
      mk('clean', {
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
          security: 'yes',
        },
      }),
      mk('flagged', {
        rabstvo: true,
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
          security: 'yes',
        },
      }),
    ]);

    const clean = rows.get('clean')?.score ?? 0;
    const flagged = rows.get('flagged')?.score ?? 0;

    expect(clean - flagged).toBe(RABSTVO_PENALTY);
  });
});
