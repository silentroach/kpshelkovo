import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadSettlements } from './data';
import type { RawSettlement } from './settlement/schema';

const rawSettlement: RawSettlement = {
  name: 'Тестовый поселок',
  short_name: 'Тестовый',
  slug: 'test',
  website: 'https://example.com',
  is_baseline: true,
  location: {
    address_text: 'Московская область',
    lat: 55.1,
    lng: 37.1,
    district: 'Тестовый район',
  },
  tariff: {
    value: 12_000,
    unit: 'rub_per_lot',
    period: 'month',
  },
  infrastructure: {
    roads: 'partial_asphalt',
    video_surveillance: 'checkpoint_only',
  },
  common_spaces: {
    walking_routes: 'yes',
  },
  service_model: {
    garbage_collection: 'yes',
  },
  sources: [
    {
      title: 'Источник',
      url: 'https://example.com/source',
      type: 'official',
      date_checked: '2026-04-03',
      comment: '',
    },
  ],
};

let rawSettlements = [rawSettlement];

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async () => rawSettlements.map((data) => ({ data }))),
}));

describe('loadSettlements', () => {
  beforeEach(() => {
    rawSettlements = [rawSettlement];
  });

  it('maps raw collection entries into domain settlements', async () => {
    const { settlements, baseline } = await loadSettlements();

    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toMatchObject({
      shortName: 'Тестовый',
      isBaseline: true,
      location: {
        addressText: 'Московская область',
      },
      tariff: {
        unit: 'perLot',
        normalizedPerSotkaMonth: 1_200,
        normalizedIsEstimate: true,
      },
      infrastructure: {
        roads: 'partlyAsphalt',
        videoSurveillance: 'checkpointOnly',
      },
      commonSpaces: {
        walkingRoutes: 'yes',
      },
      serviceModel: {
        garbageCollection: 'yes',
      },
    });
    expect('short_name' in settlements[0]).toBe(false);
    expect('common_spaces' in settlements[0]).toBe(false);
    expect(baseline).toBe(settlements[0]);
  });

  it('rejects a collection without a baseline settlement', async () => {
    rawSettlements = [{ ...rawSettlement, is_baseline: false }];

    await expect(loadSettlements()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Settlements collection must contain exactly one baseline settlement; found 0]`,
    );
  });

  it('rejects multiple baseline settlements without depending on input order', async () => {
    rawSettlements = [
      rawSettlement,
      {
        ...rawSettlement,
        name: 'Другая база',
        short_name: 'Другая',
        slug: 'duplicate-baseline',
        website: 'https://example.com/duplicate',
      },
    ];

    await expect(loadSettlements()).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Settlements collection must contain exactly one baseline settlement; found 2 (duplicate-baseline, test)]`,
    );
  });
});
