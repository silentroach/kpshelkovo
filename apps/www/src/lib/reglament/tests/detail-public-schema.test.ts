import type { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { estimateDetails2026 } from '@/data/reglament/estimate-details-2026';
import { buildPublicEstimateDetails2026Json } from '../detail-json';
import type { PublicEstimateDetailDataset } from '../detail-public';
import { publicEstimateDetailDatasetSchema } from '../detail-public-schema';
import { detailOpenapi, detailSchema } from '../discovery';
import {
  reglamentApiCatalogPath,
  reglamentEstimateDetails2026DataPath,
  reglamentEstimateDetails2026OpenApiPath,
  reglamentEstimateDetails2026SchemaPath,
} from '../routes';

type DetailOpenApi = {
  readonly jsonSchemaDialect?: string;
  readonly paths?: Readonly<
    Record<
      string,
      {
        readonly get?: {
          readonly responses?: Readonly<
            Record<
              string,
              {
                readonly content?: Readonly<
                  Record<
                    string,
                    { readonly schema?: Readonly<Record<string, unknown>> }
                  >
                >;
              }
            >
          >;
        };
      }
    >
  >;
  readonly components?: Readonly<Record<string, unknown>>;
};

const productionPayload = (): PublicEstimateDetailDataset =>
  publicEstimateDetailDatasetSchema.parse(
    JSON.parse(buildPublicEstimateDetails2026Json(estimateDetails2026)),
  );

const compileValidators = (
  standalone: Record<string, unknown>,
  api: DetailOpenApi,
): readonly ValidateFunction[] => {
  const responseSchema =
    api.paths?.[reglamentEstimateDetails2026DataPath()]?.get?.responses?.['200']
      ?.content?.['application/json']?.schema;

  if (!api.jsonSchemaDialect || !responseSchema || !api.components) {
    throw new Error('Detail OpenAPI response schema is incomplete');
  }

  return [
    new Ajv2020({ allErrors: true }).compile(standalone),
    new Ajv2020({ allErrors: true, strict: false }).compile({
      $schema: api.jsonSchemaDialect,
      ...responseSchema,
      components: api.components,
    }),
  ];
};

const invalidPayloads = (
  payload: PublicEstimateDetailDataset,
): readonly unknown[] => {
  const workItem = payload.work_items[0];
  const resource = payload.resources[0];
  const sourceEntry = Object.entries(payload.sources)[0];

  if (!workItem || !resource || !sourceEntry) {
    throw new Error('Production detail payload must contain facts and sources');
  }

  const [sourceId, source] = sourceEntry;

  return [
    { ...payload, schema_version: '3' },
    {
      ...payload,
      work_items: [
        { ...workItem, unexpected: true },
        ...payload.work_items.slice(1),
      ],
    },
    {
      ...payload,
      resources: [
        { ...resource, kind: 'unsupported' },
        ...payload.resources.slice(1),
      ],
    },
    {
      ...payload,
      sources: {
        ...payload.sources,
        [sourceId]: { ...source, page: 0 },
      },
    },
    { ...payload, sources: { ...payload.sources, invalid: source } },
    {
      ...payload,
      work_items: [
        { ...workItem, source_refs: [] },
        ...payload.work_items.slice(1),
      ],
    },
  ];
};

describe('estimate details public schema', () => {
  it('validates the serialized production response and generated contracts', async () => {
    Object.assign(import.meta.env, {
      SITE: 'https://example.com',
      BASE_URL: '/',
    });
    const root = 'https://example.com';
    const route =
      await import('../../../pages/815/regulation/data/estimate-details-2026.json');
    const response = await route.GET({} as never);
    const body = await response.text();
    const payload = publicEstimateDetailDatasetSchema.parse(JSON.parse(body));
    const standalone = detailSchema(root);
    const api = detailOpenapi(root) as DetailOpenApi;
    const validators = compileValidators(standalone, api);
    const link = response.headers.get('Link') ?? '';

    expect({
      zod: publicEstimateDetailDatasetSchema.safeParse(payload).success,
      jsonSchema: validators.map((validate) => validate(payload)),
      metadata: {
        schema: standalone.$schema,
        id: standalone.$id,
        title: standalone.title,
      },
      links: {
        schema: link.includes(reglamentEstimateDetails2026SchemaPath()),
        openapi: link.includes(reglamentEstimateDetails2026OpenApiPath()),
        catalog: link.includes(reglamentApiCatalogPath()),
      },
      unchangedBody:
        body === buildPublicEstimateDetails2026Json(estimateDetails2026),
    }).toMatchInlineSnapshot(`
      {
        "jsonSchema": [
          true,
          true,
        ],
        "links": {
          "catalog": true,
          "openapi": true,
          "schema": true,
        },
        "metadata": {
          "id": "https://example.com/815/regulation/schemas/estimate-details-2026.schema.json",
          "schema": "https://json-schema.org/draft/2020-12/schema",
          "title": "EstimateDetails2026Payload",
        },
        "unchangedBody": true,
        "zod": true,
      }
    `);
  });

  it('rejects shape, enum, range, source-id and array violations', () => {
    const payload = productionPayload();
    const invalid = invalidPayloads(payload);
    const validators = compileValidators(
      detailSchema('https://example.com'),
      detailOpenapi('https://example.com') as DetailOpenApi,
    );

    expect(
      validators.map((validate) => invalid.map((input) => validate(input))),
    ).toEqual(validators.map(() => invalid.map(() => false)));
  });

  it('rejects unresolved source refs before publication', () => {
    const payload = productionPayload();
    const workItem = payload.work_items[0];

    if (!workItem) {
      throw new Error('Production detail payload must contain a work item');
    }

    const unresolved = {
      ...payload,
      work_items: [
        { ...workItem, source_refs: ['s999999'] },
        ...payload.work_items.slice(1),
      ],
    };

    expect(
      publicEstimateDetailDatasetSchema.safeParse(unresolved).success,
    ).toBe(false);
  });
});
