import type { CollectionEntry } from 'astro:content';

export type SiteMentionPersonEntry = Pick<
  CollectionEntry<'peopleProfiles'>,
  'id' | 'data'
>;

export type SiteMentionPlaceEntry = Pick<
  CollectionEntry<'places'>,
  'id' | 'data'
>;
