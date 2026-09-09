import * as geo from '@shelkovo/geo';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildRatings, MKAD_RADIUS, RATING_METHODOLOGY } from './rating';
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
  }
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
      district: 'Истринский район'
    },
    tariff: {
      value: 100,
      unit: 'rub_per_sotka',
      period: 'month'
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
        comment: ''
      }
    ],
    ...opts
  } satisfies RawSettlement);
}

function completeRatingFields(
  level: 'high' | 'low'
): Pick<RawSettlement, 'infrastructure' | 'common_spaces' | 'service_model'> {
  const high = level === 'high';
  const availability = high ? 'yes' : 'no';

  return {
    infrastructure: {
      roads: high ? 'asphalt' : 'dirt',
      sidewalks: availability,
      lighting: availability,
      gas: availability,
      water: availability,
      sewage: availability,
      drainage: high ? 'closed' : 'none',
      checkpoints: availability,
      security: availability,
      fencing: availability,
      video_surveillance: high ? 'full' : 'none',
      underground_electricity: high ? 'full' : 'none',
      admin_building: availability,
      retail_or_services: availability
    },
    common_spaces: {
      club_infrastructure: availability,
      playgrounds: availability,
      sports: availability,
      walking_routes: availability,
      water_access: availability,
      beach_zones: availability,
      bbq_zones: availability,
      pool: availability,
      fitness_club: availability,
      restaurant: availability,
      spa_center: availability,
      kids_club: availability,
      sports_camp: availability,
      primary_school: availability
    },
    service_model: {
      garbage_collection: availability,
      snow_removal: availability,
      road_cleaning: availability,
      landscaping: availability,
      emergency_service: availability,
      dispatcher: availability
    }
  };
}

describe('buildRatings', () => {
  it('keeps group weights normalized and distance points ordered', () => {
    const groupWeightTotal = Object.values(RATING_METHODOLOGY.groupWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );
    const distancePointsAreOrdered = RATING_METHODOLOGY.distancePoints.every(
      (point, index, points) => {
        const previous = points[index - 1];
        return !previous || point.ringKm > previous.ringKm;
      }
    );

    expect(groupWeightTotal).toBe(1);
    expect(distancePointsAreOrdered).toBe(true);
  });

  it('calculates distance to Moscow once per settlement', () => {
    const calculateDistance = vi.spyOn(geo, 'calculateDistance');

    buildRatings([mk('first'), mk('second')]);

    expect(calculateDistance).toHaveBeenCalledTimes(2);
  });

  it('uses distance from Moscow beyond MKAD radius', () => {
    const rows = buildRatings([
      mk('near', {
        lat: 55.78,
        lng: 37.8
      }),
      mk('far', {
        lat: 55.1,
        lng: 39.0
      })
    ]);

    const near = rows.get('near');
    const far = rows.get('far');

    expect(MKAD_RADIUS).toBeGreaterThan(10);
    expect(MKAD_RADIUS).toBeLessThan(30);
    expect(near?.ring).toBeLessThan(far?.ring ?? 0);
    expect(near?.score).toBeGreaterThan(far?.score ?? 0);
  });

  it('interpolates distance, keeps its floor, and clamps final scores', () => {
    const calculateDistance = vi.spyOn(geo, 'calculateDistance');

    calculateDistance
      .mockReturnValueOnce(MKAD_RADIUS + 50)
      .mockReturnValueOnce(MKAD_RADIUS + 140)
      .mockReturnValueOnce(MKAD_RADIUS)
      .mockReturnValueOnce(MKAD_RADIUS + 140);

    const rows = buildRatings([
      mk('interpolated'),
      mk('floor'),
      mk('maximum', {
        ...completeRatingFields('high'),
        water_in_tariff: true
      }),
      mk('minimum', {
        ...completeRatingFields('low'),
        rabstvo: true
      })
    ]);

    expect(['interpolated', 'floor', 'maximum', 'minimum'].map((slug) => rows.get(slug)?.score))
      .toMatchInlineSnapshot(`
      [
        53,
        44.3,
        100,
        0,
      ]
    `);
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
          retail_or_services: 'yes'
        },
        common_spaces: {
          playgrounds: 'yes',
          sports: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          club_infrastructure: 'yes'
        },
        service_model: {
          garbage_collection: 'yes',
          snow_removal: 'yes',
          road_cleaning: 'yes'
        }
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
          retail_or_services: 'no'
        },
        common_spaces: {
          playgrounds: 'no',
          sports: 'no',
          walking_routes: 'no',
          water_access: 'no',
          club_infrastructure: 'no'
        },
        service_model: {
          garbage_collection: 'no',
          snow_removal: 'no',
          road_cleaning: 'no'
        }
      }),
      mk('mid')
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
          retail_or_services: 'yes'
        },
        common_spaces: {
          playgrounds: 'yes',
          sports: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          club_infrastructure: 'yes'
        },
        service_model: {
          garbage_collection: 'yes',
          snow_removal: 'yes',
          road_cleaning: 'yes'
        }
      }),
      mk('mid')
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
          roads: 'asphalt'
        }
      }),
      mk('bonus', {
        water_in_tariff: true,
        infrastructure: {
          water: 'yes',
          roads: 'asphalt'
        }
      })
    ]);

    const base = rows.get('base')?.score ?? 0;
    const bonus = rows.get('bonus')?.score ?? 0;

    expect(bonus - base).toBeCloseTo(RATING_METHODOLOGY.adjustments.waterInTariffBonus, 6);
  });

  it('applies a strong penalty for mentions in obmandachniki', () => {
    const rows = buildRatings([
      mk('clean', {
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
          security: 'yes'
        }
      }),
      mk('flagged', {
        rabstvo: true,
        infrastructure: {
          water: 'yes',
          roads: 'asphalt',
          security: 'yes'
        }
      })
    ]);

    const clean = rows.get('clean')?.score ?? 0;
    const flagged = rows.get('flagged')?.score ?? 0;

    expect(clean - flagged).toBe(RATING_METHODOLOGY.adjustments.rabstvoPenalty);
  });
});
