import {
  createEntityMentionGraph,
  type EntityMentionSourceRef,
} from '../mentions';
import { createContactMentionRefs } from '../contacts/mentions';
import { createNewsArticleMentionRefs } from '../news/mentions';
import { createPlaceMentionRefs } from '../places/mentions';
import { createReviewMentionRefs } from '../reviews/mentions';
import { createStatusIncidentMentionRefs } from '../status/mentions';
import { createPeopleBacklinksFromGraph } from './backlinks';
import { createPersonProfileMentionRefs } from './mention-refs';
import { loadPeopleData, type PeopleDataset } from './registry';
import type { PersonProfile } from './types';

export {
  buildPeopleDataset,
  loadPeopleData,
  loadPeopleMentionRegistry,
} from './registry';
export type { PeopleDataset, PersonProfileEntry } from './registry';

let graphCache: Promise<PeopleDataset> | undefined;

export const buildPeopleGraphDataset = (
  people: PeopleDataset,
  refs: readonly EntityMentionSourceRef[],
): PeopleDataset => {
  const graph = createEntityMentionGraph(refs);

  const profiles = people.profiles.map((profile) => ({
    ...profile,
    backlinks: createPeopleBacklinksFromGraph(graph, profile),
  }));

  return {
    profiles,
    bySlug: new Map(profiles.map((profile) => [profile.slug, profile])),
    mentionRegistry: people.mentionRegistry,
  };
};

const buildPeopleDataWithBacklinks = async (): Promise<PeopleDataset> => {
  const [
    { loadContactsData },
    { loadNewsData },
    { loadStatusData },
    { loadReviewsData },
    { loadPlacesData },
    people,
  ] = await Promise.all([
    import('../contacts/load'),
    import('../news/load'),
    import('../status/load'),
    import('../reviews/load'),
    import('../places/load'),
    loadPeopleData(),
  ]);
  const [contacts, news, status, reviews, places] = await Promise.all([
    loadContactsData(),
    loadNewsData(),
    loadStatusData(),
    loadReviewsData(),
    loadPlacesData(),
  ]);
  const refs = [
    ...contacts.contacts.flatMap((contact) =>
      contact.hasDetailPage ? createContactMentionRefs(contact) : [],
    ),
    ...news.articles.flatMap(createNewsArticleMentionRefs),
    ...status.incidents.flatMap(createStatusIncidentMentionRefs),
    ...reviews.reviews.flatMap(createReviewMentionRefs),
    ...places.places.flatMap(createPlaceMentionRefs),
    ...people.profiles.flatMap(createPersonProfileMentionRefs),
  ];

  return buildPeopleGraphDataset(people, refs);
};

export const loadPeopleDataWithBacklinks = (): Promise<PeopleDataset> => {
  graphCache ??= buildPeopleDataWithBacklinks();

  return graphCache;
};

export const loadPeopleProfiles = async (): Promise<readonly PersonProfile[]> =>
  (await loadPeopleData()).profiles;

export const loadPeopleProfilesWithBacklinks = async (): Promise<
  readonly PersonProfile[]
> => (await loadPeopleDataWithBacklinks()).profiles;

export const loadPersonProfile = async (
  slug: string,
): Promise<PersonProfile | undefined> => {
  const key = slug.trim();

  return key ? (await loadPeopleData()).bySlug.get(key) : undefined;
};

export const loadPersonProfileWithBacklinks = async (
  slug: string,
): Promise<PersonProfile | undefined> => {
  const key = slug.trim();

  return key
    ? (await loadPeopleDataWithBacklinks()).bySlug.get(key)
    : undefined;
};
