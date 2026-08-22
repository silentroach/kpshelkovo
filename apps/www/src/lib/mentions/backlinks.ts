import { getEntityMentionGraphRefs } from './graph';
import {
  SITE_BACKLINK_KINDS,
  SITE_MENTION_SECTIONS,
  type EntityMentionEntityRef,
  type EntityMentionGraph,
  type EntityMentionSourceRef,
  type SiteBacklinkKind,
  type SiteBacklinks,
  type SiteMentionRef,
  type SiteMentionSection,
} from './types';

const SITE_MENTION_SECTION_SET = new Set<string>(SITE_MENTION_SECTIONS);
const SITE_BACKLINK_KIND_SET = new Set<string>(SITE_BACKLINK_KINDS);

const isSiteMentionSection = (value: string): value is SiteMentionSection =>
  SITE_MENTION_SECTION_SET.has(value);

const isSiteBacklinkKind = (value: string): value is SiteBacklinkKind =>
  SITE_BACKLINK_KIND_SET.has(value);

const toSiteBacklink = (
  ref: EntityMentionSourceRef,
): SiteMentionRef | undefined => {
  if (
    !isSiteMentionSection(ref.source.section) ||
    !isSiteBacklinkKind(ref.source.kind)
  ) {
    return undefined;
  }

  return {
    section: ref.source.section,
    kind: ref.source.kind,
    sourceId: ref.source.id,
    title: ref.title,
    htmlUrl: ref.htmlUrl,
    markdownUrl: ref.markdownUrl,
    excerpt: ref.excerpt,
    mentionedAt: ref.mentionedAt,
    sortKey: ref.sortKey,
  };
};

const sectionBacklinks = (
  graph: EntityMentionGraph,
  target: EntityMentionEntityRef,
  section: SiteMentionSection,
): readonly SiteMentionRef[] =>
  getEntityMentionGraphRefs(graph, target.type, target.slug, section).flatMap(
    (ref) => {
      const backlink = toSiteBacklink(ref);

      return backlink ? [backlink] : [];
    },
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
  discomfort: sectionBacklinks(graph, target, 'discomfort'),
});
