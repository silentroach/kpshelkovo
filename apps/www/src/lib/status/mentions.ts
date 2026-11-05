import { dateTimeFromISO } from '@shelkovo/format';

import { createEntityMentionSourceRefs } from '../mentions';
import type { EntityMentionSourceRef } from '../mentions';
import { statusCalendarDayUrl, statusCalendarMonthMarkdownUrl } from './routes';
import type { StatusIncident } from './types';

export const createStatusIncidentMentionRefs = (
  incident: StatusIncident
): readonly EntityMentionSourceRef[] => {
  const started = dateTimeFromISO(incident.started.iso);
  const calendarDay = {
    year: started.year,
    month: started.month,
    id: started.toFormat('yyyy-MM-dd')
  };
  const source = {
    source: {
      section: 'status' as const,
      kind: 'incident' as const,
      id: incident.id
    },
    title: incident.title,
    htmlUrl: incident.hasPage ? incident.url : statusCalendarDayUrl(calendarDay),
    markdownUrl: incident.hasPage
      ? incident.markdownUrl
      : statusCalendarMonthMarkdownUrl(calendarDay),
    excerpt: incident.excerpt,
    mentionedAt: incident.started.iso,
    sortKey: incident.sortLastChangeAt
  };
  const refs = createEntityMentionSourceRefs(incident.hasPage ? incident.mentions : [], source);
  const mentionedPlaces = new Set(
    refs.filter((ref) => ref.target.type === 'place').map((ref) => ref.target.slug)
  );
  const affectedRefs: EntityMentionSourceRef[] = [];
  for (const slug of incident.affectedPlaces ?? []) {
    if (mentionedPlaces.has(slug)) {
      continue;
    }
    mentionedPlaces.add(slug);
    affectedRefs.push({ target: { type: 'place', slug }, ...source });
  }
  return [...refs, ...affectedRefs];
};
