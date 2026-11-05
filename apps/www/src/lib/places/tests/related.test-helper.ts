import { mapRawStatusIncident } from '@/lib/status/mapper';
import { createStatusIncidentMentionRefs } from '@/lib/status/mentions';
import { RawStatusIncidentSchema } from '@/lib/status/raw-schema';
import type { StatusIncident } from '@/lib/status/types';

import { createPlaceMentionTarget } from '../mentions';
import type { PlaceMentionRef, PlaceWithBacklinks } from '../types';
import { testPlace } from './place.test-helper';

export const relatedNow = new Date('2026-11-05T12:00:00+03:00');

export const testRelatedStatus = (
  id: string,
  data: Readonly<Record<string, unknown>>,
  body = ''
): StatusIncident =>
  mapRawStatusIncident(
    {
      id: `2026/11/${id}`,
      body,
      data: RawStatusIncidentSchema.parse({
        title: id,
        kind: 'maintenance',
        service: 'dam',
        started_at: '05.11.2026 10:00',
        affected_places: ['club'],
        ...data
      })
    },
    {
      now: relatedNow,
      mentionRegistry: new Map([['club', createPlaceMentionTarget('club', 'Клуб')]])
    }
  );

export const statusBacklink = (incident: StatusIncident): PlaceMentionRef => {
  const ref = createStatusIncidentMentionRefs(incident)[0];
  if (!ref) throw new Error('Expected status place ref');
  return {
    section: ref.source.section,
    kind: ref.source.kind,
    sourceId: ref.source.id,
    title: ref.title,
    htmlUrl: ref.htmlUrl,
    markdownUrl: ref.markdownUrl,
    mentionedAt: ref.mentionedAt,
    sortKey: ref.sortKey,
    excerpt: ref.excerpt
  };
};

export const testRelatedPlace = (
  incidents: readonly StatusIncident[] = []
): PlaceWithBacklinks => ({
  ...testPlace(),
  backlinks: {
    news: [],
    events: [],
    status: incidents.map(statusBacklink),
    kb: [],
    reviews: [],
    places: [],
    people: [],
    contacts: []
  }
});
