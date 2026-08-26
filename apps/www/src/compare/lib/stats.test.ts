import { describe, it, expect } from 'vitest';
import {
  calculateMedian,
  calculatePercentile,
  computeStats,
  rankSettlements,
} from './stats';
import type { Rating } from './rating';
import { mapRawSettlement } from './settlement/mapper';
import type { RawSettlement } from './settlement/schema';
import type { Settlement } from './settlement/types';

const toDomain = (item: RawSettlement): Settlement => mapRawSettlement(item);

describe('Stats Module', () => {
  describe('calculateMedian', () => {
    it('should calculate median for odd count array', () => {
      const values = [1, 2, 3, 4, 5];
      expect(calculateMedian(values)).toBe(3);
    });

    it('should calculate median for even count array', () => {
      const values = [1, 2, 3, 4];
      expect(calculateMedian(values)).toBe(2.5);
    });

    it('should return single value for single element array', () => {
      const values = [42];
      expect(calculateMedian(values)).toBe(42);
    });

    it('should throw error for empty array', () => {
      expect(() => calculateMedian([])).toThrow(
        'Cannot calculate median of empty array',
      );
    });

    it('should handle unsorted arrays', () => {
      const values = [5, 2, 8, 1, 9];
      expect(calculateMedian(values)).toBe(5);
    });

    it('should handle decimal values', () => {
      const values = [1.5, 2.5, 3.5];
      expect(calculateMedian(values)).toBe(2.5);
    });
  });

  describe('rankSettlements', () => {
    it('should share ranks for equal tariffs', () => {
      const settlements = [
        {
          name: 'Gamma',
          short_name: 'Гамма',
          slug: 'gamma',
          website: 'https://gamma.test',
          is_baseline: false,
          location: {
            address_text: 'МО',
            lat: 55,
            lng: 37,
            district: 'Test',
          },
          tariff: {
            value: 200,
            unit: 'rub_per_sotka',
            period: 'month',
          },
          infrastructure: {},
          common_spaces: {},
          service_model: {},
          sources: [
            {
              title: 'Test',
              url: 'https://test.com',
              type: 'official',
              date_checked: '2026-04-03',
              comment: '',
            },
          ],
        },
        {
          name: 'Alpha',
          short_name: 'Альфа',
          slug: 'alpha',
          website: 'https://alpha.test',
          is_baseline: true,
          location: {
            address_text: 'МО',
            lat: 55.1,
            lng: 37.1,
            district: 'Test',
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
              title: 'Test',
              url: 'https://test.com',
              type: 'official',
              date_checked: '2026-04-03',
              comment: '',
            },
          ],
        },
        {
          name: 'Beta',
          short_name: 'Бета',
          slug: 'beta',
          website: 'https://beta.test',
          is_baseline: false,
          location: {
            address_text: 'МО',
            lat: 55.2,
            lng: 37.2,
            district: 'Test',
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
              title: 'Test',
              url: 'https://test.com',
              type: 'official',
              date_checked: '2026-04-03',
              comment: '',
            },
          ],
        },
      ].map((item) => toDomain(item as RawSettlement));

      const ranks = rankSettlements(settlements);

      expect(ranks.get('alpha')).toBe(1);
      expect(ranks.get('beta')).toBe(1);
      expect(ranks.get('gamma')).toBe(2);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate positive percentile when value is higher', () => {
      // Шелково 120, медиана 80 → +50%.
      expect(calculatePercentile(120, 80)).toBe(50);
    });

    it('should calculate negative percentile when value is lower', () => {
      // Шелково 120, медиана 150 → -20%.
      expect(calculatePercentile(120, 150)).toBe(-20);
    });

    it('should return 0 when value equals median', () => {
      expect(calculatePercentile(100, 100)).toBe(0);
    });

    it('should handle decimal percentages', () => {
      // Шелково 100, медиана 66.67 → +50%.
      expect(calculatePercentile(100, 66.666666)).toBeCloseTo(50, 1);
    });
  });

  describe('computeStats', () => {
    const mockSettlements = [
      {
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
          value: 4500,
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
      },
      {
        name: 'Lesnoe',
        short_name: 'Lesnoe',
        slug: 'lesnoe',
        website: 'https://lesnoe.ru',
        management_company: 'УК Лесное',
        is_baseline: false,
        location: {
          address_text: 'МО, Лесное',
          lat: 55.1,
          lng: 37.1,
          district: 'Test',
        },
        tariff: {
          value: 3500,
          unit: 'rub_per_sotka',
          period: 'month',
          note: '',
        },
        infrastructure: {
          roads: 'asphalt',
          sidewalks: 'yes',
          lighting: 'yes',
          gas: 'yes',
          water: 'yes',
          sewage: 'yes',
          drainage: 'closed',
          checkpoints: 'yes',
          security: 'yes',
          fencing: 'yes',
          video_surveillance: 'full',
          underground_electricity: 'full',
          admin_building: 'yes',
          retail_or_services: 'yes',
        },
        common_spaces: {
          club_infrastructure: 'yes',
          playgrounds: 'yes',
          sports: 'yes',
          pool: 'yes',
          fitness_club: 'yes',
          restaurant: 'yes',
          spa_center: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          beach_zones: 'yes',
          kids_club: 'no',
          sports_camp: 'no',
          primary_school: 'no',
          bbq_zones: 'yes',
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
      },
      {
        name: 'Usadby',
        short_name: 'Usadby',
        slug: 'usadby',
        website: 'https://usadby.ru',
        management_company: 'УК Усадьбы',
        is_baseline: false,
        location: {
          address_text: 'МО, Усадьбы',
          lat: 55.2,
          lng: 37.2,
          district: 'Test',
        },
        tariff: {
          value: 5500,
          unit: 'rub_per_sotka',
          period: 'month',
          note: '',
        },
        infrastructure: {
          roads: 'asphalt',
          sidewalks: 'yes',
          lighting: 'yes',
          gas: 'yes',
          water: 'yes',
          sewage: 'yes',
          drainage: 'closed',
          checkpoints: 'yes',
          security: 'yes',
          fencing: 'yes',
          video_surveillance: 'full',
          underground_electricity: 'full',
          admin_building: 'yes',
          retail_or_services: 'yes',
        },
        common_spaces: {
          club_infrastructure: 'yes',
          playgrounds: 'yes',
          sports: 'yes',
          pool: 'yes',
          fitness_club: 'yes',
          restaurant: 'yes',
          spa_center: 'yes',
          walking_routes: 'yes',
          water_access: 'yes',
          beach_zones: 'yes',
          kids_club: 'yes',
          sports_camp: 'yes',
          primary_school: 'yes',
          bbq_zones: 'yes',
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
      },
    ].map((item) => toDomain(item as RawSettlement));

    const ratings = new Map<string, Rating>([
      ['shelkovo', { score: 62.6, km: 0, ring: 0 }],
      ['lesnoe', { score: 61.2, km: 0, ring: 0 }],
      ['usadby', { score: 74.5, km: 0, ring: 0 }],
    ]);

    it('should compute correct stats for settlements', () => {
      const stats = computeStats(mockSettlements, ratings);

      expect(stats.shelkovoTariff).toBe(4500);
      expect(stats.medianTariff).toBe(4500); // Среднее значение из [3500, 4500, 5500].
      expect(stats.peerMedianTariff).toBe(4500);
      expect(stats.meanTariff).toBe(4500); // (3500 + 4500 + 5500) / 3
      expect(stats.minTariff).toBe(3500);
      expect(stats.maxTariff).toBe(5500);
      expect(stats.shelkovoRank).toBe(2); // 2nd cheapest out of 3
      expect(stats.totalSettlements).toBe(3);
      expect(stats.cheaperCount).toBe(1); // Лесное дешевле.
      expect(stats.moreExpensiveCount).toBe(1); // Усадьбы дороже.
      expect(stats.shelkovoVsMedianPercent).toBe(0); // 4500 vs 4500
      expect(stats.shelkovoVsPeerMedianPercent).toBe(0); // 4500 vs 4500
      expect(stats.shelkovoVsMeanPercent).toBe(0); // 4500 vs 4500
    });

    it('should use unique tariff levels for baseline rank', () => {
      const tied = [
        ...mockSettlements,
        {
          ...mockSettlements[1],
          name: 'Lesnoe 2',
          short_name: 'Lesnoe 2',
          slug: 'lesnoe-2',
          website: 'https://lesnoe-2.ru',
        },
      ];
      const tiedRatings = new Map(ratings).set('lesnoe-2', {
        score: 61.5,
        km: 0,
        ring: 0,
      });

      const stats = computeStats(tied, tiedRatings);

      expect(stats.shelkovoRank).toBe(2);
    });

    it('should throw error when no baseline settlement found', () => {
      const noBaselineSettlements = mockSettlements.map((s) => ({
        ...s,
        isBaseline: false,
      }));
      expect(() => computeStats(noBaselineSettlements, ratings)).toThrow(
        'Baseline settlement (Shelkovo) not found',
      );
    });

    it('should throw error when settlements array is empty', () => {
      expect(() => computeStats([], ratings)).toThrow(
        'No settlements provided',
      );
    });

    it('should isolate the baseline rating band when the base is mid-pack', () => {
      const list = Array.from({ length: 9 }, (_, i) => ({
        ...mockSettlements[1],
        name: `Поселок ${i + 1}`,
        shortName: `Поселок ${i + 1}`,
        slug: `row-${i + 1}`,
        website: `https://row-${i + 1}.ru`,
        isBaseline: false,
        tariff: {
          ...mockSettlements[1].tariff,
          value: 3000 + i * 100,
          normalizedPerSotkaMonth: 3000 + i * 100,
        },
      }));
      const settlements = [
        list[0],
        list[1],
        list[2],
        {
          ...mockSettlements[0],
          tariff: {
            ...mockSettlements[0].tariff,
            value: 4500,
            normalizedPerSotkaMonth: 4500,
          },
        },
        list[3],
        list[4],
        list[5],
        list[6],
        list[7],
        list[8],
      ];
      const ratings = new Map<string, Rating>([
        ['row-1', { score: 50, km: 0, ring: 0 }],
        ['row-2', { score: 52, km: 0, ring: 0 }],
        ['row-3', { score: 54, km: 0, ring: 0 }],
        ['shelkovo', { score: 62, km: 0, ring: 0 }],
        ['row-4', { score: 63, km: 0, ring: 0 }],
        ['row-5', { score: 64, km: 0, ring: 0 }],
        ['row-6', { score: 72, km: 0, ring: 0 }],
        ['row-7', { score: 74, km: 0, ring: 0 }],
        ['row-8', { score: 76, km: 0, ring: 0 }],
        ['row-9', { score: 78, km: 0, ring: 0 }],
      ]);

      const stats = computeStats(settlements, ratings);

      expect(stats.peerMedianTariff).toBe(3200);
      expect(stats.shelkovoVsPeerMedianPercent).toBe(41);
    });
  });
});
