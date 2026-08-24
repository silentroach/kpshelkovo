import { preprocessSiteMarkdownContent } from '../markdown/render';
import type { SiteMentionRegistry } from '../mentions';
import {
  statusIncidentCanonical,
  statusIncidentMarkdownUrl,
  statusIncidentUrl,
} from './routes';
import {
  parseStatusTimestamp,
  STATUS_AREAS,
  type StatusArea,
  type StatusKind,
  type StatusService,
} from './schema';
import type { RawStatusIncident } from './raw-schema';
import type { StatusDuration, StatusIncident } from './types';
import { deriveStatusIncidentTitle, extractStatusExcerpt } from './view';

interface EntryParts {
  readonly year: string;
  readonly month: string;
  readonly slug: string;
}

interface RawStatusIncidentInput {
  readonly id: string;
  readonly data: RawStatusIncident;
  readonly body?: string;
}

interface MapRawStatusIncidentOptions {
  readonly now: Date;
  readonly mentionRegistry: SiteMentionRegistry;
}

const parseEntryTimestamp = (
  value: string,
  context: string,
  expected?: { readonly year: string; readonly month: string },
): NonNullable<ReturnType<typeof parseStatusTimestamp>> => {
  const timestamp = parseStatusTimestamp(value);

  if (!timestamp) {
    throw new Error(
      `${context} must use dd.mm.yyyy, dd.mm.yyyy hh:mm, or YYYY-MM-DD`,
    );
  }

  if (
    expected &&
    (timestamp.year !== expected.year || timestamp.month !== expected.month)
  ) {
    throw new Error(
      `${context} ${timestamp.iso} must match ${expected.year}/${expected.month}`,
    );
  }

  return timestamp;
};

const incidentParts = (entry: RawStatusIncidentInput): EntryParts => {
  const parts = entry.id.split('/');

  if (parts.length !== 3) {
    throw new Error(`status incident id "${entry.id}" must use YYYY/MM/[slug]`);
  }

  return {
    year: parts[0],
    month: parts[1],
    slug: parts[2],
  };
};

const mapRawStatusAreas = (
  values: readonly StatusArea[] | undefined,
): {
  readonly appliesToAllAreas: boolean;
  readonly areas: readonly StatusArea[];
} => {
  if (!values?.length) {
    return {
      appliesToAllAreas: true,
      areas: STATUS_AREAS.map(mapRawStatusArea),
    };
  }

  return {
    appliesToAllAreas: false,
    areas: values.map(mapRawStatusArea),
  };
};

const isActive = (now: Date, start: Date, end?: Date): boolean =>
  start.valueOf() <= now.valueOf() &&
  (end === undefined || end.valueOf() > now.valueOf());

const duration = (start: Date, end: Date): StatusDuration => ({
  totalMinutes: Math.max(
    0,
    Math.round((end.valueOf() - start.valueOf()) / 60000),
  ),
});

export const mapRawStatusService = (value: StatusService): StatusService => {
  switch (value) {
    case 'electricity':
      return 'electricity';
    case 'water':
      return 'water';
    case 'internet':
      return 'internet';
    case 'dam':
      return 'dam';
  }
};

export const mapRawStatusKind = (value: StatusKind): StatusKind => {
  switch (value) {
    case 'incident':
      return 'incident';
    case 'maintenance':
      return 'maintenance';
  }
};

export const mapRawStatusArea = (value: StatusArea): StatusArea => {
  switch (value) {
    case 'river':
      return 'river';
    case 'forest':
      return 'forest';
    case 'park':
      return 'park';
    case 'village':
      return 'village';
  }
};

export const mapRawStatusIncident = (
  entry: RawStatusIncidentInput,
  opts: MapRawStatusIncidentOptions,
): StatusIncident => {
  const parts = incidentParts(entry);
  const started = parseEntryTimestamp(
    entry.data.started_at,
    `status incident "${entry.id}" started_at`,
    {
      year: parts.year,
      month: parts.month,
    },
  );
  const ended = entry.data.ended_at
    ? parseEntryTimestamp(
        entry.data.ended_at,
        `status incident "${entry.id}" ended_at`,
      )
    : undefined;

  if (ended && ended.at.valueOf() < started.at.valueOf()) {
    throw new Error(
      `status incident "${entry.id}" ended_at cannot be earlier than started_at`,
    );
  }

  const service = mapRawStatusService(entry.data.service);
  const kind = mapRawStatusKind(entry.data.kind);
  const area = mapRawStatusAreas(entry.data.areas);
  const body = preprocessSiteMarkdownContent(
    entry.body ?? '',
    `status incident "${entry.id}" body`,
    opts.mentionRegistry,
  );
  const changeAt = ended?.at ?? started.at;
  const incident = {
    id: entry.id,
    title: entry.data.title ?? deriveStatusIncidentTitle({ kind, service }),
    seo: entry.data.seo,
    service,
    kind,
    year: Number(parts.year),
    month: Number(parts.month),
    slug: parts.slug,
    started: {
      at: started.at,
      iso: started.iso,
      hasTime: started.has_time,
    },
    ...(ended
      ? {
          ended: {
            at: ended.at,
            iso: ended.iso,
            hasTime: ended.has_time,
          },
        }
      : {}),
    isActive: isActive(opts.now, started.at, ended?.at),
    appliesToAllAreas: area.appliesToAllAreas,
    areas: area.areas,
    sourceUrl: entry.data.source_url,
    excerpt: body.markdown ? extractStatusExcerpt(body.markdown) : undefined,
    body: body.markdown,
    mentions: body.mentions,
    sortStartedAt: started.at.valueOf(),
    sortLastChangeAt: changeAt.valueOf(),
    duration: ended ? duration(started.at, ended.at) : undefined,
  };

  if (!body.markdown) {
    return {
      ...incident,
      hasPage: false,
    };
  }

  return {
    ...incident,
    hasPage: true,
    url: statusIncidentUrl(parts),
    markdownUrl: statusIncidentMarkdownUrl(parts),
    canonical: statusIncidentCanonical(parts),
  };
};
