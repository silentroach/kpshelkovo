import {
  getEntityMentionGraphRefs,
  type EntityMentionGraph,
  type EntityMentionSourceRef,
} from '../mentions';
import { PERSON_BACKLINK_KINDS, PERSON_MENTION_SECTIONS } from './schema';
import type {
  PersonBacklinkKind,
  PersonBacklinks,
  PersonMentionRef,
  PersonMentionSection,
  PersonProfile,
} from './types';

const PERSON_MENTION_SECTION_SET = new Set<string>(PERSON_MENTION_SECTIONS);
const PERSON_BACKLINK_KIND_SET = new Set<string>(PERSON_BACKLINK_KINDS);

const isPersonMentionSection = (value: string): value is PersonMentionSection =>
  PERSON_MENTION_SECTION_SET.has(value);

const isPersonBacklinkKind = (value: string): value is PersonBacklinkKind =>
  PERSON_BACKLINK_KIND_SET.has(value);

const toPeopleBacklink = (
  ref: EntityMentionSourceRef,
): PersonMentionRef | undefined => {
  if (
    !isPersonMentionSection(ref.source.section) ||
    !isPersonBacklinkKind(ref.source.kind)
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

const toPeopleBacklinks = (
  refs: readonly EntityMentionSourceRef[],
): readonly PersonMentionRef[] =>
  refs.flatMap((ref) => {
    const backlink = toPeopleBacklink(ref);

    return backlink ? [backlink] : [];
  });

export const createPeopleBacklinksFromGraph = (
  graph: EntityMentionGraph,
  profile: Pick<PersonProfile, 'slug'>,
): PersonBacklinks => ({
  news: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'news'),
  ),
  status: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'status'),
  ),
  reviews: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'reviews'),
  ),
  places: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'places'),
  ),
  people: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'people'),
  ),
  contacts: toPeopleBacklinks(
    getEntityMentionGraphRefs(graph, 'person', profile.slug, 'contacts'),
  ),
});
