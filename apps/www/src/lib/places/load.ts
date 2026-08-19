import { loadContact } from '@/lib/contacts/load';

import { placeCanonical, placeMarkdownUrl, placeUrl } from './routes';
import type { Place, PlaceSourceContact } from './types';

const PLACE_CONTACTS = [{ category: 'food', slug: 'burzhuyka' }] as const;

let cache: Promise<readonly Place[]> | undefined;

export const createPlaceFromContact = (contact: PlaceSourceContact): Place => {
  const location = contact.location;

  if (!contact.hasDetailPage || !contact.url) {
    throw new Error(
      `place source contact "${contact.slug}" needs a detail page`,
    );
  }

  if (!contact.summary) {
    throw new Error(`place source contact "${contact.slug}" needs a summary`);
  }

  if (!location?.address || !location.coordinates) {
    throw new Error(
      `place source contact "${contact.slug}" needs an address and coordinates`,
    );
  }

  return {
    slug: contact.slug,
    name: contact.title,
    summary: contact.summary,
    address: location.address,
    coordinates: location.coordinates,
    mapUrl: location.url,
    contactUrl: contact.url,
    updatedIso: contact.updatedIso,
    url: placeUrl(contact.slug),
    markdownUrl: placeMarkdownUrl(contact.slug),
    canonical: placeCanonical(contact.slug),
  };
};

const buildPlaces = async (): Promise<readonly Place[]> =>
  Promise.all(
    PLACE_CONTACTS.map(async ({ category, slug }) => {
      const contact = await loadContact(category, slug);

      if (!contact) {
        throw new Error(`place source contact "${category}/${slug}" not found`);
      }

      return createPlaceFromContact(contact);
    }),
  );

export const loadPlaces = (): Promise<readonly Place[]> => {
  cache ??= buildPlaces();

  return cache;
};

export const loadPlace = async (slug: string): Promise<Place | undefined> =>
  (await loadPlaces()).find((place) => place.slug === slug.trim());
