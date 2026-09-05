import { beforeAll, describe, expect, it } from 'vitest';

import type { NewsArticle, NewsDataset } from './types';
import type {
  newsPublicSurfaceSlice as newsPublicSurfaceSliceType,
  PublicSurface,
  PublicSurfaceSlice,
  surfaceHref as surfaceHrefType,
} from '@/lib/public-surface';
import type { expectSectionCatalogMatchesRegistry as expectSectionCatalogMatchesRegistryType } from '@/lib/public-surface/catalog-contract.test-helper';

let buildNewsPayload: typeof import('./discovery').buildNewsPayload;
let catalog: typeof import('./discovery').catalog;
let expectSectionCatalogMatchesRegistry: typeof expectSectionCatalogMatchesRegistryType;
let links: typeof import('./discovery').links;
let newsPublicSurfaceSlice: typeof newsPublicSurfaceSliceType &
  PublicSurfaceSlice;
let openapi: typeof import('./discovery').openapi;
let PROFILE: typeof import('./discovery').PROFILE;
let schema: typeof import('./discovery').schema;
let self: typeof import('./discovery').self;
let surfaceHref: typeof surfaceHrefType;

const articleWithEvent = (): NewsArticle => ({
  id: '2026/05/event',
  title: 'Встреча по регламенту',
  author: {
    id: 'editor',
    name: 'Редакция',
    kind: 'editorial',
  },
  year: 2026,
  month: 5,
  day: 1,
  entry: 'event',
  url: '/news/2026/05/event/',
  markdownUrl: '/news/2026/05/event/index.md',
  canonical: 'https://example.com/news/2026/05/event/',
  publishedAt: new Date('2026-05-01T09:00:00+03:00'),
  publishedIso: '2026-05-01T09:00:00.000+03:00',
  time: '09:00',
  appliesToAllAreas: true,
  areas: ['river', 'forest', 'park', 'village'],
  tags: [],
  pinned: false,
  photos: [],
  attachments: [],
  events: [
    {
      slug: 'event',
      title: 'Встреча по регламенту',
      description: 'Описание календарного события.',
      startsAt: new Date('2026-05-31T19:00:00+03:00'),
      startsIso: '2026-05-31T19:00:00.000+03:00',
      startsTime: '19:00',
      endsAt: new Date('2026-05-31T21:00:00+03:00'),
      endsIso: '2026-05-31T21:00:00.000+03:00',
      endsTime: '21:00',
      icsUrl: '/news/2026/05/event/event.ics',
      location: 'КП Шелково, эко-клуб',
      coordinates: {
        lat: 55,
        lng: 38,
      },
      organizer: {
        name: 'Редакция',
        type: 'organization',
      },
      performer: [
        {
          name: 'Ведущий',
          type: 'person',
        },
      ],
    },
  ],
  summary: 'Будет обсуждение регламента.',
  body: 'Текст новости.',
  mentions: [],
});

const dataset = (articles: readonly NewsArticle[]): NewsDataset => ({
  articles,
  home: {
    pinned: [],
    latest: [],
  },
  archives: {
    years: [],
    byYear: new Map(),
    byMonth: new Map(),
  },
  tags: [],
  byId: new Map(articles.map((item) => [item.id, item])),
  byTag: new Map(),
});

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ buildNewsPayload, catalog, links, openapi, PROFILE, schema, self } =
    await import('./discovery'));
  ({ expectSectionCatalogMatchesRegistry } =
    await import('@/lib/public-surface/catalog-contract.test-helper'));
  ({ newsPublicSurfaceSlice, surfaceHref } =
    await import('@/lib/public-surface'));
});

describe('news discovery payload', () => {
  it('keeps the section API catalog aligned with registry catalog surfaces', () => {
    expectSectionCatalogMatchesRegistry({
      catalog,
      exact: true,
      siteRoot: 'https://example.com',
      slice: newsPublicSurfaceSlice,
    });
  });

  it('builds Link headers from registered relations, URLs, and MIME types', () => {
    const root = 'https://example.com';
    const serviceDescriptions = newsPublicSurfaceSlice.surfaces.filter(
      (surface: PublicSurface) =>
        (surface.sectionCatalogRole ?? surface.catalogRole) === 'service-desc',
    );
    const apiCatalog = newsPublicSurfaceSlice.surfaces.find(
      (surface: PublicSurface) =>
        surface.discoveryRoles.includes('api-catalog'),
    );
    if (!apiCatalog) {
      throw new Error('news API catalog surface is missing from the registry');
    }

    const apiCatalogLink = `<${surfaceHref(root, apiCatalog)}>; rel="api-catalog"; type="${apiCatalog.mediaType}"; profile="${PROFILE}"`;
    const expected = [
      ...serviceDescriptions.map(
        (surface) =>
          `<${surfaceHref(root, surface)}>; rel="service-desc"; type="${surface.mediaType}"`,
      ),
      apiCatalogLink,
    ];

    expect(links(root).split(', ')).toEqual(expected);
    expect(self(root)).toBe(apiCatalogLink);
  });

  it('keeps the API catalog self-link intentionally absent', () => {
    const root = 'https://example.com';
    const apiCatalog = newsPublicSurfaceSlice.surfaces.find(
      (surface: PublicSurface) =>
        surface.discoveryRoles.includes('api-catalog'),
    );
    if (!apiCatalog) {
      throw new Error('news API catalog surface is missing from the registry');
    }

    expect(JSON.stringify(catalog(root))).not.toContain(
      surfaceHref(root, apiCatalog),
    );
  });

  it('preserves editorial catalog titles that differ from registry labels', () => {
    const root = 'https://example.com';
    const [linkset] = catalog(root).linkset as readonly {
      readonly item: readonly {
        readonly href: string;
        readonly 'title*': readonly { readonly value: string }[];
      }[];
    }[];
    const titlesByHref = new Map(
      linkset?.item.map((entry) => [entry.href, entry['title*'][0]?.value]) ??
        [],
    );

    expect(
      ['news:data', 'news:llms', 'news:llms-full'].map((id) => {
        const surface = newsPublicSurfaceSlice.surfaces.find(
          (candidate: PublicSurface) => candidate.id === id,
        );
        if (!surface) {
          throw new Error(`news public surface ${id} is missing`);
        }

        return { id, title: titlesByHref.get(surfaceHref(root, surface)) };
      }),
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "news:data",
          "title": "Основная машиночитаемая лента новостей, включая необязательные события",
        },
        {
          "id": "news:llms",
          "title": "Короткий обзор llms.txt",
        },
        {
          "id": "news:llms-full",
          "title": "Подробный обзор llms-full.txt",
        },
      ]
    `);
  });

  it('publishes feed-level metadata for consumers', () => {
    const first = articleWithEvent();
    const second = {
      ...articleWithEvent(),
      id: '2026/05/latest',
      publishedAt: new Date('2026-05-02T09:00:00+03:00'),
      publishedIso: '2026-05-02T09:00:00.000+03:00',
    };

    const payload = buildNewsPayload(dataset([first, second]), {
      generated_at: new Date('2026-05-04T09:00:00.000Z'),
    });

    expect(payload).toMatchObject({
      schema_version: '1.0.0',
      generated_at: '2026-05-04T09:00:00.000Z',
      updated_at: '2026-05-02T09:00:00.000+03:00',
      total_count: 2,
    });
  });

  it('serializes optional article events with absolute ICS URLs', () => {
    const payload = buildNewsPayload(dataset([articleWithEvent()]));

    expect(payload.articles[0]?.events).toEqual([
      {
        slug: 'event',
        title: 'Встреча по регламенту',
        description: 'Описание календарного события.',
        starts_at: '2026-05-31T19:00:00.000+03:00',
        ends_at: '2026-05-31T21:00:00.000+03:00',
        location: 'КП Шелково, эко-клуб',
        coordinates: {
          lat: 55,
          lng: 38,
        },
        map_url: 'https://yandex.ru/maps/?pt=38,55&z=16&l=map',
        ics_url: 'https://example.com/news/2026/05/event/event.ics',
        organizer: {
          name: 'Редакция',
          type: 'organization',
        },
        performer: [
          {
            name: 'Ведущий',
            type: 'person',
          },
        ],
      },
    ]);
  });

  it('keeps non-event articles compatible', () => {
    const article = { ...articleWithEvent(), events: [] };
    const payload = buildNewsPayload(dataset([article]));

    expect(payload.articles[0]?.events).toBeUndefined();
  });

  it('publishes intrinsic photo dimensions', () => {
    const article = {
      ...articleWithEvent(),
      photos: [
        {
          url: 'https://media.kpshelkovo.online/news/2026/05/event/path.jpeg',
          width: 1280,
          height: 960,
          alt: 'Дорожка через поле',
        },
      ],
    };
    const payload = buildNewsPayload(dataset([article]));

    expect(payload.articles[0]?.photos).toMatchInlineSnapshot(`
      [
        {
          "alt": "Дорожка через поле",
          "caption": undefined,
          "height": 960,
          "url": "https://media.kpshelkovo.online/news/2026/05/event/path.jpeg",
          "width": 1280,
        },
      ]
    `);
  });

  it('keeps schema, openapi, and catalog aligned around article-local events', () => {
    const root = 'https://example.com';
    const jsonSchema = schema(root) as {
      readonly required?: readonly string[];
      readonly properties?: Record<string, unknown>;
      readonly $defs?: Record<
        string,
        {
          readonly required?: readonly string[];
          readonly properties?: Record<string, unknown>;
        }
      >;
    };
    const defs = jsonSchema.$defs ?? {};
    const api = openapi(root) as {
      readonly paths?: Record<
        string,
        {
          readonly get?: {
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
            readonly required?: readonly string[];
            readonly properties?: Record<string, unknown>;
            readonly $defs?: Record<
              string,
              {
                readonly required?: readonly string[];
                readonly properties?: Record<string, unknown>;
              }
            >;
          }
        >;
      };
    };
    const apiCatalog = catalog(root) as { readonly linkset: unknown };
    const openapiDefs =
      api.components?.schemas?.NewsArticlesPayload?.$defs ?? {};
    const publicEvent = buildNewsPayload(dataset([articleWithEvent()]))
      .articles[0]?.events?.[0];
    const serializedEvent = JSON.parse(JSON.stringify(publicEvent)) as Record<
      string,
      unknown
    >;
    const serializedOrganizer = serializedEvent.organizer as Record<
      string,
      unknown
    >;

    expect(jsonSchema.required).toEqual([
      'schema_version',
      'generated_at',
      'updated_at',
      'total_count',
      'articles',
      'archives',
      'tags',
    ]);
    expect(jsonSchema.properties?.schema_version).toMatchObject({
      const: '1.0.0',
    });
    expect(jsonSchema.properties?.generated_at).toMatchObject({
      format: 'date-time',
    });
    expect(jsonSchema.properties?.updated_at).toMatchObject({
      format: 'date-time',
    });
    expect(jsonSchema.properties?.total_count).toMatchObject({
      type: 'integer',
      minimum: 0,
    });
    expect(api.components?.schemas?.NewsArticlesPayload?.required).toEqual(
      jsonSchema.required,
    );
    expect(
      api.components?.schemas?.NewsArticlesPayload?.properties?.generated_at,
    ).toMatchObject({ format: 'date-time' });
    expect(defs.event?.required).toEqual([
      'slug',
      'title',
      'starts_at',
      'ics_url',
    ]);
    expect(defs.event?.required).not.toContain('organizer');
    expect(defs.event?.required).not.toContain('performer');
    expect(Object.keys(defs.event?.properties ?? {}).sort()).toEqual(
      Object.keys(serializedEvent).sort(),
    );
    expect(defs.event?.properties).toMatchObject({
      organizer: {
        $ref: '#/$defs/eventParticipant',
      },
      performer: {
        type: 'array',
        items: {
          $ref: '#/$defs/eventParticipant',
        },
      },
    });
    expect(defs.eventParticipant).toMatchObject({
      additionalProperties: false,
      required: ['name', 'type'],
      properties: {
        name: { type: 'string', minLength: 1 },
        type: { enum: ['organization', 'person'] },
      },
    });
    expect(Object.keys(defs.eventParticipant?.properties ?? {}).sort()).toEqual(
      Object.keys(serializedOrganizer).sort(),
    );
    expect(defs.article?.required).not.toContain('events');
    expect(defs.event?.properties?.starts_at).toMatchObject({
      format: 'date-time',
    });
    expect(defs.event?.properties?.ics_url).toMatchObject({ format: 'uri' });
    expect(defs.coordinates?.properties?.lat).toMatchObject({
      minimum: -90,
      maximum: 90,
    });
    expect(defs.coordinates?.properties?.lng).toMatchObject({
      minimum: -180,
      maximum: 180,
    });
    expect(openapiDefs.event?.required).toEqual(defs.event?.required);
    expect(openapiDefs.event?.properties).toMatchObject({
      organizer: {
        $ref: '#/components/schemas/NewsArticlesPayload/$defs/eventParticipant',
      },
      performer: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/NewsArticlesPayload/$defs/eventParticipant',
        },
      },
    });
    expect(openapiDefs.eventParticipant).toEqual(defs.eventParticipant);
    expect(openapiDefs.article?.properties?.events).toMatchObject({
      type: 'array',
      items: {
        $ref: '#/components/schemas/NewsArticlesPayload/$defs/event',
      },
    });
    expect(
      api.paths?.['/news/data/articles.json']?.get?.responses?.[200]?.content?.[
        'application/json'
      ]?.schema?.$ref,
    ).toBe('#/components/schemas/NewsArticlesPayload');
    expect(JSON.stringify(apiCatalog)).not.toContain('/event.ics');
  });
});
