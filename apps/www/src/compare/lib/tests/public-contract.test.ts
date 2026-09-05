import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { compareSettlements } from '@/compare/lib/comparisons';
import { openapi, SCHEMA, schema } from '@/compare/lib/discovery';
import { toFullPayload } from '@/compare/lib/full';
import type { ComparePublicPayload } from '@/compare/lib/public-dto.types';
import { ComparePublicPayloadSchema } from '@/compare/lib/public-schema';
import { buildRatings } from '@/compare/lib/rating';
import { SettlementSchema } from '@/compare/lib/schema';
import { mapRawSettlement } from '@/compare/lib/settlement/mapper';
import type { Settlement } from '@/compare/lib/settlement/types';
import { computeStats } from '@/compare/lib/stats';

const root = 'https://example.com';
const settlementsDir = fileURLToPath(
  new URL('../../../data/compare/settlements/', import.meta.url),
);

const minimalSettlement: ComparePublicPayload['settlements'][number] = {
  name: 'КП Тестовый',
  short_name: 'Тестовый',
  slug: 'test-settlement',
  website: 'https://example.com/settlement',
  is_baseline: true,
  location: {
    address_text: 'Московская область',
    lat: 55.7,
    lng: 37,
    district: 'Истринский район',
  },
  tariff: {
    value: 100,
    unit: 'rub_per_sotka',
    period: 'month',
    normalized_per_sotka_month: 100,
    normalized_is_estimate: false,
  },
  infrastructure: {},
  common_spaces: {},
  service_model: {},
  rating: 0,
  distance: {
    moscow_km: 0,
    mkad_km: 0,
    shelkovo_km: 0,
  },
};

const minimalPayload: ComparePublicPayload = {
  settlements: [minimalSettlement],
  stats: {
    shelkovoTariff: 100,
    medianTariff: 100,
    peerMedianTariff: 100,
    meanTariff: 100,
    minTariff: 100,
    maxTariff: 100,
    shelkovoRank: 1,
    totalSettlements: 1,
    cheaperCount: 0,
    moreExpensiveCount: 0,
    shelkovoVsMedianPercent: 0,
    shelkovoVsPeerMedianPercent: 0,
    shelkovoVsMeanPercent: 0,
  },
  comparisons: {},
};

const fullPayload: ComparePublicPayload = {
  settlements: [
    {
      name: 'КП Тестовый',
      short_name: 'Тестовый',
      slug: 'test-settlement',
      website: 'https://example.com/settlement',
      telegram: 'test_chat',
      management_company: {
        title: 'УК Тест',
        url: 'https://example.com/company',
      },
      is_baseline: true,
      location: {
        address_text: 'Московская область',
        lat: 55.7,
        lng: 37,
        map_url: 'https://example.com/map',
        district: 'Истринский район',
      },
      tariff: {
        value: 1_200,
        unit: 'rub_per_lot',
        period: 'quarter',
        normalized_per_sotka_month: 40,
        normalized_is_estimate: true,
        note: 'Авторское примечание',
        parts: [
          {
            value: 1_200,
            unit: 'rub_per_lot',
            period: 'quarter',
            note: 'Часть тарифа',
          },
        ],
      },
      lots: {
        count: 10,
        area_ha: 2,
        average_sotka: 20,
        average_note: 'По генплану',
      },
      water_in_tariff: true,
      rabstvo: true,
      infrastructure: {
        roads: 'asphalt',
        sidewalks: 'yes',
        lighting: 'no',
        gas: 'partial',
        water: 'yes',
        sewage: 'no',
        drainage: 'closed',
        checkpoints: 'yes',
        security: 'partial',
        fencing: 'yes',
        video_surveillance: 'full',
        underground_electricity: 'partial',
        admin_building: 'no',
        retail_or_services: 'partial',
      },
      common_spaces: {
        playgrounds: 'yes',
        sports: 'partial',
        pool: 'no',
        fitness_club: 'yes',
        restaurant: 'partial',
        spa_center: 'no',
        walking_routes: 'yes',
        water_access: 'partial',
        beach_zones: 'no',
        kids_club: 'yes',
        sports_camp: 'partial',
        primary_school: 'no',
        club_infrastructure: 'yes',
        bbq_zones: 'partial',
      },
      service_model: {
        garbage_collection: 'yes',
        snow_removal: 'partial',
        road_cleaning: 'no',
        landscaping: 'yes',
        emergency_service: 'partial',
        dispatcher: 'no',
      },
      rating: 100,
      distance: {
        moscow_km: 50,
        mkad_km: 30,
        shelkovo_km: 10,
      },
    },
  ],
  stats: minimalPayload.stats,
  comparisons: {
    'test-settlement': {
      tariffDelta: -10,
      tariffDeltaPercent: -9.1,
      isCheaper: true,
    },
  },
};

type JsonPath = readonly (string | number)[];

const jsonRoundTrip = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value));

const objectAt = (value: unknown): Record<string | number, unknown> => {
  if (!value || typeof value !== 'object') {
    throw new Error('Fixture path must point to an object');
  }

  return value as Record<string | number, unknown>;
};

const valueAt = (value: unknown, path: JsonPath): unknown =>
  path.reduce<unknown>((current, segment) => objectAt(current)[segment], value);

const withValueAt = (path: JsonPath, value: unknown): unknown => {
  const payload = jsonRoundTrip(fullPayload);
  const key = path[path.length - 1];

  if (key === undefined) {
    return value;
  }

  objectAt(valueAt(payload, path.slice(0, -1)))[key] = value;
  return payload;
};

const withoutPropertyAt = (path: JsonPath): unknown => {
  const payload = jsonRoundTrip(fullPayload);
  const key = path[path.length - 1];

  if (key === undefined) {
    throw new Error('Fixture path must contain a property');
  }

  delete objectAt(valueAt(payload, path.slice(0, -1)))[key];
  return payload;
};

const withUnknownPropertyAt = (path: JsonPath): unknown => {
  const payload = jsonRoundTrip(fullPayload);
  objectAt(valueAt(payload, path)).unexpected = true;
  return payload;
};

const createValidator = (
  contract: Record<string, unknown>,
): ValidateFunction => {
  const ajv = new Ajv2020({ allErrors: true, strictSchema: false });
  addFormats(ajv);
  return ajv.compile(contract);
};

const standaloneSchema = schema(root);
const validateStandalone = createValidator(standaloneSchema);

const expectValidInBoth = (payload: unknown): void => {
  expect(ComparePublicPayloadSchema.safeParse(payload).success).toBe(true);
  expect(
    validateStandalone(payload),
    JSON.stringify(validateStandalone.errors),
  ).toBe(true);
};

const expectInvalidInBoth = (payload: unknown): void => {
  expect(ComparePublicPayloadSchema.safeParse(payload).success).toBe(false);
  expect(
    validateStandalone(payload),
    JSON.stringify(validateStandalone.errors),
  ).toBe(false);
};

const currentPayload = (): ComparePublicPayload => {
  const settlements = readdirSync(settlementsDir)
    .filter((name) => name.endsWith('.yaml') && !name.startsWith('_'))
    .map((name): Settlement => {
      const source = readFileSync(join(settlementsDir, name), 'utf8');
      return mapRawSettlement(SettlementSchema.parse(parseYaml(source)));
    });
  const baseline = settlements.find((settlement) => settlement.isBaseline);

  if (!baseline) {
    throw new Error('Baseline settlement fixture not found');
  }

  const ratings = buildRatings(settlements);
  const comparisons = new Map(
    settlements.map((settlement) => [
      settlement.slug,
      compareSettlements(baseline, settlement),
    ]),
  );

  return toFullPayload({
    settlements,
    baseline,
    ratings,
    stats: computeStats(settlements, ratings, baseline),
    comparisons,
  });
};

const collectLocalRefs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectLocalRefs);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) => {
    if (key === '$ref' && typeof entry === 'string' && entry.startsWith('#/')) {
      return [entry];
    }

    return collectLocalRefs(entry);
  });
};

const resolveLocalRef = (document: unknown, ref: string): unknown => {
  let current = document;

  for (const encoded of ref.slice(2).split('/')) {
    const segment = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    current = objectAt(current)[segment];

    if (current === undefined) {
      throw new Error(`Unresolved local ref: ${ref}`);
    }
  }

  return current;
};

describe('Compare public contract', () => {
  it.each([
    ['minimal payload', minimalPayload],
    ['payload with every optional field', fullPayload],
    ['current settlements payload', currentPayload()],
  ])('accepts the %s after a JSON round-trip', (_name, payload) => {
    expectValidInBoth(jsonRoundTrip(payload));
  });

  it('keeps large integers allowed by the published contract', () => {
    const payload = withValueAt(['stats', 'totalSettlements'], 1e20);

    expectValidInBoth(payload);
  });

  it.each([
    ['payload', []],
    ['settlement', ['settlements', 0]],
    ['management company', ['settlements', 0, 'management_company']],
    ['location', ['settlements', 0, 'location']],
    ['tariff', ['settlements', 0, 'tariff']],
    ['tariff part', ['settlements', 0, 'tariff', 'parts', 0]],
    ['lots', ['settlements', 0, 'lots']],
    ['infrastructure', ['settlements', 0, 'infrastructure']],
    ['common spaces', ['settlements', 0, 'common_spaces']],
    ['service model', ['settlements', 0, 'service_model']],
    ['distance', ['settlements', 0, 'distance']],
    ['stats', ['stats']],
    ['comparison', ['comparisons', 'test-settlement']],
  ] satisfies readonly (readonly [string, JsonPath])[])(
    'rejects an unknown field in %s',
    (_name, path) => {
      expectInvalidInBoth(withUnknownPropertyAt(path));
    },
  );

  it.each([
    {
      uri: 'https://example.com/%zz',
      rfcAccepted: false,
      whatwgAccepted: true,
    },
    {
      uri: 'http://example.com:99999/',
      rfcAccepted: true,
      whatwgAccepted: false,
    },
  ])(
    'keeps Zod and JSON Schema aligned for adversarial URI $uri',
    ({ uri, rfcAccepted, whatwgAccepted }) => {
      const payload = withValueAt(['settlements', 0, 'website'], uri);

      expect([
        ComparePublicPayloadSchema.safeParse(payload).success,
        validateStandalone(payload),
      ]).toEqual([rfcAccepted, rfcAccepted]);
      expect(z.url().safeParse(uri).success).toBe(whatwgAccepted);
    },
  );

  it.each([
    ['root object', ['stats']],
    ['settlement', ['settlements', 0, 'name']],
    ['management company', ['settlements', 0, 'management_company', 'title']],
    ['location', ['settlements', 0, 'location', 'district']],
    ['tariff', ['settlements', 0, 'tariff', 'normalized_is_estimate']],
    ['tariff part', ['settlements', 0, 'tariff', 'parts', 0, 'value']],
    ['infrastructure', ['settlements', 0, 'infrastructure']],
    ['common spaces', ['settlements', 0, 'common_spaces']],
    ['service model', ['settlements', 0, 'service_model']],
    ['distance', ['settlements', 0, 'distance', 'mkad_km']],
    ['stats', ['stats', 'medianTariff']],
    ['comparison', ['comparisons', 'test-settlement', 'isCheaper']],
  ] satisfies readonly (readonly [string, JsonPath])[])(
    'rejects a missing required field in %s',
    (_name, path) => {
      expectInvalidInBoth(withoutPropertyAt(path));
    },
  );

  it.each([
    ['tariff unit', ['settlements', 0, 'tariff', 'unit']],
    ['tariff period', ['settlements', 0, 'tariff', 'period']],
    ['road', ['settlements', 0, 'infrastructure', 'roads']],
    ['availability', ['settlements', 0, 'infrastructure', 'water']],
    ['drainage', ['settlements', 0, 'infrastructure', 'drainage']],
    ['video', ['settlements', 0, 'infrastructure', 'video_surveillance']],
    [
      'underground electricity',
      ['settlements', 0, 'infrastructure', 'underground_electricity'],
    ],
  ] satisfies readonly (readonly [string, JsonPath])[])(
    'rejects an unknown %s enum value',
    (_name, path) => {
      expectInvalidInBoth(withValueAt(path, 'unknown'));
    },
  );

  it.each([
    ['website URI', ['settlements', 0, 'website'], 'not a uri'],
    ['map URI', ['settlements', 0, 'location', 'map_url'], 'not a uri'],
    [
      'management company URI',
      ['settlements', 0, 'management_company', 'url'],
      'not a uri',
    ],
    ['telegram pattern', ['settlements', 0, 'telegram'], '@bad'],
    ['settlement slug pattern', ['settlements', 0, 'slug'], 'Bad slug'],
  ] satisfies readonly (readonly [string, JsonPath, unknown])[])(
    'rejects an invalid %s',
    (_name, path, value) => {
      expectInvalidInBoth(withValueAt(path, value));
    },
  );

  it('rejects an invalid comparison property name', () => {
    expectInvalidInBoth(
      withValueAt(['comparisons'], {
        'Bad key': fullPayload.comparisons['test-settlement'],
      }),
    );
  });

  it.each([
    ['latitude', ['settlements', 0, 'location', 'lat'], 91],
    ['longitude', ['settlements', 0, 'location', 'lng'], 181],
    ['tariff value', ['settlements', 0, 'tariff', 'value'], -1],
    [
      'normalized tariff',
      ['settlements', 0, 'tariff', 'normalized_per_sotka_month'],
      -1,
    ],
    [
      'tariff part value',
      ['settlements', 0, 'tariff', 'parts', 0, 'value'],
      -1,
    ],
    ['lot count', ['settlements', 0, 'lots', 'count'], 0],
    ['integer lot count', ['settlements', 0, 'lots', 'count'], 1.5],
    ['lot area', ['settlements', 0, 'lots', 'area_ha'], 0],
    ['average lot size', ['settlements', 0, 'lots', 'average_sotka'], 0],
    ['rating', ['settlements', 0, 'rating'], 101],
    ['distance', ['settlements', 0, 'distance', 'moscow_km'], -1],
    ['nonnegative tariff statistic', ['stats', 'minTariff'], -1],
    ['positive rank', ['stats', 'shelkovoRank'], 0],
    ['nonnegative count', ['stats', 'cheaperCount'], -1],
  ] satisfies readonly (readonly [string, JsonPath, number])[])(
    'rejects an out-of-range %s',
    (_name, path, value) => {
      expectInvalidInBoth(withValueAt(path, value));
    },
  );

  it.each([
    ['name', ['settlements', 0, 'name'], ''],
    ['tariff note', ['settlements', 0, 'tariff', 'note'], ''],
    ['tariff parts', ['settlements', 0, 'tariff', 'parts'], []],
  ] satisfies readonly (readonly [string, JsonPath, unknown])[])(
    'rejects an empty %s',
    (_name, path, value) => {
      expectInvalidInBoth(withValueAt(path, value));
    },
  );

  it('preserves schema identity and descriptions', () => {
    expect(standaloneSchema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: `${root}${SCHEMA}`,
      title: 'SettlementsPayload',
      description:
        'Полная лента поселков только для чтения с детальными полями, вычисленными расстояниями, рейтингом и агрегатами.',
    });
    expect(resolveLocalRef(standaloneSchema, '#/$defs/uri')).toMatchObject({
      type: 'string',
      format: 'uri',
    });
  });

  it.each([
    ['standalone schema', standaloneSchema],
    ['OpenAPI document', openapi(root)],
  ])('resolves every local ref in the %s', (_name, document) => {
    const refs = collectLocalRefs(document);
    expect(refs.length).toBeGreaterThan(0);

    for (const ref of refs) {
      expect(resolveLocalRef(document, ref)).toBeDefined();
    }
  });

  it('validates the serialized payload against the embedded OpenAPI schema', () => {
    const document = openapi(root);
    const embeddedSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $ref: '#/components/schemas/SettlementsPayload',
      components: document.components,
    };
    const validateEmbedded = createValidator(embeddedSchema);
    const payload = jsonRoundTrip(currentPayload());

    expect(
      validateEmbedded(payload),
      JSON.stringify(validateEmbedded.errors),
    ).toBe(true);
  });
});
