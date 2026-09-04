import { preprocessSiteMarkdownContent } from '../markdown/render';
import type { SiteMentionRegistry } from '../mentions';
import {
  statusIncidentCanonical,
  statusIncidentMarkdownUrl,
  statusIncidentUrl,
} from './routes';
import {
  STATUS_AREAS,
  type StatusArea,
  type StatusKind,
  type StatusService,
} from './schema';
import type { RawStatusIncident } from './raw-schema';
import type { StatusDuration, StatusIncident } from './types';
import { deriveStatusIncidentTitle, extractStatusExcerpt } from './view';
import { resolveStatusIncidentState } from './lifecycle';

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
    case 'roads':
      return 'roads';
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
  const started = entry.data.started_at;
  const ended = entry.data.ended_at;

  if (started.year !== parts.year || started.month !== parts.month) {
    throw new Error(
      `status incident "${entry.id}" started_at ${started.iso} must match ${parts.year}/${parts.month}`,
    );
  }

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
  const state = resolveStatusIncidentState(
    {
      kind,
      service,
      startedAt: started.at.valueOf(),
      endedAt: ended?.at.valueOf(),
    },
    opts.now.valueOf(),
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
      hasTime: started.hasTime,
    },
    ...(ended
      ? {
          ended: {
            at: ended.at,
            iso: ended.iso,
            hasTime: ended.hasTime,
          },
        }
      : {}),
    phase: state.phase,
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
