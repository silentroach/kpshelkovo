import type { APIRoute, GetStaticPaths } from 'astro';

import { createMarkdownResponse } from '@/lib/markdown/response';
import { loadPlaces, loadPlaceWithBacklinks } from '@/lib/places/load';
import { buildPlaceMarkdown } from '@/lib/places/markdown';

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

  const place = await loadPlaceWithBacklinks(slug);

  if (!place) {
    throw new Error(`place "${slug}" not found`);
  }

  return createMarkdownResponse(buildPlaceMarkdown(place));
};
