import { describe, expect, it } from 'vitest';
import { calculateDistance } from '@shelkovo/geo';

import { toFull, toFullPayload } from './full';
import type { Rating } from './rating';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';

const base = mapRawSettlement({
  name: 'КП Шелково',
  short_name: 'Шелково',
  slug: 'shelkovo',
  website: 'https://example.com/shelkovo',
  is_baseline: true,
  location: {
    address_text: 'МО, округ Истра, д. Шелково',
    lat: 55.7,
    lng: 37,
    map_url: 'https://example.com/shelkovo-map',
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
      title: 'Источник базы',
      url: 'https://example.com/base-source',
      type: 'official',
      date_checked: '2026-04-09',
      comment: '',
    },
  ],
} satisfies RawSettlement);

const row = mapRawSettlement({
  name: 'КП Тестовый',
  short_name: 'Тестовый',
  slug: 'test',
  website: 'https://example.com',
  telegram: 'testchat',
  management_company: {
    title: 'УК Тест',
    url: 'https://example.com/company',
  },
  is_baseline: false,
  location: {
    address_text: 'МО, округ Истра, д. Тестово',
    lat: 55.8,
    lng: 37.1,
    map_url: 'https://example.com/map',
    district: 'Истринский район',
  },
  tariff: {
    value: 120,
    unit: 'rub_per_sotka',
    period: 'month',
    note: 'Тестовое примечание',
  },
  water_in_tariff: true,
  rabstvo: true,
  infrastructure: { gas: 'yes', roads: 'asphalt' },
  common_spaces: { playgrounds: 'yes' },
  service_model: { snow_removal: 'yes' },
  sources: [
    {
      title: 'Источник',
      url: 'https://example.com/source',
      type: 'official',
      date_checked: '2026-04-09',
      comment: '',
    },
  ],
} satisfies RawSettlement);

const ratings = new Map<string, Rating>([
  [
    'shelkovo',
    {
      score: 55,
      km: 48,
      ring: 29.8,
    },
  ],
  [
    'test',
    {
      score: 72.4,
      km: 62.1,
      ring: 43.9,
    },
  ],
]);

describe('toFull', () => {
  it('keeps full data, adds distance, and omits sources', () => {
    const list = toFull([base, row], ratings);
    const home = list.find((item) => item.slug === 'shelkovo');
    const item = list.find((item) => item.slug === 'test');

    expect(home?.distance).toEqual({
      moscow_km: 48,
      mkad_km: 29.8,
      shelkovo_km: 0,
    });

    expect(item?.rating).toBe(72.4);
    expect(item?.distance).toEqual({
      moscow_km: 62.1,
      mkad_km: 43.9,
      shelkovo_km:
        Math.round(
          calculateDistance(
            base.location.lat,
            base.location.lng,
            row.location.lat,
            row.location.lng,
          ) * 10,
        ) / 10,
    });

    expect(item?.website).toBe('https://example.com');
    expect(item?.location.address_text).toBe('МО, округ Истра, д. Тестово');
    expect(item?.tariff.note).toBe('Тестовое примечание');
  });

  it('builds the full public payload through explicit DTO adapters', () => {
    const payload = toFullPayload({
      settlements: [base, row],
      ratings,
      stats: {
        shelkovoTariff: 100,
        medianTariff: 110,
        peerMedianTariff: 120,
        meanTariff: 115,
        minTariff: 100,
        maxTariff: 130,
        shelkovoRank: 1,
        totalSettlements: 2,
        cheaperCount: 0,
        moreExpensiveCount: 1,
        shelkovoVsMedianPercent: -9.1,
        shelkovoVsPeerMedianPercent: -16.7,
        shelkovoVsMeanPercent: -13,
      },
      comparisons: new Map([
        [
          'test',
          {
            tariffDelta: 20,
            tariffDeltaPercent: 20,
            isCheaper: false,
          },
        ],
      ]),
    });

    expect(payload.stats).toEqual({
      shelkovoTariff: 100,
      medianTariff: 110,
      peerMedianTariff: 120,
      meanTariff: 115,
      minTariff: 100,
      maxTariff: 130,
      shelkovoRank: 1,
      totalSettlements: 2,
      cheaperCount: 0,
      moreExpensiveCount: 1,
      shelkovoVsMedianPercent: -9.1,
      shelkovoVsPeerMedianPercent: -16.7,
      shelkovoVsMeanPercent: -13,
    });
    expect(payload.comparisons).toEqual({
      test: {
        tariffDelta: 20,
        tariffDeltaPercent: 20,
        isCheaper: false,
      },
    });
    expect(payload.settlements[0]?.location.address_text).toBe(
      'МО, округ Истра, д. Шелково',
    );
  });
});
