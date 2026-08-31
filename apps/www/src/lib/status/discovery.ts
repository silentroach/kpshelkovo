import { absoluteUrl } from '../site';
import { apiContractLinkHeader } from '../public-surface/api-contract';
import { statusPublicSurfaceSlice } from './public-surface';
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
import {
  STATUS_AREAS,
  STATUS_KINDS,
  STATUS_SERVICE_STATES,
  STATUS_SERVICES,
} from './schema';
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

const flag = (): Record<string, unknown> => ({
  type: 'boolean',
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
    $id: abs(root, statusSchemaPath()),
    title: 'StatusPayload',
    description:
      'Лента раздела /status только для чтения с историей инцидентов, производными сводками сервисов и Markdown-версиями страниц.',
    type: 'object',
    additionalProperties: false,
    required: ['stats', 'active', 'incidents', 'services'],
    properties: {
      stats: {
        $ref: '#/$defs/stats',
      },
      active: list({
        $ref: '#/$defs/incident',
      }),
      incidents: list({
        $ref: '#/$defs/incident',
      }),
      services: list({
        $ref: '#/$defs/serviceSummary',
      }),
    },
    $defs: {
      area: {
        enum: [...STATUS_AREAS],
      },
      service: {
        enum: [...STATUS_SERVICES],
      },
      kind: {
        enum: [...STATUS_KINDS],
      },
      serviceStatus: {
        enum: [...STATUS_SERVICE_STATES],
      },
      phase: {
        enum: ['active', 'resolved', 'scheduled'],
      },
      duration: obj(
        {
          total_minutes: integer(0),
          human: text(1),
        },
        ['total_minutes', 'human'],
      ),
      daysWithoutIncidents: obj(
        {
          mode: {
            enum: ['count', 'active_incident', 'no_incidents'],
          },
          label: text(1),
          days: integer(0),
          last_ended_iso: dateTime(),
        },
        ['mode', 'label'],
      ),
      incidentRef: obj(
        {
          id: text(1),
          title: text(1),
          html_url: uri(),
          markdown_url: uri(),
          phase: {
            $ref: '#/$defs/phase',
          },
          phase_label: text(1),
        },
        ['id', 'title', 'phase', 'phase_label'],
      ),
      incident: obj(
        {
          id: text(1),
          title: text(1),
          service: {
            $ref: '#/$defs/service',
          },
          service_label: text(1),
          kind: {
            $ref: '#/$defs/kind',
          },
          kind_label: text(1),
          year: integer(2000),
          month: {
            type: 'integer',
            minimum: 1,
            maximum: 12,
          },
          slug: text(1),
          html_url: uri(),
          markdown_url: uri(),
          started_at: dateTime(),
          started_has_time: flag(),
          ended_at: dateTime(),
          ended_has_time: flag(),
          is_active: flag(),
          phase: {
            $ref: '#/$defs/phase',
          },
          phase_label: text(1),
          applies_to_all_areas: flag(),
          areas: list({
            $ref: '#/$defs/area',
          }),
          source_url: uri(),
          excerpt: text(1),
          body_markdown: text(),
          duration: {
            $ref: '#/$defs/duration',
          },
        },
        [
          'id',
          'title',
          'service',
          'service_label',
          'kind',
          'kind_label',
          'year',
          'month',
          'slug',
          'started_at',
          'started_has_time',
          'ended_has_time',
          'is_active',
          'phase',
          'phase_label',
          'applies_to_all_areas',
          'areas',
          'body_markdown',
        ],
      ),
      serviceSummary: obj(
        {
          service: {
            $ref: '#/$defs/service',
          },
          service_label: text(1),
          service_status: {
            $ref: '#/$defs/serviceStatus',
          },
          service_status_label: text(1),
          html_url: uri(),
          markdown_url: uri(),
          incident_ids: list(text(1)),
          active_incident_ids: list(text(1)),
          active_maintenance_ids: list(text(1)),
          days_without_incidents: {
            $ref: '#/$defs/daysWithoutIncidents',
          },
          latest_incident: {
            $ref: '#/$defs/incidentRef',
          },
        },
        [
          'service',
          'service_label',
          'service_status',
          'service_status_label',
          'html_url',
          'markdown_url',
          'incident_ids',
          'active_incident_ids',
          'active_maintenance_ids',
          'days_without_incidents',
        ],
      ),
      stats: obj(
        {
          incident_count: integer(0),
          active_count: integer(0),
          active_incident_count: integer(0),
          active_maintenance_count: integer(0),
          service_count: integer(0),
          updated_at: dateTime(),
        },
        [
          'incident_count',
          'active_count',
          'active_incident_count',
          'active_maintenance_count',
          'service_count',
        ],
      ),
    },
  };
}

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
  apiContractLinkHeader(statusPublicSurfaceSlice, root);

export const self = (root: string): string =>
  `<${abs(root, statusApiCatalogPath())}>; rel="api-catalog"; type="application/linkset+json"; profile="${PROFILE}"`;
