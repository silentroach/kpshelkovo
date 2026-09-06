import { z } from 'zod';

import { ComparePublicPayloadSchema } from './public-schema';

export const FEED = '/data/settlements.json';
export const EXPLORER = '/data/explorer.json';
export const SCHEMA = '/schemas/settlements.schema.json';
export const OPENAPI = '/openapi/settlements.openapi.json';
export const CATALOG = '/.well-known/api-catalog';
export const PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
export const OAS = 'application/vnd.oai.openapi+json';

const PAYLOAD_COMPONENT = 'SettlementsPayload';

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const star = (
  value: string,
): readonly { readonly value: string; readonly language: 'ru' }[] => [
  { value, language: 'ru' },
];

const server = (root: string): string => root.replace(/\/$/, '');

function rebaseLocalRefs(value: unknown, schemaRef: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rebaseLocalRefs(item, schemaRef));
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

      return [key, rebaseLocalRefs(entry, schemaRef)];
    }),
  );
}

export function schema(root: string): Record<string, unknown> {
  return {
    ...z.toJSONSchema(ComparePublicPayloadSchema, {
      target: 'draft-2020-12',
    }),
    $id: abs(root, SCHEMA),
  };
}

export function openapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${PAYLOAD_COMPONENT}`;
  const body = Object.fromEntries(
    Object.entries(schema(root)).filter(
      ([key]) => key !== '$schema' && key !== '$id',
    ),
  );

  return {
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    info: {
      title: 'Сравнение поселков: лента данных',
      version: '1.0.0',
      description:
        'OpenAPI-описание полной ленты поселков только для чтения с вычисленными расстояниями, пригодное для автоматического обнаружения.',
    },
    servers: [
      {
        url: server(root),
      },
    ],
    paths: {
      [FEED]: {
        get: {
          operationId: 'getSettlements',
          summary: 'Получить полную ленту поселков',
          description:
            'Возвращает полную ленту поселков с детальными полями, расстояниями, рейтингом, статистикой и сравнениями.',
          responses: {
            200: {
              description: 'Полная лента поселков',
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
        [PAYLOAD_COMPONENT]: rebaseLocalRefs(body, schemaRef),
      },
    },
  };
}

export function catalog(root: string): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: abs(root, '/'),
        item: [
          {
            href: abs(root, '/index.md'),
            type: 'text/markdown',
            'title*': star('Markdown-версия сравнения поселков'),
          },
          {
            href: abs(root, '/rating/index.md'),
            type: 'text/markdown',
            'title*': star('Markdown-версия методики рейтинга'),
          },
          {
            href: abs(root, FEED),
            type: 'application/json',
            'title*': star('Полная машиночитаемая лента поселков'),
          },
          {
            href: abs(root, EXPLORER),
            type: 'application/json',
            'title*': star('Облегченная лента explorer для списка и карты'),
          },
          {
            href: abs(root, '/llms.txt'),
            type: 'text/plain',
            'title*': star('Короткий обзор llms.txt'),
          },
          {
            href: abs(root, '/llms-full.txt'),
            type: 'text/plain',
            'title*': star('Подробный обзор llms-full.txt'),
          },
          {
            href: abs(root, '/.well-known/agent-skills/index.json'),
            type: 'application/json',
            'title*': star(
              'Индекс инструкций для автоматического чтения сравнения поселков',
            ),
          },
        ],
        'service-desc': [
          {
            href: abs(root, SCHEMA),
            type: 'application/schema+json',
            'title*': star('JSON Schema полной ленты'),
          },
          {
            href: abs(root, OPENAPI),
            type: OAS,
            'title*': star('OpenAPI полной ленты'),
          },
        ],
      },
    ],
  };
}

export function links(root: string): string {
  return [
    `<${abs(root, SCHEMA)}>; rel="service-desc"; type="application/schema+json"`,
    `<${abs(root, OPENAPI)}>; rel="service-desc"; type="${OAS}"`,
    `<${abs(root, CATALOG)}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`,
  ].join(', ');
}

export function self(root: string): string {
  return `<${abs(root, CATALOG)}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
}
