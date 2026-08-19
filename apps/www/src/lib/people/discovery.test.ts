import { beforeAll, describe, expect, it } from 'vitest';

import type { PersonProfile } from './types';
import type {
  peoplePublicSurfaceSlice as peoplePublicSurfaceSliceType,
  PublicSurfaceSlice,
} from '@/lib/public-surface';
import type { expectSectionCatalogMatchesRegistry as expectSectionCatalogMatchesRegistryType } from '@/lib/public-surface/catalog-contract.test-helper';

let buildPeoplePayload: typeof import('./discovery').buildPeoplePayload;
let catalog: typeof import('./discovery').catalog;
let expectSectionCatalogMatchesRegistry: typeof expectSectionCatalogMatchesRegistryType;
let links: typeof import('./discovery').links;
let openapi: typeof import('./discovery').openapi;
let peoplePublicSurfaceSlice: typeof peoplePublicSurfaceSliceType &
  PublicSurfaceSlice;
let schema: typeof import('./discovery').schema;

const profile = (): PersonProfile => ({
  id: 'kschemelinin',
  slug: 'kschemelinin',
  name: 'Кирилл Щемелинин',
  company: 'ОК "Комфорт"',
  position: 'Исполняющий обязанности директора по эксплуатации',
  url: '/people/kschemelinin/',
  markdownUrl: '/people/kschemelinin/index.md',
  canonical: 'https://example.com/people/kschemelinin/',
  contacts: [
    {
      type: 'telegram',
      value: '@Kirill_ZemlyaMO',
      display: '@Kirill_ZemlyaMO',
      href: 'https://t.me/Kirill_ZemlyaMO',
    },
  ],
  body: 'Как отметил [Кирилл Щемелинин](/people/kschemelinin/), проблема редкая.',
  mentions: [
    {
      type: 'person',
      slug: 'apetrov',
      label: 'Андрей Петров',
      htmlUrl: '/people/apetrov/',
      markdownUrl: '/people/apetrov/index.md',
    },
  ],
  backlinks: {
    news: [
      {
        section: 'news',
        kind: 'article',
        sourceId: '2026/05/power-outage',
        title: 'Повреждение линии 10 кВ',
        htmlUrl: '/news/2026/05/power-outage/',
        markdownUrl: '/news/2026/05/power-outage/index.md',
        excerpt: 'Разбор причин аварии.',
        mentionedAt: '2026-05-03T08:00:00.000+03:00',
      },
    ],
    status: [
      {
        section: 'status',
        kind: 'incident',
        sourceId: '2026/04/electricity-river-10kv-line-damage',
        title: 'Отключение электричества в Шелково Ривер',
        htmlUrl:
          '/status/incidents/2026/04/electricity-river-10kv-line-damage/',
        markdownUrl:
          '/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
        excerpt: 'Как отметил Кирилл Щемелинин, повреждение было редким.',
        mentionedAt: '2026-04-22T11:30:00.000+03:00',
      },
    ],
    reviews: [],
    places: [],
    people: [],
    contacts: [],
  },
});

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildPeoplePayload, catalog, links, openapi, schema } =
    await import('./discovery'));
  ({ expectSectionCatalogMatchesRegistry } =
    await import('@/lib/public-surface/catalog-contract.test-helper'));
  ({ peoplePublicSurfaceSlice } = await import('@/lib/public-surface'));
});

describe('people discovery payload', () => {
  it('keeps the section API catalog aligned with registry catalog surfaces', () => {
    expectSectionCatalogMatchesRegistry({
      catalog,
      siteRoot: 'https://example.com',
      slice: peoplePublicSurfaceSlice,
    });
  });

  it('serializes profiles with mentions, backlinks, and aggregate stats', () => {
    const payload = buildPeoplePayload({ profiles: [profile()] });

    expect(payload.stats).toEqual({
      profile_count: 1,
      mention_count: 1,
      backlink_count: 2,
    });
    expect(payload.profiles[0]).toMatchObject({
      id: 'kschemelinin',
      slug: 'kschemelinin',
      company: 'ОК "Комфорт"',
      position: 'Исполняющий обязанности директора по эксплуатации',
      html_url: 'https://example.com/people/kschemelinin/',
      markdown_url: 'https://example.com/people/kschemelinin/index.md',
      mention_count: 1,
      backlink_count: 2,
      contacts: [
        {
          type: 'telegram',
          href: 'https://t.me/Kirill_ZemlyaMO',
        },
      ],
      mentions: [
        {
          slug: 'apetrov',
          html_url: 'https://example.com/people/apetrov/',
          markdown_url: 'https://example.com/people/apetrov/index.md',
        },
      ],
      backlinks: {
        news: [
          {
            source_id: '2026/05/power-outage',
            html_url: 'https://example.com/news/2026/05/power-outage/',
            markdown_url:
              'https://example.com/news/2026/05/power-outage/index.md',
          },
        ],
        status: [
          {
            source_id: '2026/04/electricity-river-10kv-line-damage',
            html_url:
              'https://example.com/status/incidents/2026/04/electricity-river-10kv-line-damage/',
            markdown_url:
              'https://example.com/status/incidents/2026/04/electricity-river-10kv-line-damage/index.md',
          },
        ],
      },
    });
  });

  it('keeps schema, openapi, and catalog aligned around markdown-first section discovery', () => {
    const root = 'https://example.com';
    const jsonSchema = schema(root) as {
      readonly description?: string;
      readonly $defs?: Record<
        string,
        { readonly required?: readonly string[] }
      >;
    };
    const defs = (jsonSchema.$defs ?? {}) as Record<
      string,
      { readonly required?: readonly string[] }
    >;
    const api = openapi(root) as {
      readonly info?: { readonly description?: string };
      readonly paths?: Record<
        string,
        {
          readonly get?: {
            readonly description?: string;
            readonly responses?: {
              readonly 200?: {
                readonly content?: {
                  readonly 'application/json'?: {
                    readonly schema?: { readonly $ref?: string };
                  };
                };
              };
            };
          };
        }
      >;
      readonly components?: {
        readonly schemas?: Record<
          string,
          {
            readonly $defs?: Record<
              string,
              {
                readonly required?: readonly string[];
                readonly enum?: readonly string[];
              }
            >;
          }
        >;
      };
    };
    const payload = catalog(root) as {
      readonly linkset: readonly [
        {
          readonly anchor: string;
          readonly item: readonly { readonly href: string }[];
          readonly 'service-desc'?: readonly { readonly href: string }[];
        },
      ];
    };
    const openapiDefs = api.components?.schemas?.PeoplePayload?.$defs ?? {};

    expect(jsonSchema.description).toContain('`@slug`, `@slug:case`');
    expect(jsonSchema.description).toContain('`[текст](@slug)`');
    expect(api.info?.description).toContain('`[текст](@slug)`');
    expect(api.paths?.['/people/data/people.json']?.get?.description).toContain(
      '`[текст](@slug)`',
    );
    expect(defs.profile?.required).toEqual(
      expect.arrayContaining([
        'contacts',
        'mentions',
        'mention_count',
        'backlinks',
        'backlink_count',
      ]),
    );
    expect(payload.linkset[0]?.anchor).toBe(
      'https://example.com/people/index.md',
    );
    expect(payload.linkset[0]?.item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/people/index.md',
        }),
        expect.objectContaining({
          href: 'https://example.com/people/data/people.json',
        }),
        expect.objectContaining({
          href: 'https://example.com/people/llms.txt',
        }),
      ]),
    );
    expect(payload.linkset[0]?.['service-desc']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/people/schemas/people.schema.json',
        }),
        expect.objectContaining({
          href: 'https://example.com/people/openapi/people.openapi.json',
        }),
      ]),
    );
    expect(openapiDefs.contactType?.enum).toEqual(['phone', 'telegram']);
    expect(openapiDefs.section?.enum).toEqual([
      'news',
      'status',
      'reviews',
      'places',
      'people',
      'contacts',
    ]);
    expect(openapiDefs.kind?.enum).toEqual([
      'article',
      'incident',
      'review',
      'place',
      'person',
      'contact',
    ]);
    expect(defs.backlinks?.required).toEqual([
      'news',
      'status',
      'reviews',
      'places',
      'people',
      'contacts',
    ]);
    expect(openapiDefs.profile?.required).toEqual(defs.profile?.required);
    expect(
      api.paths?.['/people/data/people.json']?.get?.responses?.[200]?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/PeoplePayload');
    expect(links(root)).toContain(
      '<https://example.com/people/.well-known/api-catalog>; rel="api-catalog"',
    );
  });
});
