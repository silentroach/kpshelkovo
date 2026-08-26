import type { APIRoute } from 'astro';

import { loadPlaces } from '@/lib/places/load';
import type { PlaceMapPayload } from '@/lib/places/map-types';

export const prerender = true;

export const GET: APIRoute = async () => {
  const places = await loadPlaces();
  const body: PlaceMapPayload = {
    places: places.map((place) => ({
      slug: place.slug,
      name: place.name,
      marker: place.marker,
      status: place.status,
      coordinates: place.coordinates,
      geometry: place.geometry,
      openingHours: place.openingHours,
      url: place.url,
    })),
  };

  return new Response(`${JSON.stringify(body)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
};
