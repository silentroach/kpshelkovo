import { calculateDistance } from '@shelkovo/geo';
import {
  ANIMALS_MARKER,
  APPLE_MARKER,
  CONSTRUCTION_MARKER,
  FISH_MARKER,
  FOODTRUCK_MARKER,
  KPP_MARKER,
  TITANIC_MARKER
} from '@shelkovo/ui/markers';
import type { MarkdownInstance } from 'astro';

import { parsePlaceGeometryFiles } from '@/lib/places/geometry';
import { mapRawPlace } from '@/lib/places/mapper';
import { RawPlaceSchema } from '@/lib/places/raw-schema';
import type { Place } from '@/lib/places/types';

const sources = import.meta.glob<MarkdownInstance<Record<string, unknown>>>(
  ['@/data/places/*.md', '!@/data/places/AGENTS.md'],
  { eager: true }
);
const geometries = parsePlaceGeometryFiles(
  import.meta.glob<string>('@/data/places/*.geojson', {
    eager: true,
    query: '?raw',
    import: 'default'
  })
);

const places = Object.values(sources).map((source) => {
  const slug = source.file.split('/').at(-1)!.replace(/\.md$/, '');
  const data = RawPlaceSchema.parse(source.frontmatter);

  return mapRawPlace(
    { id: slug, data, body: source.rawContent() },
    {
      geometry: geometries.get(slug),
      contact: data.contact
        ? { id: data.contact, url: `https://kpshelkovo.online/sarafan/${data.contact}/` }
        : undefined
    }
  );
});

export const getDemoPlace = (slug: string): Place => {
  const place = places.find((candidate) => candidate.slug === slug);
  if (!place) throw new Error(`Unknown demo place: ${slug}`);
  return place;
};

export const nearbyPlaces = (place: Place): readonly Place[] =>
  places
    .filter((candidate) => candidate.showOnMap && candidate.slug !== place.slug)
    .map((candidate) => ({
      place: candidate,
      distance: calculateDistance(
        place.coordinates.lat,
        place.coordinates.lng,
        candidate.coordinates.lat,
        candidate.coordinates.lng
      )
    }))
    .filter((candidate) => candidate.distance <= 1)
    .sort((a, b) => a.distance - b.distance || a.place.slug.localeCompare(b.place.slug))
    .slice(0, 3)
    .map((candidate) => candidate.place);

export const markerImages = {
  apple: APPLE_MARKER,
  animals: ANIMALS_MARKER,
  construction: CONSTRUCTION_MARKER,
  fish: FISH_MARKER,
  foodtruck: FOODTRUCK_MARKER,
  kpp: KPP_MARKER,
  titanic: TITANIC_MARKER
};
