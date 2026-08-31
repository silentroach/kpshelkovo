import { z } from 'zod';

import {
  publicDateTimeSchema,
  publicUriSchema,
} from '@/lib/public-schema-formats';
import {
  STATUS_AREAS,
  STATUS_KINDS,
  STATUS_SERVICES,
  STATUS_SERVICE_STATES,
} from './schema';

type DeepReadonly<T> = T extends readonly unknown[]
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T extends object
    ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
    : T;

type StatusPublicDto<T extends z.ZodType> = DeepReadonly<z.infer<T>>;

// z.int() would add a safe-integer maximum absent from the public contract.
const integer = (minimum = 0) =>
  z.number().min(minimum).refine(Number.isInteger).meta({ type: 'integer' });

const areaSchema = z.enum(STATUS_AREAS).meta({ id: 'area' });
const serviceSchema = z.enum(STATUS_SERVICES).meta({ id: 'service' });
const kindSchema = z.enum(STATUS_KINDS).meta({ id: 'kind' });
const serviceStatusSchema = z
  .enum(STATUS_SERVICE_STATES)
  .meta({ id: 'serviceStatus' });
const phaseSchema = z
  .enum(['active', 'resolved', 'scheduled'])
  .meta({ id: 'phase' });

const durationSchema = z
  .strictObject({
    total_minutes: integer(),
    human: z.string().min(1),
  })
  .meta({ id: 'duration' });

const daysWithoutIncidentsSchema = z
  .strictObject({
    mode: z.enum(['count', 'active_incident', 'no_incidents']),
    label: z.string().min(1),
    days: integer().optional(),
    last_ended_iso: publicDateTimeSchema().optional(),
  })
  .meta({ id: 'daysWithoutIncidents' });

const incidentRefSchema = z
  .strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    html_url: publicUriSchema().optional(),
    markdown_url: publicUriSchema().optional(),
    phase: phaseSchema,
    phase_label: z.string().min(1),
  })
  .meta({ id: 'incidentRef' });

const incidentSchema = z
  .strictObject({
    id: z.string().min(1),
    title: z.string().min(1),
    service: serviceSchema,
    service_label: z.string().min(1),
    kind: kindSchema,
    kind_label: z.string().min(1),
    year: integer(2000),
    month: integer(1).max(12),
    slug: z.string().min(1),
    html_url: publicUriSchema().optional(),
    markdown_url: publicUriSchema().optional(),
    started_at: publicDateTimeSchema(),
    started_has_time: z.boolean(),
    ended_at: publicDateTimeSchema().optional(),
    ended_has_time: z.boolean(),
    is_active: z.boolean(),
    phase: phaseSchema,
    phase_label: z.string().min(1),
    applies_to_all_areas: z.boolean(),
    areas: z.array(areaSchema),
    source_url: publicUriSchema().optional(),
    excerpt: z.string().min(1).optional(),
    body_markdown: z.string(),
    duration: durationSchema.optional(),
  })
  .meta({ id: 'incident' });

const serviceSummarySchema = z
  .strictObject({
    service: serviceSchema,
    service_label: z.string().min(1),
    service_status: serviceStatusSchema,
    service_status_label: z.string().min(1),
    html_url: publicUriSchema(),
    markdown_url: publicUriSchema(),
    incident_ids: z.array(z.string().min(1)),
    active_incident_ids: z.array(z.string().min(1)),
    active_maintenance_ids: z.array(z.string().min(1)),
    days_without_incidents: daysWithoutIncidentsSchema,
    latest_incident: incidentRefSchema.optional(),
  })
  .meta({ id: 'serviceSummary' });

const statsSchema = z
  .strictObject({
    incident_count: integer(),
    active_count: integer(),
    active_incident_count: integer(),
    active_maintenance_count: integer(),
    service_count: integer(),
    updated_at: publicDateTimeSchema().optional(),
  })
  .meta({ id: 'stats' });

export const statusPublicPayloadSchema = z
  .strictObject({
    stats: statsSchema,
    active: z.array(incidentSchema),
    incidents: z.array(incidentSchema),
    services: z.array(serviceSummarySchema),
  })
  .meta({
    title: 'StatusPayload',
    description:
      'Лента раздела /status только для чтения с историей инцидентов, производными сводками сервисов и Markdown-версиями страниц.',
  });

export type StatusPublicIncidentPhase = StatusPublicDto<typeof phaseSchema>;
export type StatusPublicDaysWithoutIncidentsMode = StatusPublicDto<
  typeof daysWithoutIncidentsSchema
>['mode'];
export type StatusPublicDurationDto = StatusPublicDto<typeof durationSchema>;
export type StatusPublicDaysWithoutIncidentsDto = StatusPublicDto<
  typeof daysWithoutIncidentsSchema
>;
export type StatusPublicIncidentRefDto = StatusPublicDto<
  typeof incidentRefSchema
>;
export type StatusPublicIncidentDto = StatusPublicDto<typeof incidentSchema>;
export type StatusPublicServiceSummaryDto = StatusPublicDto<
  typeof serviceSummarySchema
>;
export type StatusPublicPayloadDto = StatusPublicDto<
  typeof statusPublicPayloadSchema
>;

export const buildStatusPublicJsonSchema = (
  id: string,
): Record<string, unknown> =>
  z.toJSONSchema(statusPublicPayloadSchema, {
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema === statusPublicPayloadSchema) {
        jsonSchema.$id = id;
      }
    },
  });
