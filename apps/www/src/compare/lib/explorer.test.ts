import { describe, expect, it } from 'vitest';
import { toExplorer, toExplorerPayload } from './explorer';
import type { Rating } from './rating';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';

const settlement = mapRawSettlement({
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
      comment: 'ok',
    },
  ],
} satisfies RawSettlement);

const baseline = {
  ...settlement,
  name: 'КП Шелково',
  shortName: 'Шелково',
  slug: 'shelkovo',
  isBaseline: true,
};

const ratings = new Map<string, Rating>([
  [
    'test',
    {
      score: 72.4,
      km: 62.1,
      ring: 43.9,
    },
  ],
]);

describe('toExplorer', () => {
  it('keeps only fields needed by the main explorer', () => {
    const [item] = toExplorer([settlement], ratings, baseline);

    expect(item).toEqual({
      name: 'КП Тестовый',
      shortName: 'Тестовый',
      slug: 'test',
      rating: 72.4,
      rabstvo: true,
      managementCompany: { title: 'УК Тест' },
      isBaseline: false,
      location: {
        lat: 55.8,
        lng: 37.1,
        district: 'Истринский район',
      },
      tariff: {
        normalizedPerSotkaMonth: 120,
        normalizedIsEstimate: false,
      },
    });

    expect('website' in item).toBe(false);
    expect('telegram' in item).toBe(false);
    expect('address_text' in item.location).toBe(false);
    expect('map_url' in item.location).toBe(false);
    expect('value' in item.tariff).toBe(false);
    expect('unit' in item.tariff).toBe(false);
    expect('period' in item.tariff).toBe(false);
    expect('note' in item.tariff).toBe(false);
    expect('url' in (item.managementCompany as { title: string })).toBe(false);
    expect(JSON.stringify([item]).length).toBeLessThan(
      JSON.stringify([settlement]).length,
    );
  });

  it('builds the explorer public payload through explicit DTO adapters', () => {
    const payload = toExplorerPayload({
      settlements: [settlement],
      baseline,
      ratings,
      stats: {
        shelkovoTariff: 100,
        medianTariff: 110,
        peerMedianTariff: 120,
        meanTariff: 115,
        minTariff: 100,
        maxTariff: 130,
        shelkovoRank: 1,
        totalSettlements: 1,
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

    expect(payload.settlements[0]?.tariff.normalizedPerSotkaMonth).toBe(120);
    expect(payload.stats.totalSettlements).toBe(1);
    expect(payload.comparisons.test).toEqual({
      tariffDelta: 20,
      tariffDeltaPercent: 20,
      isCheaper: false,
    });
  });
});
