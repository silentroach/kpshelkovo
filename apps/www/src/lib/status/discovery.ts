import { absoluteUrl } from '../site';
import {
  statusApiCatalogPath,
  statusDataPath,
  statusFeedPath,
  statusLlmsFullPath,
  statusLlmsPath,
  statusMarkdownUrl,
  statusOpenApiPath,
  statusPath,
  statusSchemaPath,
} from './routes';
import { buildStatusPublicJsonSchema } from './public-schema';
export { buildStatusPublicPayload as buildStatusPayload } from './public-dto';
export type {
  StatusPublicDaysWithoutIncidentsDto as StatusDiscoveryDaysWithoutIncidents,
  StatusPublicDurationDto as StatusDiscoveryDuration,
  StatusPublicIncidentDto as StatusDiscoveryIncident,
  StatusPublicIncidentPhase as StatusDiscoveryIncidentPhase,
  StatusPublicIncidentRefDto as StatusDiscoveryIncidentRef,
  StatusPublicPayloadDto as StatusDiscoveryPayload,
  StatusPublicServiceSummaryDto as StatusDiscoveryServiceSummary,
} from './public-dto';

export const PROFILE = 'https://www.rfc-editor.org/info/rfc9727';
export const OAS = 'application/vnd.oai.openapi+json';

const STATUS_PAYLOAD_SCHEMA = 'StatusPayload';

const abs = (root: string, path: string): string =>
  new URL(path.replace(/^\//, ''), `${root}/`).toString();

const fullUrl = (value: string): string => absoluteUrl(value);

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
  buildStatusPublicJsonSchema(abs(root, statusSchemaPath()));

export function openapi(root: string): Record<string, unknown> {
  const schemaRef = `#/components/schemas/${STATUS_PAYLOAD_SCHEMA}`;
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
      title: 'Шелково Status Feed',
      version: '1.0.0',
      description:
        'OpenAPI-описание /status/data/status.json только для чтения с историей инцидентов и производными сводками сервисов.',
    },
    servers: [
      {
        url: server(root),
      },
    ],
    paths: {
      [statusDataPath()]: {
        get: {
          operationId: 'getStatusFeed',
          summary: 'Получить полную ленту статуса',
          description:
            'Возвращает основную структурированную ленту раздела /status с активными и историческими инцидентами, а также производными сводками по сервисам.',
          responses: {
            200: {
              description: 'Полная лента статуса',
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
        [STATUS_PAYLOAD_SCHEMA]: componentBody,
      },
    },
  };
}

export function catalog(root: string): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: abs(root, statusPath()),
        item: [
          {
            href: abs(root, statusDataPath()),
            type: 'application/json',
            'title*': star('Основная машиночитаемая лента раздела /status'),
          },
          {
            href: abs(root, statusFeedPath()),
            type: 'application/rss+xml',
            'title*': star('RSS-лента статуса'),
          },
          {
            href: fullUrl(statusMarkdownUrl()),
            type: 'text/markdown',
            'title*': star('Markdown-версия раздела /status'),
          },
          {
            href: abs(root, statusLlmsPath()),
            type: 'text/plain',
            'title*': star('Короткий обзор llms.txt'),
          },
          {
            href: abs(root, statusLlmsFullPath()),
            type: 'text/plain',
            'title*': star('Подробный обзор llms-full.txt'),
          },
        ],
        'service-desc': [
          {
            href: abs(root, statusSchemaPath()),
            type: 'application/schema+json',
            'title*': star('JSON Schema ленты статуса'),
          },
          {
            href: abs(root, statusOpenApiPath()),
            type: OAS,
            'title*': star('OpenAPI ленты статуса'),
          },
        ],
      },
    ],
  };
}

export const links = (root: string): string =>
  [
    `<${abs(root, statusSchemaPath())}>; rel="service-desc"; type="application/schema+json"`,
    `<${abs(root, statusOpenApiPath())}>; rel="service-desc"; type="${OAS}"`,
    `<${abs(root, statusApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`,
  ].join(', ');

export const self = (root: string): string =>
  `<${abs(root, statusApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
