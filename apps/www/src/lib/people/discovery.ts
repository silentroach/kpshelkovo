export {
  buildPeoplePublicPayload as buildPeoplePayload,
  type PeoplePublicBacklinkDto as PeopleDiscoveryBacklink,
  type PeoplePublicBacklinksDto as PeopleDiscoveryBacklinks,
  type PeoplePublicContactDto as PeopleDiscoveryContact,
  type PeoplePublicMentionDto as PeopleDiscoveryMention,
  type PeoplePublicPayloadDto as PeopleDiscoveryPayload,
  type PeoplePublicProfileDto as PeopleDiscoveryProfile,
} from './public-dto';
import { buildPeoplePublicJsonSchema } from './public-schema';
import {
  peopleApiCatalogPath,
  peopleDataPath,
  peopleLlmsFullPath,
  peopleLlmsPath,
  peopleMarkdownPath,
  peopleOpenApiPath,
  peopleSchemaPath,
} from './routes';

export const PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
export const OAS = 'application/vnd.oai.openapi+json';

const PEOPLE_PAYLOAD_SCHEMA = 'PeoplePayload';

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const server = (root: string): string => root.replace(/\/$/, '');

const star = (
  value: string,
): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' },
];

function rewriteSchemaRefs(value: unknown, schemaRef: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteSchemaRefs(item, schemaRef));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (
        key === '$ref' &&
        typeof entry === 'string' &&
        entry.startsWith('#/')
      ) {
        return [key, `${schemaRef}${entry.slice(1)}`];
      }

      return [key, rewriteSchemaRefs(entry, schemaRef)];
    }),
  );
}

export const schema = (root: string): Record<string, unknown> =>
  buildPeoplePublicJsonSchema(abs(root, peopleSchemaPath()));

export function openapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${PEOPLE_PAYLOAD_SCHEMA}`;
  const body = Object.fromEntries(
    Object.entries(schema(root)).filter(
      ([key]) => key !== '$schema' && key !== '$id',
    ),
  );
  const componentBody = rewriteSchemaRefs(body, schemaRef);

  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Шелково People Feed',
      version: '1.0.0',
      description:
        'OpenAPI-описание /people/data/people.json только для чтения с публичными профилями, контактами, упоминаниями и обратными ссылками. Исходящие упоминания людей и мест различаются по обязательному полю `type`. Упоминания учитывают `@slug`, `@slug:case` и `[текст](@slug)`; `[текст](@slug:case)` не поддерживается.',
    },
    servers: [
      {
        url: server(root),
      },
    ],
    paths: {
      [peopleDataPath()]: {
        get: {
          operationId: 'getPeopleProfiles',
          summary: 'Получить полную ленту профилей людей',
          description:
            'Возвращает основную структурированную ленту профилей людей с контактами, упоминаниями и обратными ссылками. Поле `mentions[].type` различает людей и места. Упоминания учитывают `@slug`, `@slug:case` и `[текст](@slug)`; `[текст](@slug:case)` не поддерживается.',
          responses: {
            200: {
              description: 'Полная лента профилей людей',
              content: {
                'application/json': {
                  schema: {
                    $ref: schemaRef,
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        [PEOPLE_PAYLOAD_SCHEMA]: componentBody,
      },
    },
  };
}

export function catalog(root: string): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: abs(root, peopleMarkdownPath()),
        item: [
          {
            href: abs(root, peopleMarkdownPath()),
            type: 'text/markdown',
            'title*': star(
              'Markdown-обзор профилей людей без публичного HTML-индекса',
            ),
          },
          {
            href: abs(root, peopleDataPath()),
            type: 'application/json',
            'title*': star('Основная машиночитаемая лента профилей людей'),
          },
          {
            href: abs(root, peopleLlmsPath()),
            type: 'text/plain',
            'title*': star('Короткий обзор llms.txt'),
          },
          {
            href: abs(root, peopleLlmsFullPath()),
            type: 'text/plain',
            'title*': star('Подробный обзор llms-full.txt'),
          },
        ],
        'service-desc': [
          {
            href: abs(root, peopleSchemaPath()),
            type: 'application/schema+json',
            'title*': star('JSON Schema ленты профилей людей'),
          },
          {
            href: abs(root, peopleOpenApiPath()),
            type: OAS,
            'title*': star('OpenAPI ленты профилей людей'),
          },
        ],
      },
    ],
  };
}

export const links = (root: string): string =>
  [
    `<${abs(root, peopleSchemaPath())}>; rel="service-desc"; type="application/schema+json"`,
    `<${abs(root, peopleOpenApiPath())}>; rel="service-desc"; type="${OAS}"`,
    `<${abs(root, peopleApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`,
  ].join(', ');

export const self = (root: string): string =>
  `<${abs(root, peopleApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
