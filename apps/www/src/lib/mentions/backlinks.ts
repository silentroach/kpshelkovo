import { getEntityMentionGraphRefs } from './graph';
import {
  type EntityMentionEntityRef,
  type EntityMentionGraph,
  type EntityMentionSourceRef,
  type SiteBacklinks,
  type SiteMentionRef,
  type SiteMentionSection,
} from './types';

const toSiteBacklink = (ref: EntityMentionSourceRef): SiteMentionRef => ({
  section: ref.source.section,
  kind: ref.source.kind,
  sourceId: ref.source.id,
  title: ref.title,
  htmlUrl: ref.htmlUrl,
  markdownUrl: ref.markdownUrl,
  excerpt: ref.excerpt,
  mentionedAt: ref.mentionedAt,
  sortKey: ref.sortKey,
});

const sectionBacklinks = (
  graph: EntityMentionGraph,
  target: EntityMentionEntityRef,
  section: SiteMentionSection,
): readonly SiteMentionRef[] =>
  getEntityMentionGraphRefs(graph, target.type, target.slug, section).map(
    toSiteBacklink,
  );

export const createSiteBacklinksFromGraph = (
  graph: EntityMentionGraph,
  target: EntityMentionEntityRef,
): SiteBacklinks => ({
  news: sectionBacklinks(graph, target, 'news'),
  status: sectionBacklinks(graph, target, 'status'),
  reviews: sectionBacklinks(graph, target, 'reviews'),
  places: sectionBacklinks(graph, target, 'places'),
  people: sectionBacklinks(graph, target, 'people'),
  contacts: sectionBacklinks(graph, target, 'contacts'),
});
