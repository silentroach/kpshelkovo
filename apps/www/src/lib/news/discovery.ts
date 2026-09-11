import { formatApiCatalogLink } from '@/lib/api-catalog-response';
import {
  surfaceHref,
  type PublicSurface,
  type PublicSurfaceCatalogRole
} from '@/lib/public-surface';

import type { RequiredProperties } from './discovery.types';
import {
  NEWS_PUBLIC_AUTHOR_KINDS,
  NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION,
  toNewsPublicPayload,
  type NewsPublicArchiveMonth as NewsDiscoveryArchiveMonth,
  type NewsPublicArchiveYear as NewsDiscoveryArchiveYear,
  type NewsPublicArticle as NewsDiscoveryArticle,
  type NewsPublicAttachment as NewsDiscoveryAttachment,
  type NewsPublicAuthor as NewsDiscoveryAuthor,
  type NewsPublicCover as NewsDiscoveryCover,
  type NewsPublicEvent as NewsDiscoveryEvent,
  type NewsPublicEventOrganizer as NewsDiscoveryEventOrganizer,
  type NewsPublicPayload as NewsDiscoveryPayload,
  type NewsPublicPhoto as NewsDiscoveryPhoto,
  type NewsPublicTag as NewsDiscoveryTag,
  type NewsPublicTagPage as NewsDiscoveryTagPage
} from './public-dto';
import { newsPublicSurfaceSlice } from './public-surface';
import { articlesDataPath, articlesSchemaPath } from './routes';
import { NEWS_AREAS } from './schema';
import type { NewsDataset } from './types';

export const OAS = 'application/vnd.oai.openapi+json';

export type {
  NewsDiscoveryArchiveMonth,
  NewsDiscoveryArchiveYear,
  NewsDiscoveryArticle,
  NewsDiscoveryAttachment,
  NewsDiscoveryAuthor,
  NewsDiscoveryCover,
  NewsDiscoveryEvent,
  NewsDiscoveryEventOrganizer,
  NewsDiscoveryPayload,
  NewsDiscoveryPhoto,
  NewsDiscoveryTag,
  NewsDiscoveryTagPage
};

const NEWS_ARTICLES_PAYLOAD_SCHEMA = 'NewsArticlesPayload';
const NEWS_PAYLOAD_SCHEMA_VERSION = NEWS_PUBLIC_PAYLOAD_SCHEMA_VERSION;

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const server = (root: string): string => root.replace(/\/$/, '');

const star = (value: string): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' }
];

const CATALOG_TITLE_OVERRIDES: Readonly<Partial<Record<string, string>>> = {
  'news:data': 'Основная машиночитаемая лента новостей, включая необязательные события',
  'news:llms': 'Короткий обзор llms.txt',
  'news:llms-full': 'Подробный обзор llms-full.txt'
};

const sectionCatalogRole = (surface: PublicSurface): PublicSurfaceCatalogRole | false | undefined =>
  surface.sectionCatalogRole ?? surface.catalogRole;

const catalogEntry = (root: string, surface: PublicSurface) => ({
  href: surfaceHref(root, surface),
  type: surface.mediaType,
  'title*': star(CATALOG_TITLE_OVERRIDES[surface.id] ?? surface.label)
});

const catalogEntries = (root: string, role: PublicSurfaceCatalogRole) =>
  newsPublicSurfaceSlice.surfaces
    .filter((surface) => sectionCatalogRole(surface) === role)
    .map((surface) => catalogEntry(root, surface));

const linkRelation = (surface: PublicSurface) => {
  if (surface.discoveryRoles.includes('api-catalog')) {
    return 'api-catalog';
  }

  if (sectionCatalogRole(surface) === 'service-desc') {
    return 'service-desc';
  }

  return;
};

const formatLink = (
  root: string,
  surface: PublicSurface,
  relation: 'api-catalog' | 'service-desc'
): string =>
  relation === 'api-catalog'
    ? formatApiCatalogLink(surfaceHref(root, surface))
    : `<${surfaceHref(root, surface)}>; rel="service-desc"; type="${surface.mediaType}"`;

const text = (minLength = 0): Record<string, unknown> => ({
  type: 'string',
  ...(minLength > 0 ? { minLength } : {})
});

const uri = (): Record<string, unknown> => ({
  type: 'string',
  format: 'uri'
});

const dateTime = (): Record<string, unknown> => ({
  type: 'string',
  format: 'date-time'
});

const flag = (): Record<string, unknown> => ({
  type: 'boolean'
});

const integer = (minimum?: number, maximum?: number): Record<string, unknown> => ({
  type: 'integer',
  ...(minimum !== undefined ? { minimum } : {}),
  ...(maximum !== undefined ? { maximum } : {})
});

const numeric = (minimum?: number, maximum?: number): Record<string, unknown> => ({
  type: 'number',
  ...(minimum !== undefined ? { minimum } : {}),
  ...(maximum !== undefined ? { maximum } : {})
});

const list = (
  items: Record<string, unknown>,
  extra?: Record<string, unknown>
): Record<string, unknown> => ({
  type: 'array',
  items,
  ...(extra ?? {})
});

// Check every DTO key (including optional ones) and its required/optional status.
const obj = <T extends object>(
  properties: Record<keyof T, Record<string, unknown>>,
  required: RequiredProperties<T>
): Record<string, unknown> => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(required)
});

function rewriteSchemaRefs(value: unknown, schemaRef: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteSchemaRefs(item, schemaRef));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (key === '$ref' && typeof entry === 'string' && entry.startsWith('#/')) {
        return [key, `${schemaRef}${entry.slice(1)}`];
      }

      return [key, rewriteSchemaRefs(entry, schemaRef)];
    })
  );
}

export const buildNewsPayload = (
  data: NewsDataset,
  opts?: { readonly generated_at?: Date }
): NewsDiscoveryPayload => toNewsPublicPayload(data, { generatedAt: opts?.generated_at });

export function schema(root: string): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: abs(root, articlesSchemaPath()),
    title: 'NewsArticlesPayload',
    description:
      'Полная лента новостей только для чтения: метаданные ленты, канонический HTML URL, Markdown-версии, полный body_markdown и необязательные метаданные событий с ics_url внутри статьи.',
    ...obj<NewsDiscoveryPayload>(
      {
        schema_version: {
          const: NEWS_PAYLOAD_SCHEMA_VERSION
        },
        generated_at: dateTime(),
        updated_at: dateTime(),
        total_count: integer(0),
        articles: list({
          $ref: '#/$defs/article'
        }),
        archives: obj<NewsDiscoveryPayload['archives']>(
          {
            years: list({
              $ref: '#/$defs/archiveYear'
            })
          },
          { years: true }
        ),
        tags: list({
          $ref: '#/$defs/tagPage'
        })
      },
      {
        schema_version: true,
        generated_at: true,
        updated_at: true,
        total_count: true,
        articles: true,
        archives: true,
        tags: true
      }
    ),
    $defs: {
      author: obj<NewsDiscoveryAuthor>(
        {
          id: text(1),
          name: text(1),
          kind: {
            enum: [...NEWS_PUBLIC_AUTHOR_KINDS]
          },
          url: uri()
        },
        { id: true, name: true, kind: true }
      ),
      tag: obj<NewsDiscoveryTag>(
        {
          label: text(1),
          key: text(1),
          url: uri()
        },
        { label: true, key: true, url: true }
      ),
      tagPage: obj<NewsDiscoveryTagPage>(
        {
          label: text(1),
          key: text(1),
          count: integer(0),
          url: uri(),
          markdown_url: uri()
        },
        { label: true, key: true, count: true, url: true, markdown_url: true }
      ),
      photo: obj<NewsDiscoveryPhoto>(
        {
          url: uri(),
          width: integer(1),
          height: integer(1),
          alt: text(1),
          caption: text(1)
        },
        { url: true, width: true, height: true, alt: true }
      ),
      attachment: obj<NewsDiscoveryAttachment>(
        {
          title: text(1),
          url: uri(),
          type: text(1),
          size: text(1)
        },
        { title: true, url: true }
      ),
      cover: obj<NewsDiscoveryCover>(
        {
          url: uri(),
          alt: text(1),
          width: integer(1),
          height: integer(1)
        },
        { url: true, alt: true, width: true, height: true }
      ),
      coordinates: obj<NonNullable<NewsDiscoveryEvent['coordinates']>>(
        {
          lat: numeric(-90, 90),
          lng: numeric(-180, 180)
        },
        { lat: true, lng: true }
      ),
      eventParticipant: obj<NewsDiscoveryEventOrganizer>(
        {
          name: text(1),
          type: {
            enum: ['organization', 'person']
          }
        },
        { name: true, type: true }
      ),
      event: obj<NewsDiscoveryEvent>(
        {
          slug: text(1),
          title: text(1),
          description: text(1),
          starts_at: dateTime(),
          ends_at: dateTime(),
          location: text(1),
          coordinates: {
            $ref: '#/$defs/coordinates'
          },
          map_url: uri(),
          ics_url: uri(),
          organizer: {
            $ref: '#/$defs/eventParticipant'
          },
          performer: list({
            $ref: '#/$defs/eventParticipant'
          })
        },
        { slug: true, title: true, starts_at: true, ics_url: true }
      ),
      article: obj<NewsDiscoveryArticle>(
        {
          id: {
            type: 'string',
            pattern: '^\\d{4}/\\d{2}/[^/]+$'
          },
          title: text(1),
          summary: text(1),
          published_at: dateTime(),
          year: integer(2000, 2999),
          month: integer(1, 12),
          day: integer(1, 31),
          entry: text(1),
          html_url: uri(),
          markdown_url: uri(),
          source_url: uri(),
          pinned: flag(),
          author: {
            $ref: '#/$defs/author'
          },
          areas: list(
            {
              enum: [...NEWS_AREAS]
            },
            {
              minItems: 1,
              uniqueItems: true
            }
          ),
          tags: list({
            $ref: '#/$defs/tag'
          }),
          cover: {
            $ref: '#/$defs/cover'
          },
          events: list(
            {
              $ref: '#/$defs/event'
            },
            {
              minItems: 1
            }
          ),
          photos: list({
            $ref: '#/$defs/photo'
          }),
          attachments: list({
            $ref: '#/$defs/attachment'
          }),
          body_markdown: text()
        },
        {
          id: true,
          title: true,
          summary: true,
          published_at: true,
          year: true,
          month: true,
          day: true,
          entry: true,
          html_url: true,
          markdown_url: true,
          pinned: true,
          author: true,
          areas: true,
          tags: true,
          photos: true,
          attachments: true,
          body_markdown: true
        }
      ),
      archiveMonth: obj<NewsDiscoveryArchiveMonth>(
        {
          year: integer(2000, 2999),
          month: integer(1, 12),
          count: integer(0),
          url: uri(),
          markdown_url: uri()
        },
        { year: true, month: true, count: true, url: true, markdown_url: true }
      ),
      archiveYear: obj<NewsDiscoveryArchiveYear>(
        {
          year: integer(2000, 2999),
          count: integer(0),
          url: uri(),
          markdown_url: uri(),
          months: list({
            $ref: '#/$defs/archiveMonth'
          })
        },
        { year: true, count: true, url: true, markdown_url: true, months: true }
      )
    }
  };
}

export function openapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${NEWS_ARTICLES_PAYLOAD_SCHEMA}`;
  const body = Object.fromEntries(
    Object.entries(schema(root)).filter(([key]) => key !== '$schema' && key !== '$id')
  );
  const componentBody = rewriteSchemaRefs(body, schemaRef);

  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Шелково News Feed',
      version: '1.0.0',
      description:
        'OpenAPI-описание /news/data/articles.json только для чтения: метаданные ленты, полный body_markdown, необязательные события статей, архивы и теги.'
    },
    servers: [
      {
        url: server(root)
      }
    ],
    paths: {
      [articlesDataPath()]: {
        get: {
          operationId: 'getNewsArticles',
          summary: 'Получить полную ленту новостей',
          description:
            'Возвращает основную структурированную ленту новостей со служебными метаданными, статьями, полным body_markdown, необязательными метаданными событий с ics_url внутри статьи, тегами и архивами.',
          responses: {
            200: {
              description: 'Полная лента новостей',
              content: {
                'application/json': {
                  schema: {
                    $ref: schemaRef
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        [NEWS_ARTICLES_PAYLOAD_SCHEMA]: componentBody
      }
    }
  };
}

export function catalog(root: string): Record<string, unknown> {
  const anchor = newsPublicSurfaceSlice.surfaces.find(
    (surface) => sectionCatalogRole(surface) === 'anchor'
  );
  if (!anchor) {
    throw new Error('news public surface registry has no catalog anchor');
  }

  return {
    linkset: [
      {
        anchor: surfaceHref(root, anchor),
        item: catalogEntries(root, 'item'),
        'service-desc': catalogEntries(root, 'service-desc')
      }
    ]
  };
}

export const links = (root: string): string =>
  newsPublicSurfaceSlice.surfaces
    .flatMap((surface) => {
      const relation = linkRelation(surface);

      return relation ? [formatLink(root, surface, relation)] : [];
    })
    .join(', ');

export const self = (root: string): string => {
  const surface = newsPublicSurfaceSlice.surfaces.find((candidate: PublicSurface) =>
    candidate.discoveryRoles.includes('api-catalog')
  );
  if (!surface) {
    throw new Error('news public surface registry has no API catalog');
  }

  const relation = linkRelation(surface);
  if (!relation) {
    throw new Error('news API catalog has no Link relation');
  }

  return formatLink(root, surface, relation);
};
