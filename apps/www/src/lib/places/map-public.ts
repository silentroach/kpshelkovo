import { toPublicEditorialGeometry } from '@/lib/geometry/editorial-public';

import type {
  PlaceMapPublicItemDto,
  PlaceMapPublicOpeningHoursDto,
  PlaceMapPublicPayloadDto
} from './map-public-dto';
import { selectMapPlaces } from './map-selection';
import type { Place, PlaceOpeningHours } from './types';

export const toPublicOpeningHours = (value: PlaceOpeningHours): PlaceMapPublicOpeningHoursDto => ({
  description: value.description,
  periods: value.periods.map((period) => ({
    days: period.days,
    opens_at: period.opensAt,
    closes_at: period.closesAt
  }))
});

const toPublicPlace = (place: Place): PlaceMapPublicItemDto => ({
  slug: place.slug,
  name: place.name,
  marker: place.marker,
  status: place.status,
  coordinates: {
    lat: place.coordinates.lat,
    lng: place.coordinates.lng
  },
  geometry: place.geometry ? toPublicEditorialGeometry(place.geometry) : undefined,
  opening_hours: place.openingHours ? toPublicOpeningHours(place.openingHours) : undefined,
  html_url: place.canonical
});

export const buildPlaceMapPublicPayload = (places: readonly Place[]): PlaceMapPublicPayloadDto => ({
  places: selectMapPlaces(places).map(toPublicPlace)
});
