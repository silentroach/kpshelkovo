import type { APIRoute, GetStaticPaths } from 'astro';

import { loadPlace, loadPlaces } from '@/lib/places/load';
import {
  buildPlaceMarkdown,
  PLACES_MARKDOWN_HEADERS,
} from '@/lib/places/markdown';

export const prerender = true;

export const getStaticPaths = (async () => {
  const places = await loadPlaces();

  return places.map((place) => ({ params: { slug: place.slug } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;

  if (!slug) {
    throw new Error('place slug is required');
  }

  const place = await loadPlace(slug);

  if (!place) {
    throw new Error(`place "${slug}" not found`);
  }

  return new Response(buildPlaceMarkdown(place), {
    headers: PLACES_MARKDOWN_HEADERS,
  });
};
