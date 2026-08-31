import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { contentDateSchema } from '@/lib/content-date';
import {
  publicDateTimeSchema,
  publicUriSchema,
} from '@/lib/public-schema-formats';
import { compileGeneratedSchemaValidators } from '@/lib/tests/json-schema';
import type { StatusIncidentEntry } from '../load';
import type {
  StatusPublicIncidentDto,
  StatusPublicPayloadDto,
  StatusPublicServiceSummaryDto,
} from '../public-schema';
import { statusDataPath } from '../routes';

let buildStatusDataset: typeof import('../load').buildStatusDataset;
let buildStatusPublicPayload: typeof import('../public-dto').buildStatusPublicPayload;
let loadStatusData: typeof import('../load').loadStatusData;
let openapi: typeof import('../discovery').openapi;
let schema: typeof import('../discovery').schema;
let statusPublicPayloadSchema: typeof import('../public-schema').statusPublicPayloadSchema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildStatusPublicPayload } = await import('../public-dto'));
  ({ buildStatusDataset, loadStatusData } = await import('../load'));
  ({ openapi, schema } = await import('../discovery'));
  ({ statusPublicPayloadSchema } = await import('../public-schema'));
});

const productionPayload = async (): Promise<StatusPublicPayloadDto> =>
  buildStatusPublicPayload(await loadStatusData());

const contractPayload = (): StatusPublicPayloadDto => {
  const date = contentDateSchema('status public schema test date');
  const entry: StatusIncidentEntry = {
    id: '2026/05/water-contract-fixture',
    body: 'Причина и ход восстановления.',
    data: {
      title: 'Отключение воды',
      service: 'water',
      kind: 'incident',
      started_at: date.parse('03.05.2026 10:00'),
      ended_at: date.parse('03.05.2026 11:30'),
      areas: ['forest'],
      source_url: 'https://example.com/status-source',
    },
  };

  return buildStatusPublicPayload(
    buildStatusDataset([entry], {
      now: new Date('2026-05-04T12:00:00+03:00'),
    }),
  );
};

const invalidContractPayloads = (): readonly unknown[] => {
  const payload = contractPayload();
  const incident = payload.incidents[0];

  if (!incident) {
    throw new Error('Expected at least one status contract incident');
  }

  const { body_markdown: _bodyMarkdown, ...withoutRequiredBody } = incident;

  return [
    {
      ...payload,
      incidents: [{ ...incident, unexpected: true }],
    },
    {
      ...payload,
      incidents: [withoutRequiredBody],
    },
    {
      ...payload,
      incidents: [{ ...incident, service: 'gas' }],
    },
    {
      ...payload,
      incidents: [{ ...incident, started_at: '03.05.2026 10:00' }],
    },
    {
      ...payload,
      incidents: [{ ...incident, month: 13 }],
    },
    {
      ...payload,
      incidents: [
        {
          ...incident,
          areas: ['unknown-area'],
        },
      ],
    },
    {
      ...payload,
      incidents: [
        {
          ...incident,
          duration: { total_minutes: -1, human: 'меньше минуты' },
        },
      ],
    },
    {
      ...payload,
      incidents: [{ ...incident, source_url: '/relative' }],
    },
  ];
};

const formatContractPayload = (
  fields: Partial<Pick<StatusPublicIncidentDto, 'source_url' | 'started_at'>>,
): StatusPublicPayloadDto => {
  const payload = contractPayload();
  const incident = payload.incidents[0];

  if (!incident) {
    throw new Error('Expected at least one status contract incident');
  }

  return {
    ...payload,
    incidents: [{ ...incident, ...fields }],
  };
};

describe('status public schema', () => {
  it('accepts and preserves the full production-equivalent payload', async () => {
    const payload = await productionPayload();
    const fixture = contractPayload();
    const route = await import('../../../pages/status/data/status.json');
    const body = await (await route.GET({} as never)).text();

    expect(statusPublicPayloadSchema.parse(payload)).toEqual(payload);
    expect(statusPublicPayloadSchema.parse(fixture)).toEqual(fixture);
    expect(body).toBe(JSON.stringify(payload));
  });

  it('rejects nested contract violations', () => {
    const invalidPayloads = invalidContractPayloads();

    expect(
      invalidPayloads.map(
        (input) => statusPublicPayloadSchema.safeParse(input).success,
      ),
    ).toEqual(invalidPayloads.map(() => false));
  });

  it('exposes deeply readonly DTO types', () => {
    expectTypeOf<StatusPublicPayloadDto['incidents']>().toEqualTypeOf<
      readonly StatusPublicIncidentDto[]
    >();
    expectTypeOf<StatusPublicServiceSummaryDto['incident_ids']>().toEqualTypeOf<
      readonly string[]
    >();
  });

  it('generates standard format-only URI and date-time contracts', () => {
    expect({
      uri: z.toJSONSchema(publicUriSchema()),
      dateTime: z.toJSONSchema(publicDateTimeSchema()),
    }).toMatchInlineSnapshot(`
      {
        "dateTime": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "format": "date-time",
          "type": "string",
        },
        "uri": {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "format": "uri",
          "type": "string",
        },
      }
    `);
  });

  it('enforces the standalone and embedded OpenAPI schemas', () => {
    const root = 'https://example.com';
    const standalone = schema(root);
    const api = openapi(root);
    const payload = contractPayload();
    const invalidPayloads = invalidContractPayloads();
    const validators = compileGeneratedSchemaValidators(
      standalone,
      api,
      statusDataPath(),
    );
    const formatCases = [
      {
        input: formatContractPayload({
          started_at: '2026-05-03t08:00:00.000z',
          source_url: 'https://example.com/status%20source',
        }),
        expected: true,
      },
      {
        input: formatContractPayload({ source_url: 'http://' }),
        expected: true,
      },
      {
        input: formatContractPayload({ source_url: 'http:///path' }),
        expected: true,
      },
      {
        input: formatContractPayload({ source_url: 'scheme:?query' }),
        expected: false,
      },
      {
        input: formatContractPayload({
          source_url: 'https://example.com/status%zzsource',
        }),
        expected: false,
      },
      {
        input: formatContractPayload({
          started_at: '2026-02-30T08:00:00Z',
        }),
        expected: false,
      },
      {
        input: formatContractPayload({
          started_at: '2026-05-03T08:61:00Z',
        }),
        expected: false,
      },
    ];

    expect({
      schema: standalone.$schema,
      id: standalone.$id,
      title: standalone.title,
      description: standalone.description,
    }).toMatchInlineSnapshot(`
      {
        "description": "Лента раздела /status только для чтения с историей инцидентов, производными сводками сервисов и Markdown-версиями страниц.",
        "id": "https://example.com/status/schemas/status.schema.json",
        "schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "StatusPayload",
      }
    `);
    expect(validators.map((validate) => validate(payload))).toEqual([
      true,
      true,
    ]);
    expect(
      validators.map((validate) =>
        invalidPayloads.map((input) => validate(input)),
      ),
    ).toEqual(validators.map(() => invalidPayloads.map(() => false)));
    const formatResults = formatCases.map(({ input }) => {
      const zodResult = statusPublicPayloadSchema.safeParse(input).success;

      expect(validators.map((validate) => validate(input))).toEqual(
        validators.map(() => zodResult),
      );

      return zodResult;
    });

    expect(formatResults).toEqual(formatCases.map(({ expected }) => expected));
  });
});
