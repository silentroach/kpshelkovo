import { absoluteUrl } from '@/lib/site';

import { toPublicOpeningHours } from './map-public';
import type { PlaceMarkdownPublicDto } from './markdown-public-dto';
import { PLACE_TIME_ZONE } from './opening-hours';
import { placesMarkdownUrl } from './routes';
import type { Place } from './types';

export const toPlaceMarkdownPublic = (place: Place): PlaceMarkdownPublicDto => {
  const openingHours = place.openingHours ? toPublicOpeningHours(place.openingHours) : undefined;

  return {
    title: place.name,
    category: place.category,
    status: place.status,
    address: place.address,
    coordinates: {
      lat: place.coordinates.lat,
      lng: place.coordinates.lng
    },
    html_url: place.canonical,
    map_url: absoluteUrl(place.mapUrl),
    contact_url: place.contact ? absoluteUrl(place.contact.url) : undefined,
    index_url: absoluteUrl(placesMarkdownUrl()),
    opening_hours: openingHours
      ? {
          timezone: PLACE_TIME_ZONE,
          periods: openingHours.periods,
          description: openingHours.description
        }
      : undefined
  };
};
