import { describe, it, expect } from 'vitest';
import { compareSettlements, calculateTariffDelta } from './comparisons';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';

describe('Comparisons Module', () => {
  const mockShelkovo = mapRawSettlement({
    name: 'Shelkovo',
    short_name: 'Shelkovo',
    slug: 'shelkovo',
    website: 'https://shelkovo.ru',
    management_company: 'УК Шелково',
    is_baseline: true,
    location: {
      address_text: 'МО, Шелково',
      lat: 55.0,
      lng: 37.0,
      district: 'Test',
    },
    tariff: {
      value: 120,
      unit: 'rub_per_sotka',
      period: 'month',
      note: '',
    },
    infrastructure: {
      roads: 'partial_asphalt',
      sidewalks: 'no',
      lighting: 'yes',
      gas: 'yes',
      water: 'yes',
      sewage: 'no',
      drainage: 'open',
      checkpoints: 'yes',
      security: 'yes',
      fencing: 'yes',
      video_surveillance: 'checkpoint_only',
      underground_electricity: 'partial',
      admin_building: 'no',
      retail_or_services: 'no',
    },
    common_spaces: {
      club_infrastructure: 'yes',
      playgrounds: 'yes',
      sports: 'yes',
      pool: 'no',
      fitness_club: 'no',
      restaurant: 'no',
      spa_center: 'no',
      walking_routes: 'no',
      water_access: 'yes',
      beach_zones: 'no',
      kids_club: 'no',
      sports_camp: 'no',
      primary_school: 'no',
      bbq_zones: 'no',
    },
    service_model: {
      garbage_collection: 'yes',
      snow_removal: 'yes',
      road_cleaning: 'yes',
      landscaping: 'yes',
      emergency_service: 'yes',
      dispatcher: 'yes',
    },
    sources: [
      {
        title: 'Test',
        url: 'https://test.com',
        type: 'official',
        date_checked: '2026-04-03',
        comment: '',
      },
    ],
  } satisfies RawSettlement);

  describe('calculateTariffDelta', () => {
    it('should calculate positive delta when other is cheaper', () => {
      // Шелково 120, другой поселок 80 -> +40 руб., +33%.
      const result = calculateTariffDelta(120, 80);
      expect(result.delta).toBe(40);
      expect(result.deltaPercent).toBe(33);
      expect(result.isCheaper).toBe(true);
    });

    it('should calculate negative delta when other is more expensive', () => {
      // Шелково 120, другой поселок 150 -> -30 руб., -25%.
      const result = calculateTariffDelta(120, 150);
      expect(result.delta).toBe(-30);
      expect(result.deltaPercent).toBe(-25);
      expect(result.isCheaper).toBe(false);
    });

    it('should return zero delta when tariffs are equal', () => {
      const result = calculateTariffDelta(120, 120);
      expect(result.delta).toBe(0);
      expect(result.deltaPercent).toBe(0);
      expect(result.isCheaper).toBe(false);
    });
  });

  describe('compareSettlements', () => {
    it('should return complete comparison result', () => {
      const otherSettlement = {
        ...mockShelkovo,
        slug: 'lesnoe',
        shortName: 'Lesnoe',
        name: 'Lesnoe',
        isBaseline: false,
        tariff: {
          value: 80,
          unit: 'perSotka' as const,
          period: 'month' as const,
          normalizedPerSotkaMonth: 80,
          normalizedIsEstimate: false,
          note: '',
        },
      };

      const result = compareSettlements(mockShelkovo, otherSettlement);
      expect(result.tariffDelta).toBe(40);
      expect(result.tariffDeltaPercent).toBe(33);
      expect(result.isCheaper).toBe(true);
    });
  });
});
