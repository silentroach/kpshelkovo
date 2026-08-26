import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RawSettlement } from './schema';
import type { Settlement } from './types';
import { mapRawSettlement } from './mapper';

const rawSettlement: RawSettlement = {
  name: 'Коттеджный поселок Тестовый',
  short_name: 'Тестовый',
  slug: 'testovyy',
  website: 'https://test.example.com',
  telegram: 'test_settlement',
  management_company: {
    title: 'УК Тест',
    url: 'https://example.com/uk-test',
  },
  is_baseline: true,
  location: {
    address_text: 'Московская область, Тестовый район',
    lat: 55.7558,
    lng: 37.6173,
    map_url: 'https://example.com/map',
    district: 'Тестовый район',
  },
  tariff: {
    value: 12000,
    unit: 'rub_per_lot',
    period: 'month',
    note: 'тариф взят с сайта',
    parts: [
      {
        value: 12000,
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
  },
  lots: {
    count: 150,
    area_ha: 32,
    average_sotka: 20.4,
    average_note: 'средний размер из генплана',
  },
  water_in_tariff: true,
  rabstvo: true,
  infrastructure: {
    roads: 'partial_asphalt',
    sidewalks: 'partial',
    lighting: 'yes',
    gas: 'no',
    water: 'yes',
    sewage: 'partial',
    drainage: 'open',
    checkpoints: 'yes',
    security: 'partial',
    fencing: 'yes',
    video_surveillance: 'checkpoint_only',
    underground_electricity: 'partial',
    admin_building: 'no',
    retail_or_services: 'yes',
  },
  common_spaces: {
    club_infrastructure: 'yes',
    playgrounds: 'partial',
    sports: 'yes',
    pool: 'no',
    fitness_club: 'partial',
    restaurant: 'yes',
    spa_center: 'no',
    walking_routes: 'yes',
    water_access: 'partial',
    beach_zones: 'no',
    kids_club: 'partial',
    sports_camp: 'no',
    primary_school: 'no',
    bbq_zones: 'yes',
  },
  service_model: {
    garbage_collection: 'yes',
    snow_removal: 'partial',
    road_cleaning: 'yes',
    landscaping: 'partial',
    emergency_service: 'no',
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

describe('mapRawSettlement', () => {
  it('maps raw snake_case fields into a readonly camelCase domain settlement', () => {
    const settlement = mapRawSettlement(rawSettlement);

    expect(settlement).toMatchInlineSnapshot(`
      {
        "commonSpaces": {
          "bbqZones": "yes",
          "beachZones": "no",
          "clubInfrastructure": "yes",
          "fitnessClub": "partial",
          "kidsClub": "partial",
          "playgrounds": "partial",
          "pool": "no",
          "primarySchool": "no",
          "restaurant": "yes",
          "spaCenter": "no",
          "sports": "yes",
          "sportsCamp": "no",
          "walkingRoutes": "yes",
          "waterAccess": "partial",
        },
        "infrastructure": {
          "adminBuilding": "no",
          "checkpoints": "yes",
          "drainage": "open",
          "fencing": "yes",
          "gas": "no",
          "lighting": "yes",
          "retailOrServices": "yes",
          "roads": "partlyAsphalt",
          "security": "partial",
          "sewage": "partial",
          "sidewalks": "partial",
          "undergroundElectricity": "partial",
          "videoSurveillance": "checkpointOnly",
          "water": "yes",
        },
        "isBaseline": true,
        "location": {
          "addressText": "Московская область, Тестовый район",
          "district": "Тестовый район",
          "lat": 55.7558,
          "lng": 37.6173,
          "mapUrl": "https://example.com/map",
        },
        "lots": {
          "areaHa": 32,
          "averageNote": "средний размер из генплана",
          "averageSotka": 20.4,
          "count": 150,
        },
        "managementCompany": {
          "title": "УК Тест",
          "url": "https://example.com/uk-test",
        },
        "name": "Коттеджный поселок Тестовый",
        "rabstvo": true,
        "serviceModel": {
          "dispatcher": "yes",
          "emergencyService": "no",
          "garbageCollection": "yes",
          "landscaping": "partial",
          "roadCleaning": "yes",
          "snowRemoval": "partial",
        },
        "shortName": "Тестовый",
        "slug": "testovyy",
        "sources": [
          {
            "comment": "",
            "dateChecked": "2026-04-03",
            "title": "Тестовый источник",
            "type": "official",
            "url": "https://example.com/source",
          },
        ],
        "tariff": {
          "normalizedIsEstimate": true,
          "normalizedPerSotkaMonth": 688.2352941176471,
          "note": "тариф взят с сайта",
          "parts": [
            {
              "note": "тариф взят с сайта",
              "period": "month",
              "unit": "perLot",
              "value": 12000,
            },
            {
              "note": undefined,
              "period": "month",
              "unit": "perSotka",
              "value": 100,
            },
          ],
          "period": "month",
          "unit": "perLot",
          "value": 12000,
        },
        "telegram": "test_settlement",
        "waterInTariff": true,
        "website": "https://test.example.com",
      }
    `);
  });

  it('keeps raw and domain settlement types separate', () => {
    expectTypeOf<RawSettlement>().not.toMatchTypeOf<Settlement>();
    expectTypeOf<Settlement>().not.toMatchTypeOf<RawSettlement>();
  });

  it('maps management company string into a domain object', () => {
    const settlement = mapRawSettlement({
      ...rawSettlement,
      management_company: 'УК Тест',
    });

    expect(settlement.managementCompany).toEqual({ title: 'УК Тест' });
  });

  it('explicitly maps raw fixed tariff units into the domain unit', () => {
    const settlement = mapRawSettlement({
      ...rawSettlement,
      tariff: {
        ...rawSettlement.tariff,
        unit: 'rub_fixed',
      },
    });

    expect(settlement.tariff.unit).toBe('fixed');
  });

  it('rejects unsupported raw tariff units instead of treating them as fixed', () => {
    expect(() =>
      mapRawSettlement({
        ...rawSettlement,
        tariff: {
          ...rawSettlement.tariff,
          unit: 'rub_unknown' as RawSettlement['tariff']['unit'],
        },
      }),
    ).toThrow('Unsupported raw tariff unit: rub_unknown');
  });
});
