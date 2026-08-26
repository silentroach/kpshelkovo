import { describe, it, expect, expectTypeOf } from 'vitest';
import type { CollectionEntry } from 'astro:content';
import type { RawSettlement } from './settlement/schema';
import { mapRawSettlement } from './settlement/mapper';
import { getLotAverage } from './settlement/lots';
import { SettlementSchema } from '../lib/schema';

describe('Schema Validation', () => {
  describe('Valid Settlement Parses', () => {
    it('should parse a complete valid settlement', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        telegram: 'test_settlement',
        management_company: 'УК Тест',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 3000,
          unit: 'rub_per_sotka',
          period: 'month',
          note: 'Тестовая заметка',
        },
        water_in_tariff: true,
        rabstvo: true,
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
          pool: 'no',
          fitness_club: 'no',
          restaurant: 'yes',
          spa_center: 'no',
          walking_routes: 'yes',
          water_access: 'yes',
          beach_zones: 'no',
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
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        const settlement = mapRawSettlement(result.data);
        expect(result.data.name).toBe('Коттеджный поселок Тестовый');
        expect(result.data.slug).toBe('testovyy');
        expect(result.data.telegram).toBe('test_settlement');
        expect(result.data.is_baseline).toBe(false);
        expect(settlement.tariff.normalizedPerSotkaMonth).toBe(3000);
        expect(settlement.tariff.normalizedIsEstimate).toBe(false);
        expect(result.data.water_in_tariff).toBe(true);
        expect(result.data.rabstvo).toBe(true);
      }
    });

    it('should only allow water_in_tariff with central water supply', () => {
      const invalidSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 3000,
          unit: 'rub_per_sotka',
          period: 'month',
        },
        water_in_tariff: true,
        infrastructure: {
          water: 'partial',
        },
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(invalidSettlement);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (item) => item.path[0] === 'water_in_tariff',
        );
        expect(issue?.message).toContain('central water supply');
      }
    });

    it('should normalize telegram channel with @ prefix', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        telegram: '@test_settlement',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 3000,
          unit: 'rub_per_sotka',
          period: 'month',
        },
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.telegram).toBe('test_settlement');
      }
    });

    it('should auto-normalize lot tariff with estimate flag', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 12000,
          unit: 'rub_per_lot',
          period: 'month',
        },
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        const settlement = mapRawSettlement(result.data);
        expect(settlement.tariff.normalizedPerSotkaMonth).toBe(1200);
        expect(settlement.tariff.normalizedIsEstimate).toBe(true);
      }
    });

    it('should use known average lot size for normalization', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 12000,
          unit: 'rub_per_lot',
          period: 'month',
        },
        lots: {
          count: 150,
          area_ha: 32,
          average_sotka: 20.4,
        },
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        const settlement = mapRawSettlement(result.data);
        expect(result.data.lots?.average_sotka).toBe(20.4);
        expect(settlement.tariff.normalizedPerSotkaMonth).toBeCloseTo(
          588.235294,
          6,
        );
      }
    });

    it('should derive average lot size from area and count', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 12100,
          unit: 'rub_per_lot',
          period: 'month',
        },
        lots: {
          count: 298,
          area_ha: 100,
        },
        infrastructure: {
          roads: 'asphalt',
          sidewalks: 'partial',
          drainage: 'open',
          checkpoints: 'yes',
          admin_building: 'yes',
          retail_or_services: 'yes',
        },
        common_spaces: {
          playgrounds: 'yes',
          sports: 'yes',
          restaurant: 'yes',
        },
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        const settlement = mapRawSettlement(result.data);
        expect(
          getLotAverage(
            settlement.lots,
            settlement.infrastructure,
            settlement.commonSpaces,
          ),
        ).toBeCloseTo(31.56, 2);
        expect(settlement.tariff.normalizedPerSotkaMonth).toBeCloseTo(
          383.43,
          2,
        );
      }
    });

    it('should parse multi-part tariff and sum components', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: [
          {
            value: 5813,
            unit: 'rub_per_lot',
            period: 'month',
            note: 'тариф взят с сайта',
          },
          {
            value: 100,
            unit: 'rub_per_sotka',
            period: 'month',
          },
        ],
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        const settlement = mapRawSettlement(result.data);
        expect(settlement.tariff.normalizedPerSotkaMonth).toBeCloseTo(681.3, 6);
        expect(settlement.tariff.normalizedIsEstimate).toBe(true);
        expect(result.data.tariff.note).toBe('тариф взят с сайта');
        expect('parts' in result.data.tariff).toBe(true);
        if ('parts' in result.data.tariff) {
          expect(result.data.tariff.parts).toHaveLength(2);
        }
      }
    });

    it('should parse settlement with management company object', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        management_company: {
          title: 'УК Тест',
          url: 'https://example.com/uk-test',
        },
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 3000,
          unit: 'rub_per_sotka',
          period: 'month',
          note: 'Тестовая заметка',
        },
        infrastructure: {},
        service_model: {},
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.management_company).toBe('object');
      }
    });

    it('should parse settlement without management company', () => {
      const validSettlement = {
        name: 'Коттеджный поселок Тестовый',
        short_name: 'Тестовый',
        slug: 'testovyy',
        website: 'https://test.example.com',
        is_baseline: false,
        location: {
          address_text: 'Московская область, Тестовый район',
          lat: 55.7558,
          lng: 37.6173,
          district: 'Тестовый район',
        },
        tariff: {
          value: 3000,
          unit: 'rub_per_sotka',
          period: 'month',
          note: 'Тестовая заметка',
        },
        infrastructure: {},
        service_model: {},
        sources: [
          {
            title: 'Тестовый источник',
            url: 'https://example.com/source',
            type: 'official',
            date_checked: '2026-04-03',
            comment: '',
          },
        ],
      };

      const result = SettlementSchema.safeParse(validSettlement);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.management_company).toBe(undefined);
      }
    });
  });

  describe('Type Contracts', () => {
    it('should keep settlement raw schema and collection data aligned', () => {
      type Data = CollectionEntry<'settlements'>['data'];
      expectTypeOf<Data>().toMatchTypeOf<RawSettlement>();
    });
  });
});
