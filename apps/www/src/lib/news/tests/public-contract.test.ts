import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { newsArticleEntry, newsArchiveSummaryEntries } from '../load.test-helper';
import type { NewsPublicPayload } from '../public-dto';
import type { NewsDataset } from '../types';
import type { ContractObject, ContractSchema, NewsOpenApi } from './public-contract.types';

let getArticles: typeof import('@/pages/news/data/articles.json').GET;
let standalone: ContractSchema;
let api: NewsOpenApi;
let newsPublicPayloadSchema: typeof import('../public-schema').newsPublicPayloadSchema;
let news: typeof import('../load');

beforeAll(async () => {
  Object.assign(import.meta.env, { SITE: 'https://example.com', BASE_URL: '/' });
  ({ GET: getArticles } = await import('@/pages/news/data/articles.json'));
  news = await import('../load');
  ({ newsPublicPayloadSchema } = await import('../public-schema'));
  const schemaRoute = await import('@/pages/news/schemas/articles.schema.json');
  const openapiRoute = await import('@/pages/news/openapi/articles.openapi.json');
  standalone = await (await schemaRoute.GET({} as never)).json();
  api = await (await openapiRoute.GET({} as never)).json();
});

afterEach(() => vi.restoreAllMocks());

const dataset = (full = true): NewsDataset => {
  const entry = newsArticleEntry({
    id: '2026/05/contract',
    title: 'Contract article',
    summary: 'Contract summary',
    date: '01.05.2026 09:00',
    body: 'Article body',
    events: [
      {
        slug: 'meeting',
        title: 'Meeting',
        starts_at: '02.05.2026 19:00',
        ends_at: full ? '02.05.2026 21:00' : undefined,
        description: full ? 'Event description' : undefined,
        location: full ? 'Club' : undefined,
        coordinates: full ? { lat: 55, lng: 38 } : undefined,
        organizer: full ? { name: 'Organizer', type: 'organization' } : undefined,
        performer: full ? [{ name: 'Performer', type: 'person' }] : undefined
      }
    ]
  });
  const articles = [
    {
      ...entry,
      data: {
        ...entry.data,
        tags: ['события'],
        source_url: full ? 'https://example.com/source' : undefined,
        cover: full
          ? { src: '/cover.jpg', width: 1280, height: 960, format: 'jpg' as const }
          : undefined,
        cover_alt: full ? 'Cover' : undefined,
        photos: [
          {
            url: 'https://example.com/photo.jpg',
            width: 1280,
            height: 960,
            alt: 'Photo',
            caption: full ? 'Caption' : undefined
          }
        ],
        attachments: [
          {
            title: 'Document',
            url: '/document.pdf',
            type: full ? 'pdf' : undefined,
            size: full ? '1 MB' : undefined
          }
        ]
      }
    }
  ];
  return news.buildNewsDataset(
    [
      {
        id: 'ig',
        data: {
          name: 'Editor',
          kind: 'editorial',
          url: full ? 'https://example.com/editor' : undefined
        }
      }
    ],
    articles,
    newsArchiveSummaryEntries(articles)
  );
};

const serializedFeed = async (data: NewsDataset): Promise<NewsPublicPayload> => {
  vi.spyOn(news, 'loadNewsData').mockResolvedValue(data);
  const response = await getArticles({} as never);
  const body = await response.text();
  const payload: NewsPublicPayload = JSON.parse(body);
  expect(body).toBe(JSON.stringify(payload));
  return payload;
};

const contractObjects = (
  schema: ContractSchema,
  value: unknown,
  path = '$'
): readonly ContractObject[] => {
  if (schema.$ref) {
    const definition = standalone.$defs?.[schema.$ref.replace('#/$defs/', '')];
    if (!definition) throw new Error(`Unresolved schema reference: ${schema.$ref}`);
    return contractObjects(definition, value, path);
  }
  if (schema.type === 'array' && schema.items && Array.isArray(value)) {
    const items = schema.items;
    return value.flatMap((item, index) => contractObjects(items, item, `${path}[${index}]`));
  }
  if (schema.type !== 'object') return [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected an object at ${path}`);
  }
  const object = value as Record<string, unknown>;
  return [
    { schema, value: object, path },
    ...Object.entries(schema.properties ?? {}).flatMap(([key, property]) =>
      object[key] === undefined ? [] : contractObjects(property, object[key], `${path}.${key}`)
    )
  ];
};

const expectValid = (payload: unknown, expected = true, context = 'feed') => {
  const result = newsPublicPayloadSchema.safeParse(payload);
  expect(result.success, `${context}: ${JSON.stringify(result.error?.issues)}`).toBe(expected);
};

describe('serialized news contracts', () => {
  it('publishes the same generated contract in JSON Schema and OpenAPI', () => {
    const responseSchema =
      api.paths['/news/data/articles.json'].get.responses[200].content['application/json'].schema;
    const schemaRef = '#/components/schemas/NewsArticlesPayload';
    expect(responseSchema).toEqual({ $ref: schemaRef });
    const component = api.components.schemas.NewsArticlesPayload;
    const standaloneComponent = JSON.parse(
      JSON.stringify(component, (key, value) =>
        key === '$ref' && typeof value === 'string' ? value.replace(`${schemaRef}/`, '#/') : value
      )
    );
    expect(standaloneComponent).toEqual(
      Object.fromEntries(
        Object.entries(standalone).filter(([key]) => key !== '$schema' && key !== '$id')
      )
    );
    // Custom Zod refinements need explicit JSON Schema metadata.
    expect(standalone.$defs?.article.properties?.areas.uniqueItems).toBe(true);
  });

  it('validates a fully populated article through the real feed, schema and OpenAPI routes', async () => {
    const payload = await serializedFeed(dataset());
    expect(payload.total_count).toBe(1);
    expectValid(payload);

    const objects = contractObjects(standalone, payload);
    // Include inline objects and both uses of eventParticipant, not only $defs.
    expect(objects.map(({ path }) => path)).toMatchInlineSnapshot(`
      [
        "$",
        "$.articles[0]",
        "$.articles[0].author",
        "$.articles[0].tags[0]",
        "$.articles[0].cover",
        "$.articles[0].events[0]",
        "$.articles[0].events[0].coordinates",
        "$.articles[0].events[0].organizer",
        "$.articles[0].events[0].performer[0]",
        "$.articles[0].photos[0]",
        "$.articles[0].attachments[0]",
        "$.archives",
        "$.archives.years[0]",
        "$.archives.years[0].months[0]",
        "$.tags[0]",
      ]
    `);
    for (const { schema, value, path } of objects) {
      expect(Object.keys(value).sort(), path).toEqual(Object.keys(schema.properties ?? {}).sort());
      expect(schema.additionalProperties, path).toBe(false);
      value.unexpected = true;
      expectValid(payload, false, `${path}.unexpected`);
      delete value.unexpected;

      for (const key of Object.keys(value)) {
        const original = value[key];
        delete value[key];
        expectValid(payload, !schema.required?.includes(key), `${path}.${key}`);
        value[key] = original;
      }
    }
  });

  it('validates an empty feed with the generation timestamp as its last update', async () => {
    const payload = await serializedFeed(news.buildNewsDataset([], [], []));
    expectValid(payload);
    expect({
      count: payload.total_count,
      articles: payload.articles,
      archives: payload.archives,
      tags: payload.tags,
      usesGeneratedAt: payload.updated_at === payload.generated_at
    }).toMatchInlineSnapshot(`
      {
        "archives": {
          "years": [],
        },
        "articles": [],
        "count": 0,
        "tags": [],
        "usesGeneratedAt": true,
      }
    `);
  });

  it('omits absent optional keys while preserving required empty arrays and body', async () => {
    const data = dataset(false);
    const payload = await serializedFeed(data);
    expectValid(payload);
    for (const { schema, value, path } of contractObjects(standalone, payload)) {
      // Keep only the optional events container to exercise a minimal event too.
      expect(
        Object.keys(value)
          .filter((key) => key !== 'events')
          .sort(),
        path
      ).toEqual([...(schema.required ?? [])].sort());
    }
    const article = data.articles[0];
    const withoutEvents = await serializedFeed({
      ...data,
      articles: [{ ...article, events: [], photos: [], attachments: [], tags: [], body: '' }]
    });
    expectValid(withoutEvents);
    expect(withoutEvents.articles[0]).not.toHaveProperty('events');
    expect(withoutEvents.articles[0]).toMatchObject({
      photos: [],
      attachments: [],
      tags: [],
      body_markdown: ''
    });
  });

  it.each([
    ['$', 'schema_version', '2.0.0'],
    ['$', 'generated_at', 'not a date'],
    ['$', 'updated_at', '2026-05-01'],
    ['$', 'total_count', -1],
    ['$', 'total_count', 1.5],
    ['$.articles[0]', 'id', 'not/an/article/id'],
    ['$.articles[0]', 'title', ''],
    ['$.articles[0]', 'published_at', '2026-02-30T09:00:00Z'],
    ['$.articles[0]', 'year', 1999],
    ['$.articles[0]', 'year', 3000],
    ['$.articles[0]', 'month', 0],
    ['$.articles[0]', 'month', 13],
    ['$.articles[0]', 'day', 0],
    ['$.articles[0]', 'day', 32],
    ['$.articles[0]', 'html_url', '/relative'],
    ['$.articles[0]', 'pinned', 'false'],
    ['$.articles[0]', 'areas', []],
    ['$.articles[0]', 'areas', ['river', 'river']],
    ['$.articles[0]', 'areas', ['unknown']],
    ['$.articles[0]', 'events', []],
    ['$.articles[0].author', 'kind', 'unknown'],
    ['$.articles[0].author', 'url', 'relative'],
    ['$.articles[0].cover', 'width', 0],
    ['$.articles[0].photos[0]', 'height', 1.5],
    ['$.articles[0].photos[0]', 'caption', ''],
    ['$.articles[0].attachments[0]', 'type', ''],
    ['$.articles[0].events[0]', 'ics_url', 'relative'],
    ['$.articles[0].events[0]', 'ends_at', '2026-05-01T09:00:00'],
    ['$.articles[0].events[0].coordinates', 'lat', -91],
    ['$.articles[0].events[0].coordinates', 'lat', 91],
    ['$.articles[0].events[0].coordinates', 'lng', -181],
    ['$.articles[0].events[0].coordinates', 'lng', 181],
    ['$.articles[0].events[0].organizer', 'type', 'unknown'],
    ['$.articles[0].events[0].performer[0]', 'name', ''],
    ['$.archives.years[0]', 'year', 3000],
    ['$.archives.years[0].months[0]', 'month', 13],
    ['$.archives.years[0].months[0]', 'count', -1],
    ['$.tags[0]', 'count', 0.5]
  ] as const)('rejects a constraint violation at %s.%s (%j)', async (path, key, invalid) => {
    const payload = await serializedFeed(dataset());
    const object = contractObjects(standalone, payload).find((object) => object.path === path);
    if (!object) throw new Error(`Missing contract object at ${path}`);
    object.value[key] = invalid;
    expectValid(payload, false, `${path}.${key}`);
  });
});
