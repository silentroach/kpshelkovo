import { getCollection } from 'astro:content';

import { createPersonMentionTarget } from '@/lib/people/mentions';
import { createPlaceMentionTarget } from '@/lib/places/mentions';

import { createSiteMentionRegistry } from './normalize';
import type {
  SiteMentionPersonEntry,
  SiteMentionPlaceEntry,
} from './registry.types';
import type { SiteMentionRegistry } from './types';

let cache: Promise<SiteMentionRegistry> | undefined;

export const buildSiteMentionRegistry = (
  people: readonly SiteMentionPersonEntry[],
  places: readonly SiteMentionPlaceEntry[],
): SiteMentionRegistry =>
  createSiteMentionRegistry([
    ...people.map((entry) =>
      createPersonMentionTarget(
        entry.id,
        entry.data.name,
        entry.data.name_cases,
        entry.data.company,
        entry.data.position,
      ),
    ),
    ...places.map((entry) =>
      createPlaceMentionTarget(
        entry.id,
        entry.data.title,
        entry.data.name_cases,
      ),
    ),
  ]);

export const loadSiteMentionRegistry = (): Promise<SiteMentionRegistry> => {
  cache ??= Promise.all([
    getCollection('peopleProfiles'),
    getCollection('places'),
  ]).then(([people, places]) => buildSiteMentionRegistry(people, places));

  return cache;
};
