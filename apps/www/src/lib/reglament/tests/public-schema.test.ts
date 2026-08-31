import { describe, expect, expectTypeOf, it } from 'vitest';

import { estimate2026 } from '@/data/reglament/estimate-2026';
import { compileGeneratedSchemaValidators } from '@/lib/tests/json-schema';
import {
  buildReglamentPayload,
  openapi,
  schema,
  type ReglamentDiscoveryRowComputed,
  type ReglamentDiscoverySection,
} from '../discovery';
import {
  REGLAMENT_FORMULAS,
  reglamentPublicPayloadSchema,
  type ReglamentPublicPayloadDto,
  type ReglamentPublicRowDto,
} from '../public-schema';
import { reglamentEstimate2026DataPath } from '../routes';

const productionPayload = (): ReglamentPublicPayloadDto =>
  buildReglamentPayload(estimate2026);

const recursiveContractPayload = (): ReglamentPublicPayloadDto => {
  const payload = productionPayload();
  const section = payload.sections[0];
  const row = section?.rows[0];

  if (!section || !row) {
    throw new Error('Expected a production estimate row');
  }

  const { children: _children, ...child } = row;

  return {
    ...payload,
    sections: [
      {
        ...section,
        rows: [
          {
            ...row,
            children: [{ ...child, id: `${row.id}-child` }],
          },
        ],
      },
    ],
  };
};

const invalidContractPayloads = (): readonly unknown[] => {
  const payload = productionPayload();
  const section = payload.sections[0];
  const row = section?.rows[0];
  const sourceRef = row?.source_refs[0];
  const editableField = row?.editable_fields[0];
  const recursivePayload = recursiveContractPayload();
  const recursiveSection = recursivePayload.sections[0];
  const recursiveRow = recursiveSection?.rows[0];
  const child = recursiveRow?.children?.[0];

  if (
    !section ||
    !row ||
    !sourceRef ||
    !editableField ||
    !recursiveSection ||
    !recursiveRow ||
    !child
  ) {
    throw new Error('Expected complete production estimate fixtures');
  }

  const { title: _title, ...withoutRequiredTitle } = row;

  return [
    {
      ...payload,
      sections: [{ ...section, rows: [{ ...row, unexpected: true }] }],
    },
    {
      ...payload,
      sections: [{ ...section, rows: [withoutRequiredTitle] }],
    },
    {
      ...payload,
      sections: [{ ...section, rows: [{ ...row, kind: 'unknown' }] }],
    },
    {
      ...payload,
      sections: [
        {
          ...section,
          rows: [
            {
              ...row,
              source_refs: [{ ...sourceRef, page: 0 }],
            },
          ],
        },
      ],
    },
    {
      ...payload,
      sections: [{ ...section, rows: [{ ...row, source_refs: [] }] }],
    },
    {
      ...payload,
      sections: [
        {
          ...section,
          rows: [
            {
              ...row,
              baseline: {
                ...row.baseline,
                breakdown: { ...row.baseline.breakdown, gross: -1 },
              },
            },
          ],
        },
      ],
    },
    {
      ...payload,
      sections: [
        {
          ...section,
          rows: [
            {
              ...row,
              editable_fields: [{ ...editableField, key: 'unsupported_field' }],
            },
          ],
        },
      ],
    },
    {
      ...payload,
      formulas: {
        ...payload.formulas,
        row_breakdown: {
          ...payload.formulas.row_breakdown,
          unexpected: 'value',
        },
      },
    },
    { ...payload, year: 2026.5 },
    { ...payload, source_refs: [] },
    { ...payload, sections: [] },
    {
      ...recursivePayload,
      sections: [
        {
          ...recursiveSection,
          rows: [
            {
              ...recursiveRow,
              children: [{ ...child, unexpected: true }],
            },
          ],
        },
      ],
    },
  ];
};

describe('reglament estimate public schema', () => {
  it('accepts and preserves the full production payload', async () => {
    const payload = productionPayload();
    const recursivePayload = recursiveContractPayload();
    const route =
      await import('../../../pages/815/regulation/data/estimate-2026.json');
    const body = await (await route.GET({} as never)).text();

    expect(reglamentPublicPayloadSchema.parse(payload)).toEqual(payload);
    expect(reglamentPublicPayloadSchema.parse(recursivePayload)).toEqual(
      recursivePayload,
    );
    expect(body).toBe(JSON.stringify(payload));
  });

  it('rejects nested fields, missing keys, enums, ranges and array bounds', () => {
    const invalidPayloads = invalidContractPayloads();

    expect(
      invalidPayloads.map(
        (input) => reglamentPublicPayloadSchema.safeParse(input).success,
      ),
    ).toEqual(invalidPayloads.map(() => false));
  });

  it('keeps readonly DTOs, exact formulas and legacy type exports', () => {
    expectTypeOf<ReglamentPublicPayloadDto['formulas']>().toEqualTypeOf<
      typeof REGLAMENT_FORMULAS
    >();
    expectTypeOf<ReglamentPublicPayloadDto['sections']>().toEqualTypeOf<
      readonly ReglamentDiscoverySection[]
    >();
    expectTypeOf<
      ReglamentPublicRowDto['computed']
    >().toEqualTypeOf<ReglamentDiscoveryRowComputed>();
    expectTypeOf<ReglamentPublicRowDto['children']>().toEqualTypeOf<
      readonly ReglamentPublicRowDto[] | undefined
    >();
  });

  it('enforces the standalone and embedded OpenAPI schemas', () => {
    const root = 'https://example.com';
    const standalone = schema(root);
    const api = openapi(root);
    const payload = productionPayload();
    const recursivePayload = recursiveContractPayload();
    const invalidPayloads = invalidContractPayloads();
    const validators = compileGeneratedSchemaValidators(
      standalone,
      api,
      reglamentEstimate2026DataPath(),
    );

    expect({
      schema: standalone.$schema,
      id: standalone.$id,
      title: standalone.title,
      description: standalone.description,
    }).toMatchInlineSnapshot(`
      {
        "description": "JSON сметы регламента 2026 только для чтения: базовая смета, формулы, ссылки на источники и расчетные значения в рублях за сотку в месяц.",
        "id": "https://example.com/815/regulation/schemas/estimate-2026.schema.json",
        "schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Estimate2026Payload",
      }
    `);
    expect(
      validators.map((validate) => [
        validate(payload),
        validate(recursivePayload),
      ]),
    ).toEqual([
      [true, true],
      [true, true],
    ]);
    expect(
      validators.map((validate) =>
        invalidPayloads.map((input) => validate(input)),
      ),
    ).toEqual(validators.map(() => invalidPayloads.map(() => false)));
  });
});
