import { padNumber } from '@shelkovo/format';

import type { StatusService } from './schema';
import { canon, withBase } from '../site';

const STATUS_ROOT = '/status/';
const STATUS_HISTORY = '/status/history/';
const STATUS_MARKDOWN = '/status/index.md';
const STATUS_INCIDENTS_ROOT = '/status/incidents/';
const STATUS_DATA = '/status/data/status.json';
const STATUS_FEED = '/status/feed.xml';
const STATUS_LLMS = '/status/llms.txt';
const STATUS_LLMS_FULL = '/status/llms-full.txt';
const STATUS_API_CATALOG = '/status/.well-known/api-catalog';
const STATUS_SCHEMA = '/status/schemas/status.schema.json';
const STATUS_OPENAPI = '/status/openapi/status.openapi.json';

export interface StatusIncidentRouteInput {
  readonly year: number | string;
  readonly month: number | string;
  readonly slug: string;
}

const need = (value: string, name: string): string => {
  const text = value.trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
};

export const statusPath = (): string => STATUS_ROOT;

export const statusMarkdownPath = (): string => STATUS_MARKDOWN;

export const statusDataPath = (): string => STATUS_DATA;

export const statusFeedPath = (): string => STATUS_FEED;

export const statusLlmsPath = (): string => STATUS_LLMS;

export const statusLlmsFullPath = (): string => STATUS_LLMS_FULL;

export const statusApiCatalogPath = (): string => STATUS_API_CATALOG;

export const statusSchemaPath = (): string => STATUS_SCHEMA;

export const statusOpenApiPath = (): string => STATUS_OPENAPI;

export const statusServicePath = (service: StatusService): string =>
  `${STATUS_ROOT}${service}/`;

export const statusIncidentPath = (input: StatusIncidentRouteInput): string =>
  `${STATUS_INCIDENTS_ROOT}${padNumber(input.year, 4)}/${padNumber(input.month, 2)}/${need(input.slug, 'slug')}/`;

export const statusServicePattern = (): string => '/status/:service/';

export const statusServiceMarkdownPattern = (): string =>
  '/status/:service/index.md';

export const statusIncidentPattern = (): string =>
  '/status/incidents/:year/:month/:entry/';

export const statusIncidentMarkdownPattern = (): string =>
  '/status/incidents/:year/:month/:entry/index.md';

export const statusUrl = (): string => withBase(STATUS_ROOT);

export const statusHistoryUrl = (): string => withBase(STATUS_HISTORY);

export const statusMarkdownUrl = (): string => withBase(STATUS_MARKDOWN);

export const statusDataUrl = (): string => withBase(STATUS_DATA);

export const statusFeedUrl = (): string => withBase(STATUS_FEED);

export const statusLlmsUrl = (): string => withBase(STATUS_LLMS);

export const statusLlmsFullUrl = (): string => withBase(STATUS_LLMS_FULL);

export const statusApiCatalogUrl = (): string => withBase(STATUS_API_CATALOG);

export const statusSchemaUrl = (): string => withBase(STATUS_SCHEMA);

export const statusOpenApiUrl = (): string => withBase(STATUS_OPENAPI);

export const statusServiceUrl = (service: StatusService): string =>
  withBase(statusServicePath(service));

export const statusServiceMarkdownUrl = (service: StatusService): string =>
  withBase(`${statusServicePath(service)}index.md`);

export const statusCanonical = (): string => canon(STATUS_ROOT);

export const statusServiceCanonical = (service: StatusService): string =>
  canon(statusServicePath(service));

export const statusIncidentUrl = (input: StatusIncidentRouteInput): string =>
  withBase(statusIncidentPath(input));

export const statusIncidentMarkdownUrl = (
  input: StatusIncidentRouteInput,
): string => withBase(`${statusIncidentPath(input)}index.md`);

export const statusIncidentCanonical = (
  input: StatusIncidentRouteInput,
): string => canon(statusIncidentPath(input));
