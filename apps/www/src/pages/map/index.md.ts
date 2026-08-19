import type { APIRoute } from 'astro';

import { loadPlaces } from '@/lib/places/load';
import {
  buildPlacesMarkdown,
  PLACES_MARKDOWN_HEADERS,
} from '@/lib/places/markdown';

export const prerender = true;

export const GET: APIRoute = async () =>
  new Response(buildPlacesMarkdown(await loadPlaces()), {
    headers: PLACES_MARKDOWN_HEADERS,
  });
