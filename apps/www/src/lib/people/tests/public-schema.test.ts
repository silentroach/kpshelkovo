import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';

import { compileGeneratedSchemaValidators } from '@/lib/tests/json-schema';
import type {
  PeoplePublicContactDto,
  PeoplePublicPayloadDto,
  PeoplePublicProfileDto,
} from '../public-schema';
import { peopleDataPath } from '../routes';

let openapi: typeof import('../discovery').openapi;
let peoplePublicPayloadSchema: typeof import('../public-schema').peoplePublicPayloadSchema;
let schema: typeof import('../discovery').schema;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ openapi, schema } = await import('../discovery'));
  ({ peoplePublicPayloadSchema } = await import('../public-schema'));
});

const contractPayload = (): PeoplePublicPayloadDto => ({
  stats: {
    profile_count: 1,
    mention_count: 1,
    backlink_count: 1,
  },
  profiles: [
    {
      id: 'kschemelinin',
      slug: 'kschemelinin',
      name: 'Кирилл Щемелинин',
      name_cases: { gen: 'Кирилла Щемелинина' },
      company: 'ОК "Комфорт"',
      position: 'Директор по эксплуатации',
      html_url: 'https://example.com/people/kschemelinin/',
      markdown_url: 'https://example.com/people/kschemelinin/index.md',
      contacts: [
        {
          type: 'telegram',
          value: '@Kirill_ZemlyaMO',
          display: '@Kirill_ZemlyaMO',
          href: 'https://t.me/Kirill_ZemlyaMO',
        },
      ],
      body_markdown: 'Публичный профиль.',
      mentions: [
        {
          type: 'place',
          slug: 'apple-garden',
          name: 'Яблоневый сад',
          html_url: 'https://example.com/map/apple-garden/',
          markdown_url: 'https://example.com/map/apple-garden/index.md',
        },
      ],
      mention_count: 1,
      backlinks: {
        news: [
          {
            section: 'news',
            kind: 'article',
            source_id: '2026/05/power-outage',
            title: 'Повреждение линии 10 кВ',
            html_url: 'https://example.com/news/2026/05/power-outage/',
            markdown_url:
              'https://example.com/news/2026/05/power-outage/index.md',
            excerpt: 'Разбор причин аварии.',
            mentioned_at: '2026-05-03t08:00:00.000z',
          },
        ],
        status: [],
        reviews: [],
        places: [],
        people: [],
        contacts: [],
      },
      backlink_count: 1,
    },
  ],
});

const invalidContractPayloads = (): readonly unknown[] => {
  const payload = contractPayload();
  const profile = payload.profiles[0];

  if (!profile) {
    throw new Error('Expected the people contract fixture profile');
  }

  const { contacts: _contacts, ...withoutRequiredContacts } = profile;
  const contact = profile.contacts[0];
  const mention = profile.mentions[0];
  const backlink = profile.backlinks.news[0];

  if (!contact || !mention || !backlink) {
    throw new Error('Expected nested people contract fixtures');
  }

  return [
    { ...payload, profiles: [{ ...profile, unexpected: true }] },
    { ...payload, profiles: [withoutRequiredContacts] },
    {
      ...payload,
      profiles: [{ ...profile, contacts: [{ ...contact, type: 'email' }] }],
    },
    {
      ...payload,
      profiles: [
        { ...profile, mentions: [{ ...mention, type: 'organization' }] },
      ],
    },
    {
      ...payload,
      profiles: [
        {
          ...profile,
          backlinks: {
            ...profile.backlinks,
            news: [{ ...backlink, mentioned_at: '03.05.2026 08:00' }],
          },
        },
      ],
    },
    {
      ...payload,
      profiles: [{ ...profile, html_url: '/people/kschemelinin/' }],
    },
    {
      ...payload,
      profiles: [
        { ...profile, html_url: 'https://example.com/people/%zzprofile' },
      ],
    },
    {
      ...payload,
      profiles: [
        {
          ...profile,
          name_cases: { ...profile.name_cases, voc: 'Кирилл' },
        },
      ],
    },
    {
      ...payload,
      stats: { ...payload.stats, backlink_count: -1 },
    },
  ];
};

describe('people public schema', () => {
  it('accepts and preserves the full contract payload', () => {
    const payload = contractPayload();
    const parsed = peoplePublicPayloadSchema.parse(payload);

    expect(parsed).toEqual(payload);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(payload));
  });

  it('rejects nested fields, invalid dynamic keys, enums, formats and ranges', () => {
    const invalidPayloads = invalidContractPayloads();

    expect(
      invalidPayloads.map(
        (input) => peoplePublicPayloadSchema.safeParse(input).success,
      ),
    ).toEqual(invalidPayloads.map(() => false));
  });

  it('exposes deeply readonly DTO types', () => {
    expectTypeOf<PeoplePublicPayloadDto['profiles']>().toEqualTypeOf<
      readonly PeoplePublicProfileDto[]
    >();
    expectTypeOf<PeoplePublicProfileDto['contacts']>().toEqualTypeOf<
      readonly PeoplePublicContactDto[]
    >();
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
      peopleDataPath(),
    );

    expect({
      schema: standalone.$schema,
      id: standalone.$id,
      title: standalone.title,
      description: standalone.description,
    }).toMatchInlineSnapshot(`
      {
        "description": "Полная лента профилей людей только для чтения с публичными контактами, упоминаниями и обратными ссылками по всему сайту. Исходящие упоминания людей и мест различаются по обязательному полю \`type\`. Упоминания учитывают \`@slug\`, \`@slug:case\` и \`[текст](@slug)\`; \`[текст](@slug:case)\` не поддерживается.",
        "id": "https://example.com/people/schemas/people.schema.json",
        "schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "PeoplePayload",
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
  });
});
