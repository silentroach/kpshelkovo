import { canon, withBase } from '@/lib/site';

const PLACES_ROOT = '/places/';
const PLACES_MARKDOWN = '/places/index.md';
const PLACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const requireSlug = (slug: string): string => {
  const value = slug.trim();

  if (!PLACE_SLUG.test(value)) {
    throw new Error(`place slug "${slug}" is invalid`);
  }

  return value;
};

export const placesPath = (): string => PLACES_ROOT;

export const placesMarkdownPath = (): string => PLACES_MARKDOWN;

export const placePath = (slug: string): string =>
  `${PLACES_ROOT}${requireSlug(slug)}/`;

export const placeMarkdownPath = (slug: string): string =>
  `${placePath(slug)}index.md`;

export const placePattern = (): string => '/places/:slug/';

export const placeMarkdownPattern = (): string => '/places/:slug/index.md';

export const placesUrl = (): string => withBase(placesPath());

export const placesMarkdownUrl = (): string => withBase(placesMarkdownPath());

export const placeUrl = (slug: string): string => withBase(placePath(slug));

export const placeMarkdownUrl = (slug: string): string =>
  withBase(placeMarkdownPath(slug));

export const placeCanonical = (slug: string): string => canon(placePath(slug));
