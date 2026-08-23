import type { EntityMentionGraph } from '../mentions';
import { loadSiteMentionGraph } from '../site-mention-graph';
import { createPeopleBacklinksFromGraph } from './backlinks';
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
  graph: EntityMentionGraph,
): PeopleDataset => {
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
  const [people, graph] = await Promise.all([
    loadPeopleData(),
    loadSiteMentionGraph(),
  ]);

  return buildPeopleGraphDataset(people, graph);
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
