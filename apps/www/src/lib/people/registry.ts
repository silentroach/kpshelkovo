import type { CollectionEntry } from 'astro:content';

import { compareRuText } from '@shelkovo/format';

import type { SiteMentionRegistry } from '../mentions';
import { loadSiteMentionRegistry } from '../mentions/registry';
import { mapRawPersonMentionTarget, mapRawPersonProfile } from './mapper';
import type { PeopleMentionRegistry } from './mentions';
import type { PeopleDataset, PersonProfile } from './types';

export type { PeopleDataset } from './types';

export type PersonProfileEntry = Pick<
  CollectionEntry<'peopleProfiles'>,
  'id' | 'data' | 'body'
>;
let cache: Promise<PeopleDataset> | undefined;

const personRegistry = (
  entries: readonly PersonProfileEntry[],
): PeopleMentionRegistry => {
  const registry = new Map(
    entries.map((entry) => [entry.id, mapRawPersonMentionTarget(entry)]),
  );

  if (registry.size !== entries.length) {
    throw new Error('duplicate person profile slug in mention registry');
  }

  return registry;
};

const normalizePerson = (
  entry: PersonProfileEntry,
  registry: SiteMentionRegistry,
): PersonProfile => mapRawPersonProfile(entry, registry);

export const buildPeopleDataset = (
  entries: readonly PersonProfileEntry[],
  opts?: {
    readonly mentionRegistry?: SiteMentionRegistry;
  },
): PeopleDataset => {
  const mentionRegistry = personRegistry(entries);
  const siteMentionRegistry = opts?.mentionRegistry ?? mentionRegistry;
  const profiles = entries
    .map((entry) => normalizePerson(entry, siteMentionRegistry))
    .sort(
      (a, b) => compareRuText(a.name, b.name) || compareRuText(a.slug, b.slug),
    );

  return {
    profiles,
    bySlug: new Map(profiles.map((profile) => [profile.slug, profile])),
    mentionRegistry,
  };
};

export const loadPeopleData = (): Promise<PeopleDataset> => {
  cache ??= Promise.all([
    import('astro:content').then(
      ({ getCollection }) =>
        getCollection('peopleProfiles') as Promise<
          readonly PersonProfileEntry[]
        >,
    ),
    loadSiteMentionRegistry(),
  ]).then(([entries, mentionRegistry]) =>
    buildPeopleDataset(entries, { mentionRegistry }),
  );

  return cache;
};

export const loadPeopleMentionRegistry =
  async (): Promise<PeopleMentionRegistry> =>
    (await loadPeopleData()).mentionRegistry;
