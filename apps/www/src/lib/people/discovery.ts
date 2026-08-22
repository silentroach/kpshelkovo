export {
  buildPeoplePublicPayload as buildPeoplePayload,
  type PeoplePublicBacklinkDto as PeopleDiscoveryBacklink,
  type PeoplePublicBacklinksDto as PeopleDiscoveryBacklinks,
  type PeoplePublicContactDto as PeopleDiscoveryContact,
  type PeoplePublicMentionDto as PeopleDiscoveryMention,
  type PeoplePublicPayloadDto as PeopleDiscoveryPayload,
  type PeoplePublicProfileDto as PeopleDiscoveryProfile,
} from './public-dto';
import { PERSON_BACKLINK_KINDS, PERSON_MENTION_SECTIONS } from './schema';
import { ENTITY_MENTION_TYPES } from '@/lib/mentions';
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

const text = (minLength = 0): Record<string, unknown> => ({
  type: 'string',
  ...(minLength > 0 ? { minLength } : {}),
});

const uri = (): Record<string, unknown> => ({
  type: 'string',
  format: 'uri',
});

const dateTime = (): Record<string, unknown> => ({
  type: 'string',
  format: 'date-time',
});

const integer = (minimum = 0): Record<string, unknown> => ({
  type: 'integer',
  minimum,
});

const list = (
  items: Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  type: 'array',
  items,
  ...(extra ?? {}),
});

const obj = (
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
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

export function schema(root: string): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: abs(root, peopleSchemaPath()),
    title: 'PeoplePayload',
    description:
      'Полная лента профилей людей только для чтения с публичными контактами, упоминаниями и обратными ссылками по всему сайту. Исходящие упоминания людей и мест различаются по обязательному полю `type`. Упоминания учитывают `@slug`, `@slug:case` и `[текст](@slug)`; `[текст](@slug:case)` не поддерживается.',
    type: 'object',
    additionalProperties: false,
    required: ['stats', 'profiles'],
    properties: {
      stats: {
        $ref: '#/$defs/stats',
      },
      profiles: list({
        $ref: '#/$defs/profile',
      }),
    },
    $defs: {
      contactType: {
        enum: ['phone', 'telegram'],
      },
      section: {
        enum: PERSON_MENTION_SECTIONS,
      },
      kind: {
        enum: PERSON_BACKLINK_KINDS,
      },
      nameCases: obj(
        {
          gen: text(1),
          dat: text(1),
          acc: text(1),
          ins: text(1),
          prep: text(1),
        },
        [],
      ),
      contact: obj(
        {
          type: {
            $ref: '#/$defs/contactType',
          },
          value: text(1),
          display: text(1),
          href: uri(),
        },
        ['type', 'value', 'display', 'href'],
      ),
      mention: obj(
        {
          type: {
            enum: ENTITY_MENTION_TYPES,
          },
          slug: text(1),
          name: text(1),
          company: text(1),
          position: text(1),
          html_url: uri(),
          markdown_url: uri(),
        },
        ['type', 'slug', 'name', 'html_url', 'markdown_url'],
      ),
      backlink: obj(
        {
          section: {
            $ref: '#/$defs/section',
          },
          kind: {
            $ref: '#/$defs/kind',
          },
          source_id: text(1),
          title: text(1),
          html_url: uri(),
          markdown_url: uri(),
          excerpt: text(1),
          mentioned_at: dateTime(),
        },
        ['section', 'kind', 'source_id', 'title', 'html_url', 'markdown_url'],
      ),
      backlinks: obj(
        {
          news: list({
            $ref: '#/$defs/backlink',
          }),
          status: list({
            $ref: '#/$defs/backlink',
          }),
          reviews: list({
            $ref: '#/$defs/backlink',
          }),
          places: list({
            $ref: '#/$defs/backlink',
          }),
          people: list({
            $ref: '#/$defs/backlink',
          }),
          contacts: list({
            $ref: '#/$defs/backlink',
          }),
          discomfort: list({
            $ref: '#/$defs/backlink',
          }),
        },
        PERSON_MENTION_SECTIONS,
      ),
      profile: obj(
        {
          id: text(1),
          slug: text(1),
          name: text(1),
          name_cases: {
            $ref: '#/$defs/nameCases',
          },
          company: text(1),
          position: text(1),
          html_url: uri(),
          markdown_url: uri(),
          contacts: list({
            $ref: '#/$defs/contact',
          }),
          body_markdown: text(),
          mentions: list({
            $ref: '#/$defs/mention',
          }),
          mention_count: integer(0),
          backlinks: {
            $ref: '#/$defs/backlinks',
          },
          backlink_count: integer(0),
        },
        [
          'id',
          'slug',
          'name',
          'html_url',
          'markdown_url',
          'contacts',
          'body_markdown',
          'mentions',
          'mention_count',
          'backlinks',
          'backlink_count',
        ],
      ),
      stats: obj(
        {
          profile_count: integer(0),
          mention_count: integer(0),
          backlink_count: integer(0),
        },
        ['profile_count', 'mention_count', 'backlink_count'],
      ),
    },
  };
}

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
