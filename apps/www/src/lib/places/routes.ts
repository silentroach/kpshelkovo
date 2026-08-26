import { canon, withBase } from '@/lib/site';

import { PLACE_SLUG } from './schema';

const MAP_ROOT = '/map/';
const MAP_MARKDOWN = '/map/index.md';
const MAP_DATA = '/map/data/places.json';

const requireSlug = (slug: string): string => {
  const value = slug.trim();

  if (!PLACE_SLUG.test(value)) {
    throw new Error(`place slug "${slug}" is invalid`);
  }

  return value;
};

export const placesPath = (): string => MAP_ROOT;

export const placesMarkdownPath = (): string => MAP_MARKDOWN;

export const placesDataPath = (): string => MAP_DATA;

export const placePath = (slug: string): string =>
  `${MAP_ROOT}${requireSlug(slug)}/`;

export const placeMarkdownPath = (slug: string): string =>
  `${placePath(slug)}index.md`;

export const placePattern = (): string => '/map/:slug/';

export const placeMarkdownPattern = (): string => '/map/:slug/index.md';

export const placesUrl = (): string => withBase(placesPath());

export const placeHighlightUrl = (slug: string): string =>
  withBase(`${placesPath()}?h=${requireSlug(slug)}`);

export const placesMarkdownUrl = (): string => withBase(placesMarkdownPath());

export const placesDataUrl = (): string => withBase(placesDataPath());

export const placeUrl = (slug: string): string => withBase(placePath(slug));

export const placeMarkdownUrl = (slug: string): string =>
  withBase(placeMarkdownPath(slug));

export const placeCanonical = (slug: string): string => canon(placePath(slug));
