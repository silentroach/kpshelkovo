import { formatApiCatalogLink } from '@/lib/api-catalog-response';
import {
  surfaceHref,
  type PublicSurface,
  type PublicSurfaceCatalogRole
} from '@/lib/public-surface';

import {
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
import { buildNewsPublicJsonSchema } from './public-schema';
import { newsPublicSurfaceSlice } from './public-surface';
import { articlesDataPath, articlesSchemaPath } from './routes';
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

export const schema = (root: string): Record<string, unknown> =>
  buildNewsPublicJsonSchema(abs(root, articlesSchemaPath()));

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
