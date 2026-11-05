import {
  createSiteBacklinksFromGraph,
  type EntityMentionGraph,
  type SiteMentionRef
} from '../mentions';
import type { PersonBacklinks, PersonMentionRef, PersonProfile } from './types';

const personRefs = (refs: readonly SiteMentionRef[]): readonly PersonMentionRef[] =>
  refs.filter((ref): ref is PersonMentionRef => ref.section !== 'kb' && ref.kind !== 'guide');

export const createPeopleBacklinksFromGraph = (
  graph: EntityMentionGraph,
  profile: Pick<PersonProfile, 'slug'>
): PersonBacklinks => {
  const backlinks = createSiteBacklinksFromGraph(graph, {
    type: 'person',
    slug: profile.slug
  });

  return {
    news: personRefs(backlinks.news),
    events: personRefs(backlinks.events),
    status: personRefs(backlinks.status),
    reviews: personRefs(backlinks.reviews),
    places: personRefs(backlinks.places),
    people: personRefs(backlinks.people),
    contacts: personRefs(backlinks.contacts)
  };
};
