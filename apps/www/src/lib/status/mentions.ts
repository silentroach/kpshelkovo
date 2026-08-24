import { createEntityMentionSourceRefs } from '../mentions';
import type { EntityMentionSourceRef } from '../mentions';
import type { StatusIncidentWithDetail } from './types';

type StatusIncidentMentionRefSource = Pick<
  StatusIncidentWithDetail,
  | 'id'
  | 'title'
  | 'url'
  | 'markdownUrl'
  | 'excerpt'
  | 'mentions'
  | 'started'
  | 'sortLastChangeAt'
>;

export const createStatusIncidentMentionRefs = (
  incident: StatusIncidentMentionRefSource,
): readonly EntityMentionSourceRef[] =>
  createEntityMentionSourceRefs(incident.mentions, {
    source: {
      section: 'status',
      kind: 'incident',
      id: incident.id,
    },
    title: incident.title,
    htmlUrl: incident.url,
    markdownUrl: incident.markdownUrl,
    excerpt: incident.excerpt,
    mentionedAt: incident.started.iso,
    sortKey: incident.sortLastChangeAt,
  });
